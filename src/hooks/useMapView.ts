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

  const prevTierRef = useRef<ZoomTier>(getZoomTier(viewState.zoom));
  const userInteractedRef = useRef(false);
  const flyingRef = useRef(false);

  // rAF batching: birden fazla onViewStateChange aynı frame içinde gelirse
  // sadece bir React render tetiklenir → hızlı kamera hareketinde lag yok
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<MapViewState | null>(null);

  const flushViewState = useCallback(() => {
    rafRef.current = null;
    if (pendingRef.current) {
      setViewState(pendingRef.current);
      pendingRef.current = null;
    }
  }, []);

  const flyTo = useCallback((longitude: number, latitude: number, zoom?: number) => {
    const targetZoom = zoom ?? 15;
    const targetPitch = getZoomTier(targetZoom) !== "heatmap" ? 45 : 0;
    userInteractedRef.current = false;
    flyingRef.current = true;
    setViewState((prev) => ({
      ...prev,
      longitude,
      latitude,
      zoom: targetZoom,
      pitch: targetPitch,
      transitionDuration: 1800,
      transitionInterpolator: new FlyToInterpolator({ speed: 1.5 }),
    }));
  }, []);

  // Araç takibi için — her tick'te çağrılır, animasyon yok, sadece merkezi kaydır
  const panTo = useCallback((longitude: number, latitude: number) => {
    setViewState((prev) => ({ ...prev, longitude, latitude }));
  }, []);

  const onViewStateChange = useCallback((vs: MapViewState) => {
    const newTier = getZoomTier(vs.zoom);
    const prevTier = prevTierRef.current;

    if (vs.pitch !== viewState.pitch || vs.bearing !== viewState.bearing) {
      if (!flyingRef.current) userInteractedRef.current = true;
    }

    let nextViewState = vs;

    if (!userInteractedRef.current) {
      if (newTier === "columns" && prevTier === "heatmap") {
        nextViewState = { ...nextViewState, pitch: 45 };
      }
      if (newTier === "heatmap" && prevTier === "columns") {
        nextViewState = { ...nextViewState, pitch: 0 };
      }
    }

    prevTierRef.current = newTier;

    // Tier değişimi veya pitch/bearing değişimi → hemen güncelle (kritik)
    // Ama flyTo animasyonu devam ediyorsa kesme
    const tierChanged = newTier !== prevTier;
    const orientationChanged = nextViewState.pitch !== viewState.pitch ||
                               nextViewState.bearing !== viewState.bearing;

    if ((tierChanged || orientationChanged) && !flyingRef.current) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setViewState(nextViewState);
      return;
    }

    // Animasyon bitti mi? (kullanıcı hareket ettirdi veya zoom sabitlendi)
    if (flyingRef.current && vs.transitionDuration === undefined) {
      flyingRef.current = false;
    }

    // Sadece pan/zoom → rAF ile batch et (birden fazla frame event'i → tek render)
    pendingRef.current = nextViewState;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flushViewState);
    }
  }, [viewState, flushViewState]);

  return {
    viewState,
    setViewState,
    onViewStateChange,
    flyTo,
    panTo,
  };
}
