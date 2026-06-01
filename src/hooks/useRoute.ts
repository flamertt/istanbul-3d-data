import { useState, useCallback } from "react";
import { decodePolyline6 } from "../lib/polyline6";

export type RouteMode = "auto" | "bicycle" | "pedestrian";

export interface RouteState {
  status: "idle" | "locating" | "routing" | "done" | "error";
  path: [number, number][] | null;
  distanceKm: number | null;
  durationMin: number | null;
  error: string | null;
  destLat: number | null;
  destLng: number | null;
  mode: RouteMode;
}

const VALHALLA = "/api/valhalla";

function getUserLocation(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Tarayıcı konum desteklemiyor"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(new Error(`Konum alınamadı: ${err.message}`)),
      { timeout: 10000, maximumAge: 30000 },
    );
  });
}

async function fetchRoute(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
  mode: RouteMode,
): Promise<{ path: [number, number][]; distanceKm: number; durationMin: number }> {
  const body = {
    locations: [
      { lat: fromLat, lon: fromLng },
      { lat: toLat, lon: toLng },
    ],
    costing: mode,
    directions_options: { units: "kilometers" },
  };

  const resp = await fetch(`${VALHALLA}/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) throw new Error(`Valhalla hatası: ${resp.status}`);
  const data = await resp.json();

  const trip = data?.trip;
  if (!trip) throw new Error("Rota bulunamadı");

  const shape = trip.legs?.[0]?.shape ?? "";
  const summary = trip.summary ?? {};

  return {
    path: decodePolyline6(shape),
    distanceKm: summary.length ?? null,
    durationMin: summary.time != null ? summary.time / 60 : null,
  };
}

export function useRoute() {
  const [state, setState] = useState<RouteState>({
    status: "idle",
    path: null,
    distanceKm: null,
    durationMin: null,
    error: null,
    destLat: null,
    destLng: null,
    mode: "auto",
  });

  const getDirections = useCallback(async (destLat: number, destLng: number, mode: RouteMode = "auto") => {
    setState((s) => ({ ...s, status: "locating", error: null, destLat, destLng, mode }));

    try {
      const coords = await getUserLocation();
      setState((s) => ({ ...s, status: "routing" }));

      const result = await fetchRoute(coords.latitude, coords.longitude, destLat, destLng, mode);
      setState({
        status: "done",
        path: result.path,
        distanceKm: result.distanceKm,
        durationMin: result.durationMin,
        error: null,
        destLat,
        destLng,
        mode,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, []);

  const clearRoute = useCallback(() => {
    setState({ status: "idle", path: null, distanceKm: null, durationMin: null, error: null, destLat: null, destLng: null, mode: "auto" });
  }, []);

  return { route: state, getDirections, clearRoute };
}
