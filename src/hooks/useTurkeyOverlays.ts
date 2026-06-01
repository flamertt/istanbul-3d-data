import { useEffect, useState } from "react";

type FeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>;

export interface TurkeyOverlayFlags {
  busRoutes: boolean;
  railLines: boolean;
  bikeLanes: boolean;
  greenAreas: boolean;
  busStops: boolean;
  railStations: boolean;
  evChargingStations: boolean;
  micromobilityParks: boolean;
  toilets: boolean;
  taxiStops: boolean;
  taxiDolmusStops: boolean;
  minibusRoutes: boolean;
  minibusStops: boolean;
  seaStations: boolean;
}

function useLazyFeatureCollection(url: string, enabled: boolean) {
  const [data, setData] = useState<FeatureCollection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (data) return;

    const controller = new AbortController();

    async function load() {
      try {
        setError(null);
        const resp = await fetch(url, { signal: controller.signal });
        if (!resp.ok) throw new Error(`HTTP ${resp.status} (${resp.statusText})`);
        const json = (await resp.json()) as FeatureCollection;
        setData(json);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    }

    load();
    return () => controller.abort();
  }, [url, enabled, data]);

  return { data, error };
}

/**
 * Loads Istanbul overlay datasets progressively based on zoom.
 * (Bazı dataset’ler büyük olduğu için ilk ekranda hepsini çekmiyoruz.)
 */
export function useTurkeyOverlays(flags: TurkeyOverlayFlags, zoom: number) {
  // Lines/polygons are visible around neighborhood/streets zoom.
  const showLines = zoom >= 11;
  const showPolygons = zoom >= 10.5;
  // Points are visible at deeper zoom where clutter is acceptable.
  const showPoints = zoom >= 13;

  const busRoutes = useLazyFeatureCollection(
    "/data/turkey_overlays/bus_routes_freq.geojson",
    flags.busRoutes && showLines,
  );
  const railLines = useLazyFeatureCollection(
    "/data/turkey_overlays/rail_lines.geojson",
    flags.railLines && showLines,
  );
  const bikeLanes = useLazyFeatureCollection(
    "/data/turkey_overlays/bike_lanes.geojson",
    flags.bikeLanes && showLines,
  );
  const greenAreas = useLazyFeatureCollection(
    "/data/turkey_overlays/green_areas.geojson",
    flags.greenAreas && showPolygons,
  );

  const busStops = useLazyFeatureCollection(
    "/data/turkey_overlays/bus_stops.geojson",
    flags.busStops && showPoints,
  );
  const railStations = useLazyFeatureCollection(
    "/data/turkey_overlays/rail_stations.geojson",
    flags.railStations && showPoints,
  );
  const evChargingStations = useLazyFeatureCollection(
    "/data/turkey_overlays/ev_charging_stations.geojson",
    flags.evChargingStations && showPoints,
  );
  const micromobilityParks = useLazyFeatureCollection(
    "/data/turkey_overlays/micromobility_parks.geojson",
    flags.micromobilityParks && showPoints,
  );
  const toilets = useLazyFeatureCollection(
    "/data/turkey_overlays/toilets.geojson",
    flags.toilets && showPoints,
  );

  const taxiStops = useLazyFeatureCollection(
    "/data/turkey_overlays/taxi_stops.geojson",
    flags.taxiStops && showPoints,
  );
  const taxiDolmusStops = useLazyFeatureCollection(
    "/data/turkey_overlays/taxi_dolmus_stops.geojson",
    flags.taxiDolmusStops && showPoints,
  );
  const minibusRoutes = useLazyFeatureCollection(
    "/data/turkey_overlays/minibus_routes.geojson",
    flags.minibusRoutes && showLines,
  );
  const minibusStops = useLazyFeatureCollection(
    "/data/turkey_overlays/minibus_stops.geojson",
    flags.minibusStops && showPoints,
  );
  const seaStations = useLazyFeatureCollection(
    "/data/turkey_overlays/sea_transport_stations.geojson",
    flags.seaStations && showPoints,
  );

  return {
    busRoutes: flags.busRoutes ? busRoutes.data : null,
    railLines: flags.railLines ? railLines.data : null,
    bikeLanes: flags.bikeLanes ? bikeLanes.data : null,
    greenAreas: flags.greenAreas ? greenAreas.data : null,

    busStops: flags.busStops ? busStops.data : null,
    railStations: flags.railStations ? railStations.data : null,
    evChargingStations: flags.evChargingStations ? evChargingStations.data : null,
    micromobilityParks: flags.micromobilityParks ? micromobilityParks.data : null,
    toilets: flags.toilets ? toilets.data : null,
    taxiStops: flags.taxiStops ? taxiStops.data : null,
    taxiDolmusStops: flags.taxiDolmusStops ? taxiDolmusStops.data : null,
    minibusRoutes: flags.minibusRoutes ? minibusRoutes.data : null,
    minibusStops: flags.minibusStops ? minibusStops.data : null,
    seaStations: flags.seaStations ? seaStations.data : null,

    // For future UI (currently not rendered).
    errors: [
      busRoutes.error,
      railLines.error,
      bikeLanes.error,
      greenAreas.error,
      busStops.error,
      railStations.error,
      evChargingStations.error,
      micromobilityParks.error,
      toilets.error,
      taxiStops.error,
      taxiDolmusStops.error,
      minibusRoutes.error,
      minibusStops.error,
      seaStations.error,
    ].filter((e): e is string => Boolean(e)),
  };
}

