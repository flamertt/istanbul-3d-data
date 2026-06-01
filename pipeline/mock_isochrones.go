package main

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
)

var baseSpeeds = map[string]float64{
	"driving": 30,
	"cycling": 18,
	"walking": 5,
}

var mockProfileFactors = map[int]float64{
	0: 0.69, 1: 0.83, 2: 0.65, 3: 1.00, 4: 0.87, 5: 1.00,
}

func makeOrganicPolygon(centerLat, centerLng, radiusKm float64) [][2]float64 {
	numPoints := 36
	seed := centerLat*1000 + centerLng*100
	coords := make([][2]float64, numPoints+1)
	for i := 0; i <= numPoints; i++ {
		angle := 2 * math.Pi * float64(i) / float64(numPoints)
		noise := 1.0
		noise += 0.08 * math.Sin(angle*3+seed)
		noise += 0.05 * math.Sin(angle*7+seed*1.3)
		noise += 0.03 * math.Sin(angle*13+seed*0.7)
		r := radiusKm * noise
		dlat := (r / 111.32) * math.Cos(angle)
		dlng := (r / (111.32 * math.Cos(math.Pi/180*centerLat))) * math.Sin(angle)
		coords[i] = [2]float64{
			math.Round((centerLng+dlng)*1e5) / 1e5,
			math.Round((centerLat+dlat)*1e5) / 1e5,
		}
	}
	coords[numPoints] = coords[0]
	return coords
}

func generateMockIsochronesForMode(grid []gridPoint, profileMap []int, mode string) map[string]map[string]map[string]geoFeature {
	baseSpeed := baseSpeeds[mode]
	isochrones := map[string]map[string]map[string]geoFeature{}

	for _, point := range grid {
		pid := fmt.Sprintf("%d", point.ID)
		isochrones[pid] = map[string]map[string]geoFeature{}
		for p := 0; p < 6; p++ {
			factor := 1.0
			if mode != "walking" {
				factor = mockProfileFactors[p]
			}
			effectiveSpeed := baseSpeed * factor
			contourFeatures := map[string]geoFeature{}
			for _, minutes := range contourMinutes {
				radiusKm := effectiveSpeed * (float64(minutes) / 60.0)
				ring := makeOrganicPolygon(point.Lat, point.Lng, radiusKm)
				contourFeatures[fmt.Sprintf("%d", minutes)] = geoFeature{
					Type: "Feature",
					Geometry: geoGeometry{
						Type:        "Polygon",
						Coordinates: [][][2]float64{ring},
					},
					Properties: map[string]any{"contour": minutes},
				}
			}
			isochrones[pid][fmt.Sprintf("%d", p)] = contourFeatures
		}
	}
	return isochrones
}

func runMockIsochrones(_ []string) error {
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

	grid := generateGrid(0.009)
	fmt.Printf("Generated %d grid points\n", len(grid))

	for _, mode := range []string{"driving", "cycling", "walking"} {
		fmt.Printf("Generating mock %s isochrones (10 bands per point)...\n", mode)
		isochrones := generateMockIsochronesForMode(grid, speedData.ProfileMap, mode)
		output := map[string]any{
			"grid":       grid,
			"profileMap": speedData.ProfileMap,
			"isochrones": isochrones,
		}
		outPath := filepath.Join(isoDir, mode+".json")
		if err := writeJSON(outPath, output); err != nil {
			return err
		}
		fmt.Printf("  Wrote %s (%.0f KB)\n", outPath, float64(fileSize(outPath))/1024)
	}

	fmt.Printf("\nDone! 10-band mock isochrones in %s/\n", isoDir)
	return nil
}
