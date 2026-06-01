package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

var contourMinutes = []int{2, 4, 6, 8, 10, 12, 14, 16, 18, 20}

var vallahaCosting = map[string]string{
	"driving": "auto",
	"cycling": "bicycle",
	"walking": "pedestrian",
}

var profileSpeedFactors = map[int]float64{
	0: 0.69, 1: 0.83, 2: 0.65, 3: 1.00, 4: 0.87, 5: 1.00,
}

var sfBounds = struct{ minLat, maxLat, minLng, maxLng float64 }{37.708, 37.812, -122.515, -122.357}

var sfLandPolygon = [][2]float64{
	{-122.515, 37.708}, {-122.390, 37.708}, {-122.357, 37.730},
	{-122.357, 37.812}, {-122.370, 37.812}, {-122.420, 37.808},
	{-122.450, 37.808}, {-122.480, 37.790}, {-122.510, 37.780},
	{-122.515, 37.775}, {-122.515, 37.708},
}

type gridPoint struct {
	ID  int     `json:"id"`
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type geoFeature struct {
	Type       string         `json:"type"`
	Geometry   geoGeometry    `json:"geometry"`
	Properties map[string]any `json:"properties"`
}

type geoGeometry struct {
	Type        string    `json:"type"`
	Coordinates any       `json:"coordinates"`
}

func pointInPolygon(lng, lat float64, polygon [][2]float64) bool {
	n := len(polygon)
	inside := false
	j := n - 1
	for i := 0; i < n; i++ {
		xi, yi := polygon[i][0], polygon[i][1]
		xj, yj := polygon[j][0], polygon[j][1]
		if ((yi > lat) != (yj > lat)) && (lng < (xj-xi)*(lat-yi)/(yj-yi)+xi) {
			inside = !inside
		}
		j = i
	}
	return inside
}

func generateGrid(spacing float64) []gridPoint {
	var points []gridPoint
	pid := 0
	for lat := sfBounds.minLat; lat <= sfBounds.maxLat; lat += spacing {
		for lng := sfBounds.minLng; lng <= sfBounds.maxLng; lng += spacing {
			if pointInPolygon(lng, lat, sfLandPolygon) {
				points = append(points, gridPoint{
					ID:  pid,
					Lat: math.Round(lat*1e5) / 1e5,
					Lng: math.Round(lng*1e5) / 1e5,
				})
				pid++
			}
		}
	}
	return points
}

func perpendicularDist(point, start, end [2]float64) float64 {
	dx := end[0] - start[0]
	dy := end[1] - start[1]
	if dx == 0 && dy == 0 {
		return math.Sqrt(math.Pow(point[0]-start[0], 2) + math.Pow(point[1]-start[1], 2))
	}
	t := ((point[0]-start[0])*dx + (point[1]-start[1])*dy) / (dx*dx + dy*dy)
	t = math.Max(0, math.Min(1, t))
	projX := start[0] + t*dx
	projY := start[1] + t*dy
	return math.Sqrt(math.Pow(point[0]-projX, 2) + math.Pow(point[1]-projY, 2))
}

func douglasPeucker(coords [][2]float64, tolerance float64) [][2]float64 {
	if len(coords) <= 2 {
		return coords
	}
	maxDist := 0.0
	maxIdx := 0
	start, end := coords[0], coords[len(coords)-1]
	for i := 1; i < len(coords)-1; i++ {
		d := perpendicularDist(coords[i], start, end)
		if d > maxDist {
			maxDist = d
			maxIdx = i
		}
	}
	if maxDist > tolerance {
		left := douglasPeucker(coords[:maxIdx+1], tolerance)
		right := douglasPeucker(coords[maxIdx:], tolerance)
		return append(left[:len(left)-1], right...)
	}
	return [][2]float64{start, end}
}

func quantize(coords [][2]float64) [][2]float64 {
	result := make([][2]float64, len(coords))
	for i, c := range coords {
		result[i] = [2]float64{math.Round(c[0]*1e5) / 1e5, math.Round(c[1]*1e5) / 1e5}
	}
	return result
}

func toCoord2D(raw any) [][2]float64 {
	arr, ok := raw.([]any)
	if !ok {
		return nil
	}
	result := make([][2]float64, 0, len(arr))
	for _, item := range arr {
		pt, ok := item.([]any)
		if !ok || len(pt) < 2 {
			continue
		}
		lng, _ := pt[0].(float64)
		lat, _ := pt[1].(float64)
		result = append(result, [2]float64{lng, lat})
	}
	return result
}

func simplifyFeature(feat geoFeature, tolerance float64) geoFeature {
	geom := feat.Geometry
	switch geom.Type {
	case "Polygon":
		rings, ok := geom.Coordinates.([]any)
		if !ok {
			break
		}
		newRings := make([][][2]float64, 0, len(rings))
		for _, ring := range rings {
			coords := toCoord2D(ring)
			simplified := douglasPeucker(coords, tolerance)
			newRings = append(newRings, quantize(simplified))
		}
		geom.Coordinates = newRings
	case "MultiPolygon":
		polys, ok := geom.Coordinates.([]any)
		if !ok {
			break
		}
		newPolys := make([][][][2]float64, 0, len(polys))
		for _, poly := range polys {
			rings, ok := poly.([]any)
			if !ok {
				continue
			}
			newRings := make([][][2]float64, 0, len(rings))
			for _, ring := range rings {
				coords := toCoord2D(ring)
				simplified := douglasPeucker(coords, tolerance)
				newRings = append(newRings, quantize(simplified))
			}
			newPolys = append(newPolys, newRings)
		}
		geom.Coordinates = newPolys
	}

	contour := 0
	if v, ok := feat.Properties["contour"]; ok {
		switch vv := v.(type) {
		case float64:
			contour = int(vv)
		case int:
			contour = vv
		}
	}
	return geoFeature{
		Type:       "Feature",
		Geometry:   geom,
		Properties: map[string]any{"contour": contour},
	}
}

func callValhalla(valhallaURL string, lat, lng float64, costing string,
	contours []int, speedFactor float64) ([]geoFeature, error) {

	body := map[string]any{
		"locations": []map[string]float64{{"lat": lat, "lon": lng}},
		"costing":   costing,
		"contours":  func() []map[string]int {
			result := make([]map[string]int, len(contours))
			for i, m := range contours {
				result[i] = map[string]int{"time": m}
			}
			return result
		}(),
		"polygons":   true,
		"denoise":    0.5,
		"generalize": 50,
	}

	if costing == "auto" && speedFactor < 1.0 {
		body["costing_options"] = map[string]any{
			"auto": map[string]any{"top_speed": int(120 * speedFactor)},
		}
	} else if costing == "bicycle" && speedFactor < 1.0 {
		body["costing_options"] = map[string]any{
			"bicycle": map[string]any{"cycling_speed": int(math.Max(10, 25*speedFactor))},
		}
	}

	payload, _ := json.Marshal(body)
	req, err := http.NewRequest("POST", valhallaURL+"/isochrone", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Features []geoFeature `json:"features"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result.Features, nil
}

func checkValhalla(valhallaURL string) bool {
	body := map[string]any{
		"locations": []map[string]float64{
			{"lat": 37.7749, "lon": -122.4194},
			{"lat": 37.7849, "lon": -122.4094},
		},
		"costing": "auto",
	}
	payload, _ := json.Marshal(body)
	req, err := http.NewRequest("POST", valhallaURL+"/route", bytes.NewReader(payload))
	if err != nil {
		return false
	}
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Valhalla check failed: %v\n", err)
		return false
	}
	defer resp.Body.Close()
	var result map[string]any
	json.NewDecoder(resp.Body).Decode(&result)
	_, ok := result["trip"]
	return ok
}

func computeMode(grid []gridPoint, profileMap []int, mode, valhallaURL string, tolerance float64) map[string]map[string]map[string]geoFeature {
	costing := vallahaCosting[mode]
	uniqueProfiles := map[int]bool{}
	for _, p := range profileMap {
		uniqueProfiles[p] = true
	}

	var profiles []int
	switch mode {
	case "walking":
		profiles = []int{3}
	default:
		for p := range uniqueProfiles {
			profiles = append(profiles, p)
		}
	}

	isochrones := map[string]map[string]map[string]geoFeature{}
	mu := sync.Mutex{}
	total := int64(len(grid) * len(profiles))
	var done, errors int64

	start := time.Now()

	sem := make(chan struct{}, 8) // 8 concurrent Valhalla calls
	var wg sync.WaitGroup

	for _, point := range grid {
		pid := fmt.Sprintf("%d", point.ID)
		mu.Lock()
		isochrones[pid] = map[string]map[string]geoFeature{}
		mu.Unlock()

		for _, profileIdx := range profiles {
			wg.Add(1)
			go func(point gridPoint, pid string, profileIdx int) {
				defer wg.Done()
				sem <- struct{}{}
				defer func() { <-sem }()

				speedFactor := profileSpeedFactors[profileIdx]
				if mode == "walking" {
					speedFactor = 1.0
				}

				features, err := callValhalla(valhallaURL, point.Lat, point.Lng, costing, contourMinutes, speedFactor)
				if err != nil {
					atomic.AddInt64(&errors, 1)
					if atomic.LoadInt64(&errors) <= 5 {
						fmt.Printf("  Error at grid %s profile %d: %v\n", pid, profileIdx, err)
					}
				} else {
					contourFeatures := map[string]geoFeature{}
					for _, feat := range features {
						contour := 0
						if v, ok := feat.Properties["contour"]; ok {
							switch vv := v.(type) {
							case float64:
								contour = int(vv)
							case int:
								contour = vv
							}
						}
						simplified := simplifyFeature(feat, tolerance)
						contourFeatures[fmt.Sprintf("%d", contour)] = simplified
					}
					mu.Lock()
					isochrones[pid][fmt.Sprintf("%d", profileIdx)] = contourFeatures
					mu.Unlock()
				}

				n := atomic.AddInt64(&done, 1)
				if n%20 == 0 || n == total {
					elapsed := time.Since(start).Seconds()
					rate := float64(n) / elapsed
					eta := float64(total-n) / rate
					fmt.Printf("  %s: %d/%d (%.1f/s, ETA %.0fs)\n", mode, n, total, rate, eta)
				}
			}(point, pid, profileIdx)
		}
	}
	wg.Wait()

	// For walking, copy profile 3 to all profiles
	if mode == "walking" {
		for pid := range isochrones {
			base := isochrones[pid]["3"]
			for p := 0; p < 6; p++ {
				isochrones[pid][fmt.Sprintf("%d", p)] = base
			}
		}
	}

	return isochrones
}

func runComputeIsochrones(rawArgs []string) error {
	fs := flag.NewFlagSet("compute-isochrones", flag.ContinueOnError)
	valhallaURL := fs.String("valhalla-url", "http://localhost:8002", "Valhalla server URL")
	spacing := fs.Float64("spacing", 0.009, "grid spacing in degrees")
	tolerance := fs.Float64("tolerance", 0.0002, "Douglas-Peucker tolerance")
	modesStr := fs.String("modes", "driving,cycling,walking", "comma-separated modes")
	if err := fs.Parse(rawArgs); err != nil {
		return err
	}

	modes := strings.Split(*modesStr, ",")
	for i, m := range modes {
		modes[i] = strings.TrimSpace(m)
	}

	dataPath := dataDir()
	isoDir := filepath.Join(dataPath, "isochrones")
	if err := os.MkdirAll(isoDir, 0755); err != nil {
		return err
	}

	profilesPath := filepath.Join(dataPath, "speed_profiles.json")
	if _, err := os.Stat(profilesPath); err != nil {
		return fmt.Errorf("run build-speed-profiles first")
	}
	var speedData struct {
		ProfileMap []int `json:"profileMap"`
	}
	data, _ := os.ReadFile(profilesPath)
	json.Unmarshal(data, &speedData)
	fmt.Printf("Loaded %d speed profile mappings\n", len(speedData.ProfileMap))

	fmt.Printf("\nChecking Valhalla at %s...\n", *valhallaURL)
	if !checkValhalla(*valhallaURL) {
		return fmt.Errorf("Valhalla is not responding. Run: docker compose up -d\nFirst run builds routing tiles (~15 min). Check: docker compose logs -f")
	}
	fmt.Println("Valhalla is ready")

	grid := generateGrid(*spacing)
	fmt.Printf("\nGenerated %d grid points (spacing=%.3f deg)\n", len(grid), *spacing)

	for _, mode := range modes {
		if _, ok := vallahaCosting[mode]; !ok {
			fmt.Printf("Skipping unknown mode: %s\n", mode)
			continue
		}

		fmt.Printf("\n%s\nComputing %s isochrones...\n%s\n",
			strings.Repeat("=", 60), mode, strings.Repeat("=", 60))

		start := time.Now()
		isochrones := computeMode(grid, speedData.ProfileMap, mode, *valhallaURL, *tolerance)
		elapsed := time.Since(start).Seconds()

		output := map[string]any{
			"grid":       grid,
			"profileMap": speedData.ProfileMap,
			"isochrones": isochrones,
		}

		outPath := filepath.Join(isoDir, mode+".json")
		if err := writeJSON(outPath, output); err != nil {
			return err
		}
		fmt.Printf("\n  Wrote %s (%.0f KB) in %.0fs\n", outPath, float64(fileSize(outPath))/1024, elapsed)
	}

	fmt.Printf("\nDone! Isochrone files in %s/\n", isoDir)
	return nil
}
