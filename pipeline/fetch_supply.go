package main

import (
	"fmt"
	"math"
	"net/url"
	"path/filepath"
	"strconv"
	"time"
)

const (
	supplyMaxDistLat = 0.00135
	supplyMaxDistLng = 0.0018
)

type supplySegment struct {
	PrkgSply string         `json:"prkg_sply"`
	Shape    *segmentGeom   `json:"shape"`
}

type segmentGeom struct {
	Type        string      `json:"type"`
	Coordinates interface{} `json:"coordinates"`
}

func segmentCentroid(geom *segmentGeom) (lat, lng float64, ok bool) {
	if geom == nil {
		return 0, 0, false
	}
	switch geom.Type {
	case "Point":
		coords, ok2 := geom.Coordinates.([]interface{})
		if !ok2 || len(coords) < 2 {
			return 0, 0, false
		}
		lngV, _ := coords[0].(float64)
		latV, _ := coords[1].(float64)
		return latV, lngV, true
	case "LineString":
		coords, ok2 := geom.Coordinates.([]interface{})
		if !ok2 || len(coords) == 0 {
			return 0, 0, false
		}
		return avgLineString(coords)
	case "MultiLineString":
		lines, ok2 := geom.Coordinates.([]interface{})
		if !ok2 {
			return 0, 0, false
		}
		var allCoords []interface{}
		for _, line := range lines {
			if pts, ok3 := line.([]interface{}); ok3 {
				allCoords = append(allCoords, pts...)
			}
		}
		if len(allCoords) == 0 {
			return 0, 0, false
		}
		return avgLineString(allCoords)
	}
	return 0, 0, false
}

func avgLineString(coords []interface{}) (lat, lng float64, ok bool) {
	var latSum, lngSum float64
	count := 0
	for _, c := range coords {
		pt, ok2 := c.([]interface{})
		if !ok2 || len(pt) < 2 {
			continue
		}
		lngV, _ := pt[0].(float64)
		latV, _ := pt[1].(float64)
		lngSum += lngV
		latSum += latV
		count++
	}
	if count == 0 {
		return 0, 0, false
	}
	return latSum / float64(count), lngSum / float64(count), true
}

func runFetchSupply(_ []string) error {
	dataPath := dataDir()
	meterPath := filepath.Join(dataPath, "meter_locations.json")
	outPath := filepath.Join(dataPath, "parking_supply.json")

	centroids, err := loadBlockCentroids(meterPath)
	if err != nil {
		return fmt.Errorf("meter_locations.json not found: run fetch-meters first")
	}
	fmt.Printf("Loaded %d block centroids\n", len(centroids))

	fmt.Println("\nFetching parking supply segments...")
	allSegments := []supplySegment{}
	pageSize := 50000
	offset := 0
	start := time.Now()

	for {
		params := url.Values{
			"$select": {"prkg_sply,shape"},
			"$where":  {"prkg_sply>0"},
			"$limit":  {strconv.Itoa(pageSize)},
			"$offset": {strconv.Itoa(offset)},
		}
		apiURL := fmt.Sprintf("%s/9ivs-nf5y.json?%s", sodaBase, params.Encode())
		var rows []supplySegment
		t := time.Now()
		if err := getJSON(apiURL, &rows); err != nil {
			return err
		}
		fmt.Printf("  Page %d: %d rows (%.1fs)\n", offset/pageSize+1, len(rows), time.Since(t).Seconds())
		allSegments = append(allSegments, rows...)
		if len(rows) < pageSize {
			break
		}
		offset += pageSize
	}
	fmt.Printf("  Total: %d segments in %.1fs\n", len(allSegments), time.Since(start).Seconds())

	fmt.Println("\nSpatial join to block centroids...")
	blockSupply := map[string]int{}
	matched, skipped := 0, 0

	for _, seg := range allSegments {
		supply, err := strconv.Atoi(seg.PrkgSply)
		if err != nil || supply <= 0 {
			skipped++
			continue
		}
		slat, slng, ok := segmentCentroid(seg.Shape)
		if !ok {
			skipped++
			continue
		}
		bestBlock := ""
		bestDist := math.MaxFloat64
		for _, c := range centroids {
			dlat := math.Abs(slat - c.Lat)
			if dlat > supplyMaxDistLat {
				continue
			}
			dlng := math.Abs(slng - c.Lng)
			if dlng > supplyMaxDistLng {
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
			blockSupply[bestBlock] += supply
		} else {
			skipped++
		}
	}
	fmt.Printf("  Matched %d segments, %d skipped\n", matched, skipped)

	if len(blockSupply) > 0 {
		total := 0
		lo, hi := math.MaxInt32, 0
		for _, v := range blockSupply {
			total += v
			if v < lo {
				lo = v
			}
			if v > hi {
				hi = v
			}
		}
		fmt.Printf("\nValidation:\n")
		fmt.Printf("  Blocks with supply: %d\n", len(blockSupply))
		fmt.Printf("  Total spaces: %d\n", total)
		fmt.Printf("  Avg spaces/block: %.1f\n", float64(total)/float64(len(blockSupply)))
		fmt.Printf("  Range: %d - %d\n", lo, hi)
	}

	if err := writeJSON(outPath, blockSupply); err != nil {
		return err
	}
	fmt.Printf("\nWrote %s (%.0f KB, %d blocks)\n", outPath, float64(fileSize(outPath))/1024, len(blockSupply))
	return nil
}
