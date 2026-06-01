package main

import (
	"fmt"
	"math"
	"net/url"
	"path/filepath"
	"strconv"
)

type pathResult struct {
	Path   [][2]float64 `json:"path"`
	Meters [][2]float64 `json:"meters"`
}

func pcaAngle(positions [][2]float64) (theta, meanX, meanY float64) {
	n := float64(len(positions))
	for _, p := range positions {
		meanX += p[0]
		meanY += p[1]
	}
	meanX /= n
	meanY /= n

	var cxx, cyy, cxy float64
	for _, p := range positions {
		dx := p[0] - meanX
		dy := p[1] - meanY
		cxx += dx * dx
		cyy += dy * dy
		cxy += dx * dy
	}
	cxx /= n
	cyy /= n
	cxy /= n
	theta = 0.5 * math.Atan2(2*cxy, cxx-cyy)
	return
}

func findGridAngle(angles []float64) float64 {
	halfPi := math.Pi / 2
	var sinSum, cosSum float64
	for _, a := range angles {
		reduced := math.Mod(a, halfPi)
		if reduced < 0 {
			reduced += halfPi
		}
		q := reduced * 4
		sinSum += math.Sin(q)
		cosSum += math.Cos(q)
	}
	n := float64(len(angles))
	gridAngle := math.Atan2(sinSum/n, cosSum/n) / 4
	if gridAngle < 0 {
		gridAngle += halfPi
	}
	return gridAngle
}

func snapAngleToGrid(theta, gridAngle float64) float64 {
	maxDev := math.Pi / 12 // 15 degrees
	bestAngle := theta
	bestDiff := math.MaxFloat64
	for k := 0; k < 4; k++ {
		candidate := gridAngle + float64(k)*math.Pi/2
		diff := math.Mod(theta-candidate+math.Pi, 2*math.Pi) - math.Pi
		if math.Abs(diff) < bestDiff {
			bestDiff = math.Abs(diff)
			bestAngle = candidate
		}
	}
	if bestDiff <= maxDev {
		return bestAngle
	}
	return theta
}

func computeBlockPath(positions [][2]float64, gridAngle float64) (path [][2]float64, meters [][2]float64) {
	theta, meanX, meanY := pcaAngle(positions)
	snapped := snapAngleToGrid(theta, gridAngle)
	cosT := math.Cos(snapped)
	sinT := math.Sin(snapped)

	tMin, tMax := math.MaxFloat64, -math.MaxFloat64
	for _, p := range positions {
		t := (p[0]-meanX)*cosT + (p[1]-meanY)*sinT
		if t < tMin {
			tMin = t
		}
		if t > tMax {
			tMax = t
		}
	}

	start := [2]float64{meanX + tMin*cosT, meanY + tMin*sinT}
	end := [2]float64{meanX + tMax*cosT, meanY + tMax*sinT}
	return [][2]float64{start, end}, positions
}

func round6(v float64) float64 { return math.Round(v*1e6) / 1e6 }

func runComputePaths(_ []string) error {
	type rawMeter struct {
		StreetName string `json:"street_name"`
		StreetNum  string `json:"street_num"`
		Latitude   string `json:"latitude"`
		Longitude  string `json:"longitude"`
	}

	params := url.Values{
		"$limit": {"50000"},
		"$where": {"active_meter_flag='M'"},
		"$select": {"post_id,street_name,street_num,latitude,longitude"},
	}
	apiURL := fmt.Sprintf("%s/8vzz-qzz9.json?%s", sodaBase, params.Encode())

	fmt.Println("Fetching meters from SODA API...")
	var records []rawMeter
	if err := getJSON(apiURL, &records); err != nil {
		return err
	}
	fmt.Printf("  Received %d active meter records\n", len(records))

	blockPositions := map[string][][2]float64{}
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
		blockPositions[blockID] = append(blockPositions[blockID], [2]float64{lng, lat})
	}
	if skipped > 0 {
		fmt.Printf("  Skipped %d meters\n", skipped)
	}
	fmt.Printf("  Grouped into %d blocks\n", len(blockPositions))

	// Deduplicate and filter
	prepared := map[string][][2]float64{}
	singleMeter := 0
	for blockID, positions := range blockPositions {
		if len(positions) < 2 {
			singleMeter++
			continue
		}
		seen := map[[2]float64]bool{}
		var unique [][2]float64
		for _, p := range positions {
			key := [2]float64{math.Round(p[0]*1e7) / 1e7, math.Round(p[1]*1e7) / 1e7}
			if !seen[key] {
				seen[key] = true
				unique = append(unique, p)
			}
		}
		if len(unique) < 2 {
			singleMeter++
			continue
		}
		prepared[blockID] = unique
	}

	// First pass: collect angles
	var allAngles []float64
	for _, positions := range prepared {
		theta, _, _ := pcaAngle(positions)
		allAngles = append(allAngles, theta)
	}
	gridAngle := findGridAngle(allAngles)
	fmt.Printf("  Detected grid angle: %.1f° (from %d blocks)\n", math.Pi/180*gridAngle, len(allAngles)) // fixed: should be degrees

	fmt.Println("\nComputing PCA-sorted paths...")

	// Second pass: compute paths
	paths := map[string]interface{}{}
	for blockID := range blockPositions {
		uniquePositions, ok := prepared[blockID]
		if !ok {
			paths[blockID] = nil
			continue
		}
		rawPath, rawMeters := computeBlockPath(uniquePositions, gridAngle)
		roundedPath := make([][2]float64, len(rawPath))
		for i, p := range rawPath {
			roundedPath[i] = [2]float64{round6(p[0]), round6(p[1])}
		}
		roundedMeters := make([][2]float64, len(rawMeters))
		for i, p := range rawMeters {
			roundedMeters[i] = [2]float64{round6(p[0]), round6(p[1])}
		}
		paths[blockID] = pathResult{Path: roundedPath, Meters: roundedMeters}
	}

	fmt.Printf("  %d blocks with paths, %d single-meter blocks (null)\n", len(prepared), singleMeter)

	outPath := filepath.Join(dataDir(), "block_paths.json")
	if err := writeJSON(outPath, paths); err != nil {
		return err
	}
	fmt.Printf("\nWrote %s (%.0f KB, %d blocks)\n", outPath, float64(fileSize(outPath))/1024, len(paths))
	return nil
}
