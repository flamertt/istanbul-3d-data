package main

import (
	"fmt"
	"math"
	"net/url"
	"path/filepath"
	"sort"
	"strconv"
)

const (
	sodaBase = "https://data.sfgov.org/resource"
	sfLatMin = 37.70
	sfLatMax = 37.82
	sfLngMin = -122.52
	sfLngMax = -122.35
)

type meterRecord struct {
	PostID               string `json:"post_id"`
	StreetName           string `json:"street_name"`
	StreetNum            string `json:"street_num"`
	Latitude             string `json:"latitude"`
	Longitude            string `json:"longitude"`
	AnalysisNeighborhood string `json:"analysis_neighborhood"`
}

type blockInfo struct {
	ID      string  `json:"id"`
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
	Meters  int     `json:"meters"`
	Street  string  `json:"street"`
	Hood    string  `json:"hood"`
}

func deriveStreetBlock(streetName, streetNum string) string {
	num, err := strconv.Atoi(streetNum)
	if err != nil {
		return ""
	}
	hundreds := int(math.Floor(float64(num)/100) * 100)
	return fmt.Sprintf("%s %d", streetName, hundreds)
}

func runFetchMeters(_ []string) error {
	params := url.Values{
		"$limit": {"50000"},
		"$where": {"active_meter_flag='M'"},
		"$select": {"post_id,street_name,street_num,latitude,longitude,analysis_neighborhood"},
	}
	apiURL := fmt.Sprintf("%s/8vzz-qzz9.json?%s", sodaBase, params.Encode())

	fmt.Println("Fetching meters from SODA API...")
	var records []meterRecord
	if err := getJSON(apiURL, &records); err != nil {
		return err
	}
	fmt.Printf("  Received %d active meter records\n", len(records))

	type blockAccum struct {
		lats   []float64
		lngs   []float64
		count  int
		street string
		hood   string
	}
	blocks := make(map[string]*blockAccum)
	skipped := 0

	for _, m := range records {
		if m.StreetName == "" || m.StreetNum == "" || m.Latitude == "" || m.Longitude == "" {
			skipped++
			continue
		}
		blockID := deriveStreetBlock(m.StreetName, m.StreetNum)
		if blockID == "" {
			skipped++
			continue
		}
		lat, err1 := strconv.ParseFloat(m.Latitude, 64)
		lng, err2 := strconv.ParseFloat(m.Longitude, 64)
		if err1 != nil || err2 != nil {
			skipped++
			continue
		}
		if lat < sfLatMin || lat > sfLatMax || lng < sfLngMin || lng > sfLngMax {
			skipped++
			continue
		}
		b, ok := blocks[blockID]
		if !ok {
			b = &blockAccum{}
			blocks[blockID] = b
		}
		b.lats = append(b.lats, lat)
		b.lngs = append(b.lngs, lng)
		b.count++
		b.street = m.StreetName
		if m.AnalysisNeighborhood != "" {
			b.hood = m.AnalysisNeighborhood
		}
	}

	if skipped > 0 {
		fmt.Printf("  Skipped %d meters (missing data or out of SF bbox)\n", skipped)
	}

	result := make([]blockInfo, 0, len(blocks))
	for id, b := range blocks {
		var latSum, lngSum float64
		for _, v := range b.lats {
			latSum += v
		}
		for _, v := range b.lngs {
			lngSum += v
		}
		n := float64(len(b.lats))
		result = append(result, blockInfo{
			ID:     id,
			Lat:    math.Round(latSum/n*1e6) / 1e6,
			Lng:    math.Round(lngSum/n*1e6) / 1e6,
			Meters: b.count,
			Street: b.street,
			Hood:   b.hood,
		})
	}
	sort.Slice(result, func(i, j int) bool { return result[i].ID < result[j].ID })

	fmt.Printf("\nProcessed %d unique blocks\n", len(result))

	outPath := filepath.Join(dataDir(), "meter_locations.json")
	if err := writeJSON(outPath, result); err != nil {
		return err
	}
	fmt.Printf("Wrote %s (%.0f KB, %d blocks)\n", outPath, float64(fileSize(outPath))/1024, len(result))
	return nil
}
