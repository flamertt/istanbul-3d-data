import { WebMercatorViewport } from "@deck.gl/core";
import type { MapViewState } from "deck.gl";

export type Bounds = [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]

export function getViewportBounds(viewState: MapViewState, marginFraction = 0.2): Bounds {
  try {
    const vp = new WebMercatorViewport({
      width: window.innerWidth,
      height: window.innerHeight,
      ...viewState,
    });
    const [minLng, minLat, maxLng, maxLat] = vp.getBounds();
    const dLng = (maxLng - minLng) * marginFraction;
    const dLat = (maxLat - minLat) * marginFraction;
    return [minLng - dLng, minLat - dLat, maxLng + dLng, maxLat + dLat];
  } catch {
    return [-180, -90, 180, 90]; // fallback: show everything
  }
}

export function inBounds(lng: number, lat: number, bounds: Bounds): boolean {
  return lng >= bounds[0] && lng <= bounds[2] && lat >= bounds[1] && lat <= bounds[3];
}
