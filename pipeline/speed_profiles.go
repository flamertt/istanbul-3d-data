package main

import (
	"fmt"
	"path/filepath"
)

var profileNames = []string{
	"weekday_am_peak",
	"weekday_midday",
	"weekday_pm_peak",
	"weekday_night",
	"weekend_day",
	"weekend_night",
}

var congestionMultipliers = map[string]float64{
	"weekday_am_peak": 1.45,
	"weekday_midday":  1.20,
	"weekday_pm_peak": 1.55,
	"weekday_night":   1.00,
	"weekend_day":     1.15,
	"weekend_night":   1.00,
}

func classifySlot(dow, hour int) int {
	isWeekend := dow >= 5
	if isWeekend {
		if hour >= 8 && hour < 20 {
			return 4
		}
		return 5
	}
	if hour >= 7 && hour <= 9 {
		return 0
	}
	if hour >= 10 && hour <= 15 {
		return 1
	}
	if hour >= 16 && hour <= 19 {
		return 2
	}
	return 3
}

func runBuildSpeedProfiles(_ []string) error {
	profileMap := make([]int, 0, 168)
	for dow := 0; dow < 7; dow++ {
		for hour := 0; hour < 24; hour++ {
			profileMap = append(profileMap, classifySlot(dow, hour))
		}
	}

	dist := make(map[int]int)
	for _, p := range profileMap {
		dist[p]++
	}

	fmt.Println("Speed profile distribution (168 slots):")
	for i, name := range profileNames {
		fmt.Printf("  [%d] %s: %d slots (congestion x%.2f)\n", i, name, dist[i], congestionMultipliers[name])
	}

	mults := make(map[string]float64)
	for _, name := range profileNames {
		mults[name] = congestionMultipliers[name]
	}

	output := map[string]any{
		"profiles":             profileNames,
		"congestionMultipliers": mults,
		"profileMap":           profileMap,
	}

	outPath := filepath.Join(dataDir(), "speed_profiles.json")
	if err := writeJSON(outPath, output); err != nil {
		return err
	}
	fmt.Printf("\nWrote %s (%d bytes)\n", outPath, fileSize(outPath))
	return nil
}
