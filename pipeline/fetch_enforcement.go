package main

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

var dayCodeToISO = map[string]int{
	"Mo": 0, "Tu": 1, "We": 2, "Th": 3, "Fr": 4, "Sa": 5, "Su": 6,
}

var defaultSchedule = func() []int {
	s := make([]int, 168)
	for dow := 0; dow < 6; dow++ {
		for hour := 9; hour < 18; hour++ {
			s[dow*24+hour] = 1
		}
	}
	return s
}()

type scheduleRow struct {
	StreetAndBlock string `json:"street_and_block"`
	DaysApplied    string `json:"days_applied"`
	FromTime       string `json:"from_time"`
	ToTime         string `json:"to_time"`
}

func parseTime12(t string) (int, bool) {
	t = strings.TrimSpace(strings.ToUpper(t))
	parts := strings.Fields(strings.ReplaceAll(t, ":", " "))
	if len(parts) < 3 {
		return 0, false
	}
	hour, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, false
	}
	ampm := parts[2]
	if ampm == "AM" {
		if hour == 12 {
			hour = 0
		}
	} else {
		if hour != 12 {
			hour += 12
		}
	}
	return hour, true
}

func parseDays(daysStr string) []int {
	var result []int
	for _, code := range strings.Split(daysStr, ",") {
		code = strings.TrimSpace(code)
		if iso, ok := dayCodeToISO[code]; ok {
			result = append(result, iso)
		}
	}
	return result
}

func runFetchEnforcement(_ []string) error {
	dataPath := dataDir()
	meterPath := filepath.Join(dataPath, "meter_locations.json")
	outPath := filepath.Join(dataPath, "enforcement_schedules.json")

	knownBlocks := map[string]bool{}
	if data, err := os.ReadFile(meterPath); err == nil {
		var blocks []blockInfo
		if json.Unmarshal(data, &blocks) == nil {
			for _, b := range blocks {
				knownBlocks[b.ID] = true
			}
			fmt.Printf("Loaded %d known blocks from meter_locations.json\n", len(knownBlocks))
		}
	}

	fmt.Println("\nFetching enforcement schedules...")
	allRows := []scheduleRow{}
	pageSize := 50000
	offset := 0

	for {
		params := url.Values{
			"$select": {"street_and_block,days_applied,from_time,to_time"},
			"$where":  {"schedule_type='Operating Schedule'"},
			"$limit":  {strconv.Itoa(pageSize)},
			"$offset": {strconv.Itoa(offset)},
		}
		apiURL := fmt.Sprintf("%s/6cqg-dxku.json?%s", sodaBase, params.Encode())

		start := time.Now()
		var rows []scheduleRow
		if err := getJSON(apiURL, &rows); err != nil {
			return err
		}
		fmt.Printf("  Page %d: %d rows (%.1fs)\n", offset/pageSize+1, len(rows), time.Since(start).Seconds())
		allRows = append(allRows, rows...)
		if len(rows) < pageSize {
			break
		}
		offset += pageSize
	}
	fmt.Printf("  Total: %d rows\n", len(allRows))

	blockMasks := map[string][]int{}
	parsed, skipped := 0, 0
	for _, row := range allRows {
		if row.StreetAndBlock == "" || row.DaysApplied == "" || row.FromTime == "" || row.ToTime == "" {
			skipped++
			continue
		}
		days := parseDays(row.DaysApplied)
		fromHour, ok1 := parseTime12(row.FromTime)
		toHour, ok2 := parseTime12(row.ToTime)
		if !ok1 || !ok2 || len(days) == 0 {
			skipped++
			continue
		}
		parsed++
		blockID := strings.TrimSpace(row.StreetAndBlock)
		if _, exists := blockMasks[blockID]; !exists {
			mask := make([]int, 168)
			blockMasks[blockID] = mask
		}
		mask := blockMasks[blockID]
		for _, dow := range days {
			for hour := fromHour; hour < toHour; hour++ {
				if hour >= 0 && hour < 24 {
					mask[dow*24+hour] = 1
				}
			}
		}
	}
	fmt.Printf("  Parsed %d records, skipped %d\n", parsed, skipped)
	fmt.Printf("  Found schedules for %d blocks\n", len(blockMasks))

	defaultsApplied := 0
	for blockID := range knownBlocks {
		if _, exists := blockMasks[blockID]; !exists {
			cp := make([]int, 168)
			copy(cp, defaultSchedule)
			blockMasks[blockID] = cp
			defaultsApplied++
		}
	}
	fmt.Printf("  Applied default schedule to %d blocks\n", defaultsApplied)

	if err := writeJSON(outPath, blockMasks); err != nil {
		return err
	}
	fmt.Printf("\nWrote %s (%.0f KB, %d blocks)\n", outPath, float64(fileSize(outPath))/1024, len(blockMasks))
	return nil
}
