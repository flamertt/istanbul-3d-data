import { useState, useCallback, useRef } from "react";
import { FlyToInterpolator } from "deck.gl";
import type { MapViewState } from "deck.gl";

const DEFAULT_VIEW: MapViewState = {
  longitude: 28.9784,
  latitude: 41.0082,
  zoom: 13.2,
  pitch: 0,
  bearing: 0,
};

// Zoom tier boundaries (matching ParkingMap)
const COLUMN_ZOOM_MIN = 13;
const SCATTER_ZOOM_MIN = 15.5;

type ZoomTier = "heatmap" | "columns" | "scatter";

function getZoomTier(zoom: number): ZoomTier {
  if (zoom >= SCATTER_ZOOM_MIN) return "scatter";
  if (zoom >= COLUMN_ZOOM_MIN) return "columns";
  return "heatmap";
}

export function useMapView(initialOverrides?: Partial<MapViewState>) {
  const initialZoom = initialOverrides?.zoom ?? DEFAULT_VIEW.zoom;
  const initialPitch =
    initialOverrides?.pitch ??
    (getZoomTier(initialZoom) !== "heatmap" ? 45 : 0);

  const [viewState, setViewState] = useState<MapViewState>({
    ...DEFAULT_VIEW,
    ...initialOverrides,
    pitch: initialPitch,
  });


  // Track previous zoom tier for auto-pitch on tier crossing
  const prevTierRef = useRef<ZoomTier>(getZoomTier(viewState.zoom));
  // Track whether user has manually interacted (pitch or bearing)
  const userInteractedRef = useRef(false);

  const flyTo = useCallback((longitude: number, latitude: number, zoom?: number) => {
    // flyTo resetting user interaction allows auto-pitch to re-engage
    userInteractedRef.current = false;
    setViewState((prev) => ({
      ...prev,
      longitude,
      latitude,
      zoom: zoom ?? Math.max(prev.zoom, 15),
      transitionDuration: 1000,
      transitionInterpolator: new FlyToInterpolator(),
    }));
  }, []);

  const onViewStateChange = useCallback((vs: MapViewState) => {
    const newTier = getZoomTier(vs.zoom);
    const prevTier = prevTierRef.current;

    // Detect manual interaction (pitch or bearing change)
    // If pitch changed but it wasn't triggered by our tier logic, mark as user interaction
    if (vs.pitch !== viewState.pitch || vs.bearing !== viewState.bearing) {
      // Small threshold to ignore tiny adjustments if necessary, but usually any change is intent
      userInteractedRef.current = true;
    }

    let nextViewState = vs;

    // Auto-pitch logic: only triggers if user hasn't manually adjusted their view
    if (!userInteractedRef.current) {
      // Auto-pitch when entering column tier from heatmap
      if (newTier === "columns" && prevTier === "heatmap") {
        nextViewState = { ...nextViewState, pitch: 45 };
      }
      // Reset pitch when leaving column tier to heatmap
      if (newTier === "heatmap" && prevTier === "columns") {
        nextViewState = { ...nextViewState, pitch: 0 };
      }
    }

    prevTierRef.current = newTier;
    setViewState(nextViewState);
  }, [viewState]);

  return {
    viewState,
    setViewState,
    onViewStateChange,
    flyTo,
  };
}
