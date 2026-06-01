package main

import (
	"archive/zip"
	"bytes"
	"encoding/csv"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"math"
	"net/http"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"
)

const (
	gbfsStationURL = "https://gbfs.lyft.com/gbfs/2.3/bay/en/station_information.json"
	tripCSVBase    = "https://s3.amazonaws.com/baywheels-data"
	bikeSFLatMin   = 37.70
	bikeSFLatMax   = 37.82
	bikeSFLngMin   = -122.52
	bikeSFLngMax   = -122.35
)

type gbfsResponse struct {
	Data struct {
		Stations []gbfsStation `json:"stations"`
	} `json:"data"`
}

type gbfsStation struct {
	StationID string  `json:"station_id"`
	ShortName string  `json:"short_name"`
	Name      string  `json:"name"`
	Lat       float64 `json:"lat"`
	Lon       float64 `json:"lon"`
	Capacity  int     `json:"capacity"`
}

type bikeStation struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
	Capacity int     `json:"capacity"`
	Slots    []float64 `json:"slots"`
	Arrivals []float64 `json:"arrivals"`
}

func fetchGBFSStations() (map[string]bikeStation, map[string]string, error) {
	fmt.Println("Fetching GBFS station metadata...")
	req, _ := http.NewRequest("GET", gbfsStationURL, nil)
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()

	var gbfs gbfsResponse
	if err := json.NewDecoder(resp.Body).Decode(&gbfs); err != nil {
		return nil, nil, err
	}
	fmt.Printf("  Total Bay Area stations: %d\n", len(gbfs.Data.Stations))

	sfStations := map[string]bikeStation{}
	idToShort := map[string]string{}

	for _, s := range gbfs.Data.Stations {
		if s.Lat < bikeSFLatMin || s.Lat > bikeSFLatMax || s.Lon < bikeSFLngMin || s.Lon > bikeSFLngMax {
			continue
		}
		sid := s.ShortName
		if sid == "" {
			sid = s.StationID
		}
		sfStations[sid] = bikeStation{
			ID:       sid,
			Name:     s.Name,
			Lat:      math.Round(s.Lat*1e6) / 1e6,
			Lng:      math.Round(s.Lon*1e6) / 1e6,
			Capacity: s.Capacity,
		}
	}

	for _, s := range gbfs.Data.Stations {
		short := s.ShortName
		if _, ok := sfStations[short]; ok {
			idToShort[s.StationID] = short
			idToShort[short] = short
			if s.Name != "" {
				idToShort[s.Name] = short
			}
		}
	}

	fmt.Printf("  SF stations: %d\n", len(sfStations))
	return sfStations, idToShort, nil
}

func getCsvURLs(months int) []struct{ ym, url string } {
	now := time.Now().UTC()
	year, month := now.Year(), int(now.Month())

	// Start 2 months back
	for i := 0; i < 2; i++ {
		month--
		if month < 1 {
			month = 12
			year--
		}
	}

	var urls []struct{ ym, url string }
	for i := 0; i < months; i++ {
		ym := fmt.Sprintf("%04d%02d", year, month)
		u := fmt.Sprintf("%s/%s-baywheels-tripdata.csv.zip", tripCSVBase, ym)
		urls = append(urls, struct{ ym, url string }{ym, u})
		month--
		if month < 1 {
			month = 12
			year--
		}
	}

	// Reverse: oldest first
	for i, j := 0, len(urls)-1; i < j; i, j = i+1, j-1 {
		urls[i], urls[j] = urls[j], urls[i]
	}
	return urls
}

func processCSVZip(csvURL, ym string, idToShort map[string]string,
	departures, arrivals map[string][]int) (int, error) {

	fmt.Printf("  Downloading %s...\n", ym)
	start := time.Now()

	req, _ := http.NewRequest("GET", csvURL, nil)
	req.Header.Set("User-Agent", "turkey-heatmap/1.0")
	resp, err := httpClient.Do(req)
	if err != nil {
		fmt.Printf("    Failed to download %s: %v\n", ym, err)
		return 0, nil
	}
	defer resp.Body.Close()

	zipBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, err
	}
	fmt.Printf("    Downloaded %.1f MB in %.1fs\n", float64(len(zipBytes))/(1024*1024), time.Since(start).Seconds())

	zr, err := zip.NewReader(bytes.NewReader(zipBytes), int64(len(zipBytes)))
	if err != nil {
		return 0, err
	}

	tripCount, matched := 0, 0
	for _, f := range zr.File {
		if !strings.HasSuffix(f.Name, ".csv") {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			continue
		}
		reader := csv.NewReader(rc)
		headers, err := reader.Read()
		if err != nil {
			rc.Close()
			continue
		}

		colIdx := map[string]int{}
		for i, h := range headers {
			colIdx[h] = i
		}

		for {
			row, err := reader.Read()
			if err != nil {
				break
			}
			tripCount++

			startedAt := ""
			if i, ok := colIdx["started_at"]; ok && i < len(row) {
				startedAt = row[i]
			}
			if startedAt == "" {
				continue
			}

			var dt time.Time
			dt, err = time.Parse("2006-01-02 15:04:05", startedAt)
			if err != nil {
				dt, err = time.Parse(time.RFC3339, strings.Replace(startedAt, "Z", "+00:00", 1))
				if err != nil {
					continue
				}
			}

			dow := int(dt.Weekday()+6) % 7 // Monday=0
			hour := dt.Hour()
			slotIdx := dow*24 + hour

			if i, ok := colIdx["start_station_id"]; ok && i < len(row) {
				startID := row[i]
				startName := ""
				if j, ok2 := colIdx["start_station_name"]; ok2 && j < len(row) {
					startName = row[j]
				}
				short := idToShort[startID]
				if short == "" {
					short = idToShort[startName]
				}
				if short != "" {
					matched++
					if departures[short] == nil {
						departures[short] = make([]int, 168)
					}
					departures[short][slotIdx]++
				}
			}

			if i, ok := colIdx["end_station_id"]; ok && i < len(row) {
				endID := row[i]
				endName := ""
				if j, ok2 := colIdx["end_station_name"]; ok2 && j < len(row) {
					endName = row[j]
				}
				short := idToShort[endID]
				if short == "" {
					short = idToShort[endName]
				}
				if short != "" {
					if arrivals[short] == nil {
						arrivals[short] = make([]int, 168)
					}
					arrivals[short][slotIdx]++
				}
			}
		}
		rc.Close()
	}

	matchPct := 0.0
	if tripCount > 0 {
		matchPct = float64(matched) / float64(tripCount) * 100
	}
	fmt.Printf("    Processed %d trips, %d matched (%.0f%%) in %.1fs\n",
		tripCount, matched, matchPct, time.Since(start).Seconds())
	return tripCount, nil
}

func normalizeDemand(rawCounts []int, weeks float64) []float64 {
	perWeek := make([]float64, len(rawCounts))
	peak := 0.0
	for i, c := range rawCounts {
		perWeek[i] = float64(c) / weeks
		if perWeek[i] > peak {
			peak = perWeek[i]
		}
	}
	if peak <= 0 {
		return make([]float64, len(rawCounts))
	}
	result := make([]float64, len(rawCounts))
	for i, v := range perWeek {
		result[i] = math.Round(v/peak*1000) / 1000
	}
	return result
}

func runAggregateBikes(rawArgs []string) error {
	fs := flag.NewFlagSet("aggregate-bikes", flag.ContinueOnError)
	months := fs.Int("months", 3, "number of months of CSVs to download")
	if err := fs.Parse(rawArgs); err != nil {
		return err
	}

	sfStations, idToShort, err := fetchGBFSStations()
	if err != nil {
		return err
	}

	csvURLs := getCsvURLs(*months)
	fmt.Printf("\nDownloading %d months of trip data...\n", len(csvURLs))

	departures := map[string][]int{}
	arrivals := map[string][]int{}
	totalTrips := 0
	dateMin, dateMax := "", ""
	if len(csvURLs) > 0 {
		dateMin = csvURLs[0].ym
		dateMax = csvURLs[len(csvURLs)-1].ym
	}

	for _, entry := range csvURLs {
		count, err := processCSVZip(entry.url, entry.ym, idToShort, departures, arrivals)
		if err != nil {
			return err
		}
		totalTrips += count
	}

	fmt.Printf("\nTotal trips processed: %s\n", formatInt(totalTrips))
	fmt.Printf("Stations with departures: %d\n", len(departures))
	fmt.Printf("Stations with arrivals: %d\n", len(arrivals))

	weeks := float64(*months) * 4.33

	var results []bikeStation
	for sid, info := range sfStations {
		rawDeps := departures[sid]
		rawArrs := arrivals[sid]
		if rawDeps == nil {
			rawDeps = make([]int, 168)
		}
		if rawArrs == nil {
			rawArrs = make([]int, 168)
		}
		depDemand := normalizeDemand(rawDeps, weeks)
		arrDemand := normalizeDemand(rawArrs, weeks)

		maxDep, maxArr := 0.0, 0.0
		for _, v := range depDemand {
			if v > maxDep {
				maxDep = v
			}
		}
		for _, v := range arrDemand {
			if v > maxArr {
				maxArr = v
			}
		}
		if maxDep == 0 && maxArr == 0 {
			continue
		}

		s := info
		s.Slots = depDemand
		s.Arrivals = arrDemand
		results = append(results, s)
	}
	sort.Slice(results, func(i, j int) bool { return results[i].ID < results[j].ID })

	fromDate, toDate := "", ""
	if dateMin != "" {
		fromDate = dateMin[:4] + "-" + dateMin[4:] + "-01"
	}
	if dateMax != "" {
		toDate = dateMax[:4] + "-" + dateMax[4:] + "-28"
	}

	output := map[string]any{
		"generated": time.Now().UTC().Format(time.RFC3339),
		"dateRange": map[string]string{"from": fromDate, "to": toDate},
		"stations":  results,
	}

	outPath := filepath.Join(dataDir(), "bike_week.json")
	if err := writeJSON(outPath, output); err != nil {
		return err
	}
	fmt.Printf("\nWrote %s (%.0f KB, %d stations)\n", outPath, float64(fileSize(outPath))/1024, len(results))
	return nil
}

func formatInt(n int) string {
	s := strconv.Itoa(n)
	result := ""
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result += ","
		}
		result += string(c)
	}
	return result
}
