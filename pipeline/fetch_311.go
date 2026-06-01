package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"math"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"time"
)

const (
	maxDistLat = 0.0009
	maxDistLng = 0.0012
)

var sodaDowToISO = map[int]int{1: 6, 2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5}

var subtypeWeights = map[string]float64{
	"double_parking":    3.0,
	"blocking_driveway": 2.0,
	"parking_on_sidewalk": 2.0,
}

type complaint311 struct {
	Lat            string `json:"lat"`
	Long           string `json:"long"`
	ServiceSubtype string `json:"service_subtype"`
	Dow            string `json:"dow"`
	Hour           string `json:"hour"`
}

type blockCentroid struct {
	ID  string
	Lat float64
	Lng float64
}

func loadBlockCentroids(path string) ([]blockCentroid, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var blocks []blockInfo
	if err := json.Unmarshal(data, &blocks); err != nil {
		return nil, err
	}
	result := make([]blockCentroid, len(blocks))
	for i, b := range blocks {
		result[i] = blockCentroid{ID: b.ID, Lat: b.Lat, Lng: b.Lng}
	}
	return result, nil
}

func getSubtypeWeight(subtype string) float64 {
	if subtype == "" {
		return 1.0
	}
	lower := subtype
	for k, w := range subtypeWeights {
		if contains(lower, k) {
			return w
		}
	}
	return 1.0
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(s) > 0 && containsStr(s, sub))
}

func containsStr(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

func runFetch311(rawArgs []string) error {
	fs := flag.NewFlagSet("fetch-311", flag.ContinueOnError)
	days := fs.Int("days", 90, "lookback window in days")
	if err := fs.Parse(rawArgs); err != nil {
		return err
	}

	dataPath := dataDir()
	meterPath := filepath.Join(dataPath, "meter_locations.json")
	outPath := filepath.Join(dataPath, "pressure_311.json")

	centroids, err := loadBlockCentroids(meterPath)
	if err != nil {
		return fmt.Errorf("meter_locations.json not found: run fetch-meters first")
	}
	fmt.Printf("Loaded %d block centroids\n", len(centroids))

	now := time.Now().UTC()
	since := now.AddDate(0, 0, -*days)
	sinceDate := since.Format("2006-01-02T00:00:00")
	weeks := float64(*days) / 7.0

	where := fmt.Sprintf("service_name='Parking Enforcement' AND requested_datetime>'%s' AND lat IS NOT NULL", sinceDate)

	fmt.Printf("\nFetching 311 parking complaints (%d days)...\n", *days)
	allComplaints := []complaint311{}
	pageSize := 50000
	offset := 0
	start := time.Now()

	for {
		params := url.Values{
			"$select": {"lat,long,service_subtype,date_extract_dow(requested_datetime) as dow,date_extract_hh(requested_datetime) as hour"},
			"$where":  {where},
			"$limit":  {strconv.Itoa(pageSize)},
			"$offset": {strconv.Itoa(offset)},
		}
		apiURL := fmt.Sprintf("%s/vw6y-z8j6.json?%s", sodaBase, params.Encode())
		var rows []complaint311
		t := time.Now()
		if err := getJSON(apiURL, &rows); err != nil {
			return err
		}
		fmt.Printf("  Page %d: %d rows (%.1fs)\n", offset/pageSize+1, len(rows), time.Since(t).Seconds())
		allComplaints = append(allComplaints, rows...)
		if len(rows) < pageSize {
			break
		}
		offset += pageSize
	}
	fmt.Printf("  Total: %d complaints in %.1fs\n", len(allComplaints), time.Since(start).Seconds())

	fmt.Println("\nSpatial join to block centroids...")
	type entry struct{ dow, hour int; weight float64 }
	blockEntries := map[string][]entry{}
	matched, unmatched := 0, 0

	for _, comp := range allComplaints {
		clat, err1 := strconv.ParseFloat(comp.Lat, 64)
		clng, err2 := strconv.ParseFloat(comp.Long, 64)
		dow, err3 := strconv.Atoi(comp.Dow)
		hour, err4 := strconv.Atoi(comp.Hour)
		if err1 != nil || err2 != nil || err3 != nil || err4 != nil {
			unmatched++
			continue
		}
		isoDow, ok := sodaDowToISO[dow]
		if !ok || hour < 0 || hour > 23 {
			unmatched++
			continue
		}
		weight := getSubtypeWeight(comp.ServiceSubtype)
		bestBlock := ""
		bestDist := math.MaxFloat64
		for _, c := range centroids {
			dlat := math.Abs(clat - c.Lat)
			if dlat > maxDistLat {
				continue
			}
			dlng := math.Abs(clng - c.Lng)
			if dlng > maxDistLng {
				continue
			}
			dist := math.Sqrt(dlat*dlat + dlng*dlng)
			if dist < bestDist {
				bestDist = dist
				bestBlock = c.ID
			}
		}
		if bestBlock != "" {
			matched++
			blockEntries[bestBlock] = append(blockEntries[bestBlock], entry{isoDow, hour, weight})
		} else {
			unmatched++
		}
	}
	fmt.Printf("  Matched %d complaints, %d unmatched\n", matched, unmatched)

	// Raw counts per week
	rawCounts := map[string][]float64{}
	for blockID, entries := range blockEntries {
		counts := make([]float64, 168)
		for _, e := range entries {
			counts[e.dow*24+e.hour] += e.weight
		}
		for i := range counts {
			counts[i] /= weeks
		}
		rawCounts[blockID] = counts
	}

	// Interpolate Saturday
	for _, counts := range rawCounts {
		for hour := 0; hour < 24; hour++ {
			satIdx := 5*24 + hour
			if counts[satIdx] == 0 {
				counts[satIdx] = (counts[4*24+hour] + counts[6*24+hour]) / 2
			}
		}
	}

	// Collect non-zero for percentiles
	allNonZero := []float64{}
	for _, counts := range rawCounts {
		for _, v := range counts {
			if v > 0 {
				allNonZero = append(allNonZero, v)
			}
		}
	}
	if len(allNonZero) == 0 {
		fmt.Println("  Warning: No non-zero pressure values found")
		return writeJSON(outPath, map[string][]float64{})
	}

	sort.Float64s(allNonZero)
	n := len(allNonZero)
	p50 := allNonZero[int(float64(n)*0.50)]
	p75 := allNonZero[int(float64(n)*0.75)]
	p90 := allNonZero[min(int(float64(n)*0.90), n-1)]
	fmt.Printf("  Percentiles: p50=%.3f, p75=%.3f, p90=%.3f\n", p50, p75, p90)

	percentileScore := func(v float64) float64 {
		if v <= 0 {
			return 0
		}
		if v < p50 {
			return 0.1 + 0.2*(v/p50)
		}
		if v < p75 {
			if p75 > p50 {
				return 0.3 + 0.3*((v-p50)/(p75-p50))
			}
			return 0.3
		}
		if v < p90 {
			if p90 > p75 {
				return 0.6 + 0.2*((v-p75)/(p90-p75))
			}
			return 0.6
		}
		return math.Min(1.0, 0.8+0.2*((v-p90)/(p90*0.5+0.001)))
	}

	// Global average
	globalCounts := make([]float64, 168)
	globalBlocks := make([]int, 168)
	for _, counts := range rawCounts {
		for i, v := range counts {
			if v > 0 {
				globalCounts[i] += v
				globalBlocks[i]++
			}
		}
	}
	globalAvg := make([]float64, 168)
	for i := range globalCounts {
		if globalBlocks[i] > 0 {
			globalAvg[i] = globalCounts[i] / float64(globalBlocks[i])
		}
	}

	pressure := map[string][]float64{}
	for blockID, counts := range rawCounts {
		nonZero := 0
		for _, v := range counts {
			if v > 0 {
				nonZero++
			}
		}
		scores := make([]float64, 168)
		if nonZero < 3 {
			for i, v := range globalAvg {
				scores[i] = math.Round(percentileScore(v)*1000) / 1000
			}
		} else {
			for i, v := range counts {
				scores[i] = math.Round(percentileScore(v)*1000) / 1000
			}
		}
		pressure[blockID] = scores
	}

	if err := writeJSON(outPath, pressure); err != nil {
		return err
	}
	fmt.Printf("\nWrote %s (%.0f KB, %d blocks)\n", outPath, float64(fileSize(outPath))/1024, len(pressure))
	return nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
