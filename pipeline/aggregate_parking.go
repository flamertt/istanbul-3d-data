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
	avgSessionHours  = 1.2
	complianceFactor = 1.33
)

type sessionRow struct {
	StreetBlock string `json:"street_block"`
	Dow         string `json:"dow"`
	Hour        string `json:"hour"`
	Sessions    string `json:"sessions"`
}

type parkingBlock struct {
	ID       string      `json:"id"`
	Lng      float64     `json:"lng"`
	Lat      float64     `json:"lat"`
	Meters   int         `json:"meters"`
	Street   string      `json:"street"`
	Hood     string      `json:"hood"`
	Slots    []float64   `json:"slots"`
	Enforced []int       `json:"enforced,omitempty"`
	Supply   *int        `json:"supply,omitempty"`
	Path     interface{} `json:"path,omitempty"`
	MeterPositions interface{} `json:"meterPositions,omitempty"`
}

func loadJSONFile(path string, target any) bool {
	data, err := os.ReadFile(path)
	if err != nil {
		return false
	}
	return json.Unmarshal(data, target) == nil
}

func runAggregate(rawArgs []string) error {
	fs := flag.NewFlagSet("aggregate", flag.ContinueOnError)
	days := fs.Int("days", 90, "lookback window in days")
	if err := fs.Parse(rawArgs); err != nil {
		return err
	}

	dataPath := dataDir()
	meterPath := filepath.Join(dataPath, "meter_locations.json")

	if _, err := os.Stat(meterPath); err != nil {
		return fmt.Errorf("meter_locations.json not found: run fetch-meters first")
	}

	var meterBlocks []blockInfo
	if !loadJSONFile(meterPath, &meterBlocks) {
		return fmt.Errorf("failed to parse meter_locations.json")
	}
	meterLookup := make(map[string]blockInfo, len(meterBlocks))
	for _, b := range meterBlocks {
		meterLookup[b.ID] = b
	}
	fmt.Printf("Loaded %d blocks from %s\n", len(meterLookup), meterPath)

	enforcement := map[string][]int{}
	if loadJSONFile(filepath.Join(dataPath, "enforcement_schedules.json"), &enforcement) {
		fmt.Printf("Loaded enforcement schedules for %d blocks\n", len(enforcement))
	}

	pressure := map[string][]float64{}
	if loadJSONFile(filepath.Join(dataPath, "pressure_311.json"), &pressure) {
		fmt.Printf("Loaded 311 pressure data for %d blocks\n", len(pressure))
	}

	supply := map[string]int{}
	if loadJSONFile(filepath.Join(dataPath, "parking_supply.json"), &supply) {
		fmt.Printf("Loaded parking supply for %d blocks\n", len(supply))
	}

	type rawBlockPath struct {
		Path   [][2]float64 `json:"path"`
		Meters [][2]float64 `json:"meters"`
	}
	blockPaths := map[string]*rawBlockPath{}
	if data, err := os.ReadFile(filepath.Join(dataPath, "block_paths.json")); err == nil {
		var raw map[string]*rawBlockPath
		if json.Unmarshal(data, &raw) == nil {
			blockPaths = raw
			fmt.Printf("Loaded block paths for %d blocks\n", len(blockPaths))
		}
	}

	now := time.Now().UTC()
	since := now.AddDate(0, 0, -*days)
	sinceDate := since.Format("2006-01-02T00:00:00")
	weeks := float64(*days) / 7.0

	fmt.Printf("Querying %d days of data (since %s, ~%.1f weeks)\n", *days, sinceDate[:10], weeks)

	selectQ := "street_block,date_extract_dow(session_start_dt) AS dow,date_extract_hh(session_start_dt) AS hour,count(*) AS sessions"
	where := fmt.Sprintf("session_start_dt>'%s'", sinceDate)

	fmt.Println("\nFetching aggregated sessions (bulk GROUP BY)...")
	allRows := []sessionRow{}
	pageSize := 50000
	offset := 0
	start := time.Now()

	for {
		params := url.Values{
			"$select": {selectQ},
			"$where":  {where},
			"$group":  {"street_block,dow,hour"},
			"$order":  {"street_block,dow,hour"},
			"$limit":  {strconv.Itoa(pageSize)},
			"$offset": {strconv.Itoa(offset)},
		}
		apiURL := fmt.Sprintf("%s/imvp-dq3v.json?%s", sodaBase, params.Encode())
		var rows []sessionRow
		t := time.Now()
		if err := getJSON(apiURL, &rows); err != nil {
			return err
		}
		fmt.Printf("  Page %d: %d rows (%.1fs)\n", offset/pageSize+1, len(rows), time.Since(t).Seconds())
		allRows = append(allRows, rows...)
		if len(rows) < pageSize {
			break
		}
		offset += pageSize
	}
	fmt.Printf("  Total: %d aggregated rows in %.1fs\n", len(allRows), time.Since(start).Seconds())

	fmt.Println("\nBuilding weekly profiles...")
	type slotKey = int
	blockSessions := map[string]map[slotKey]int{}
	for _, row := range allRows {
		sodaDow, err1 := strconv.Atoi(row.Dow)
		hour, err2 := strconv.Atoi(row.Hour)
		sessions, err3 := strconv.Atoi(row.Sessions)
		if err1 != nil || err2 != nil || err3 != nil {
			continue
		}
		isoDow, ok := sodaDowToISO[sodaDow]
		if !ok || hour < 0 || hour > 23 {
			continue
		}
		blockID := row.StreetBlock
		if blockID == "" {
			continue
		}
		if blockSessions[blockID] == nil {
			blockSessions[blockID] = map[slotKey]int{}
		}
		idx := isoDow*24 + hour
		blockSessions[blockID][idx] += sessions
	}

	computeOccupancy := func(count, meters int) float64 {
		if meters <= 0 || weeks <= 0 {
			return 0
		}
		perWeek := float64(count) / weeks
		raw := (perWeek * avgSessionHours * complianceFactor) / float64(meters)
		return math.Min(1.0, math.Round(raw*1000)/1000)
	}

	profiles := map[string][]float64{}
	matched, unmatched := 0, 0
	for blockID, slots := range blockSessions {
		meterInfo, ok := meterLookup[blockID]
		if !ok {
			unmatched++
			continue
		}
		matched++
		s := make([]float64, 168)
		for idx, count := range slots {
			s[idx] = computeOccupancy(count, meterInfo.Meters)
		}
		profiles[blockID] = s
	}
	fmt.Printf("  Matched %d blocks, %d unmatched transaction blocks\n", matched, unmatched)

	// Build output
	results := make([]parkingBlock, 0, len(meterLookup))
	pressureBlended := 0
	for blockID, meterInfo := range meterLookup {
		meterSlots := profiles[blockID]
		if meterSlots == nil {
			meterSlots = make([]float64, 168)
		}
		enforcedMask := enforcement[blockID]
		pressureSlots := pressure[blockID]

		var finalSlots []float64
		if enforcedMask != nil && pressureSlots != nil {
			finalSlots = make([]float64, 168)
			for i := range finalSlots {
				if enforcedMask[i] == 1 {
					finalSlots[i] = meterSlots[i]
				} else {
					finalSlots[i] = pressureSlots[i]
				}
			}
			pressureBlended++
		} else {
			finalSlots = meterSlots
		}

		block := parkingBlock{
			ID:     blockID,
			Lng:    meterInfo.Lng,
			Lat:    meterInfo.Lat,
			Meters: meterInfo.Meters,
			Street: meterInfo.Street,
			Hood:   meterInfo.Hood,
			Slots:  finalSlots,
		}
		if enforcedMask != nil {
			block.Enforced = enforcedMask
		}
		if s, ok := supply[blockID]; ok {
			block.Supply = &s
		}
		if bp, ok := blockPaths[blockID]; ok && bp != nil {
			block.Path = bp.Path
			block.MeterPositions = bp.Meters
		}
		results = append(results, block)
	}

	if pressureBlended > 0 {
		fmt.Printf("  Blended pressure data into %d blocks\n", pressureBlended)
	}

	sort.Slice(results, func(i, j int) bool { return results[i].ID < results[j].ID })

	fmt.Printf("Total time: %.0fs\n", time.Since(start).Seconds())

	// Validate
	var allOcc []float64
	for _, b := range results {
		for _, s := range b.Slots {
			if s > 0 {
				allOcc = append(allOcc, s)
			}
		}
	}
	if len(allOcc) > 0 {
		var sum, mx float64
		for _, v := range allOcc {
			sum += v
			if v > mx {
				mx = v
			}
		}
		nonzeroPct := float64(len(allOcc)) / float64(len(results)*168) * 100
		fmt.Printf("\nValidation:\n")
		fmt.Printf("  Blocks with data: %d\n", len(results))
		fmt.Printf("  Non-zero slots: %d (%.1f%%)\n", len(allOcc), nonzeroPct)
		fmt.Printf("  Avg occupancy (non-zero): %.2f\n", sum/float64(len(allOcc)))
		fmt.Printf("  Max occupancy: %.2f\n", mx)
	}

	output := map[string]any{
		"generated": now.Format(time.RFC3339),
		"dateRange": map[string]string{
			"from": sinceDate[:10],
			"to":   now.Format("2006-01-02"),
		},
		"blocks": results,
	}

	outPath := filepath.Join(dataPath, "parking_week.json")
	if err := writeJSON(outPath, output); err != nil {
		return err
	}
	fmt.Printf("\nWrote %s (%.1f MB, %d blocks)\n", outPath, float64(fileSize(outPath))/(1024*1024), len(results))
	return nil
}
