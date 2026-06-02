import { IconLayer } from "@deck.gl/layers";
import type { Layer } from "deck.gl";
import type { BusTrip } from "../hooks/useBusSim";
import { buildCircleIcon, buildArrowIcon, computeHeading, ICON_PATHS } from "../lib/iconBuilder";
import { type Bounds, inBounds } from "../lib/viewportBounds";

type Coord = [number, number];

export interface ActiveBus {
  position: Coord;
  route: string;
  headsign: string;
  color: [number, number, number];
  startTimeSec: number;
  endTimeSec: number;
  progress: number;  // 0-1
  timestamps: number[];
  heading: number;   // degrees clockwise from north
}

// ── Icon builder — circle style matching landmark icons ────────────────────────
const iconCache = new Map<string, string>();
// Tüm otobüsler mavi border
const BUS_ICON_URL = buildCircleIcon(ICON_PATHS.bus, "#2563eb", 2.4);

function getBusIcon(_color: [number, number, number]): string {
  return BUS_ICON_URL;
}

const BUS_ICON_SIZE = 100;

// ── Route geometry snap ────────────────────────────────────────────────────────
type RouteGeomMap = Map<string, Coord[]>;
const newRouteGeomMap = () => new Map<string, Coord[]>();

function buildRouteGeomMap(
  geojson: GeoJSON.FeatureCollection | null | undefined,
): RouteGeomMap {
  const map = newRouteGeomMap();
  if (!geojson) return map;
  for (const f of geojson.features) {
    const key = (f.properties?.HAT_KODU as string | undefined)?.trim();
    if (!key) continue;
    const g = f.geometry;
    if (g.type === "LineString" && !map.has(key)) {
      map.set(key, g.coordinates as Coord[]);
    } else if (g.type === "MultiLineString" && !map.has(key)) {
      // flatten — longest segment
      const segs = g.coordinates as Coord[][];
      const longest = segs.reduce((a, b) => (a.length >= b.length ? a : b));
      map.set(key, longest);
    }
  }
  return map;
}

function snapToRoute(progress: number, coords: Coord[]): Coord {
  if (coords.length < 2) return coords[0];
  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const dx = coords[i + 1][0] - coords[i][0];
    const dy = coords[i + 1][1] - coords[i][1];
    const d = Math.sqrt(dx * dx + dy * dy);
    segLens.push(d);
    totalLen += d;
  }
  const target = Math.max(0, Math.min(1, progress)) * totalLen;
  let walked = 0;
  for (let i = 0; i < segLens.length; i++) {
    if (walked + segLens[i] >= target) {
      const t = segLens[i] === 0 ? 0 : (target - walked) / segLens[i];
      return [
        coords[i][0] + (coords[i + 1][0] - coords[i][0]) * t,
        coords[i][1] + (coords[i + 1][1] - coords[i][1]) * t,
      ];
    }
    walked += segLens[i];
  }
  return coords[coords.length - 1];
}

// Durak başına simüle edilen bekleme süresi (saniye)
const DWELL_SEC = 45;

// ── Interpolation: durak bekleme süresiyle birlikte ───────────────────────────
// Her ara durakta DWELL_SEC kadar bekler, sonra hareket eder.
function interpolatePosition(trip: BusTrip, timeSec: number): Coord | null {
  const { path, timestamps } = trip;
  if (!path.length || !timestamps.length) return null;
  if (timeSec < timestamps[0] || timeSec > timestamps[timestamps.length - 1]) return null;

  for (let i = 0; i < timestamps.length - 1; i++) {
    const arrivalAt = timestamps[i];
    const nextStop  = timestamps[i + 1];
    const gap = nextStop - arrivalAt;
    // Dwell: durma süresi segmentin %30'u veya DWELL_SEC, hangisi küçükse
    const dwell = Math.min(DWELL_SEC, gap * 0.3);
    const departureAt = arrivalAt + dwell;

    // Duruyorsa bu durakta kal
    if (timeSec >= arrivalAt && timeSec < departureAt) {
      return [path[i][0], path[i][1]];
    }
    // Hareket halindeyse interpolate et
    if (timeSec >= departureAt && timeSec <= nextStop) {
      const moveDur = nextStop - departureAt;
      const t = moveDur === 0 ? 1 : (timeSec - departureAt) / moveDur;
      return [
        path[i][0] + (path[i + 1][0] - path[i][0]) * t,
        path[i][1] + (path[i + 1][1] - path[i][1]) * t,
      ];
    }
  }
  return null;
}

// Route-geometry snap için progress hesabı da dwell içermeli
function tripProgressWithDwell(timestamps: number[], timeSec: number): number {
  const t0 = timestamps[0], t1 = timestamps[timestamps.length - 1];
  if (timeSec <= t0) return 0;
  if (timeSec >= t1) return 1;
  // Her segment için dwell-adjusted progress hesapla
  let totalMoveDur = 0;
  let elapsedMoveDur = 0;
  for (let i = 0; i < timestamps.length - 1; i++) {
    const gap = timestamps[i + 1] - timestamps[i];
    const dwell = Math.min(DWELL_SEC, gap * 0.3);
    const moveDur = gap - dwell;
    totalMoveDur += moveDur;
    const departureAt = timestamps[i] + dwell;
    if (timeSec >= departureAt && timeSec <= timestamps[i + 1]) {
      elapsedMoveDur += Math.max(0, timeSec - departureAt);
    } else if (timeSec > timestamps[i + 1]) {
      elapsedMoveDur += moveDur;
    }
  }
  return totalMoveDur === 0 ? 1 : Math.min(1, elapsedMoveDur / totalMoveDur);
}

// ── Sorted trip index (one-time build, O(log n) lookup) ───────────────────────
let cachedTripIndex: BusTrip[] | null = null;
let sortedTrips: BusTrip[] = [];
let maxTripDuration = 7200;

function ensureTripIndex(trips: BusTrip[]) {
  if (trips === cachedTripIndex) return;
  cachedTripIndex = trips;
  sortedTrips = [...trips].sort((a, b) => (a.timestamps[0] ?? 0) - (b.timestamps[0] ?? 0));
  let max = 0;
  for (const t of trips) {
    const dur = (t.timestamps[t.timestamps.length - 1] ?? 0) - (t.timestamps[0] ?? 0);
    if (dur > max) max = dur;
  }
  maxTripDuration = max || 7200;
}

function getWindowTrips(currentTimeSec: number): BusTrip[] {
  const lo = currentTimeSec - maxTripDuration;
  const hi = currentTimeSec;
  let left = 0, right = sortedTrips.length;
  while (left < right) {
    const mid = (left + right) >> 1;
    if ((sortedTrips[mid].timestamps[0] ?? 0) < lo) left = mid + 1;
    else right = mid;
  }
  const start = left;
  left = start; right = sortedTrips.length;
  while (left < right) {
    const mid = (left + right) >> 1;
    if ((sortedTrips[mid].timestamps[0] ?? 0) <= hi) left = mid + 1;
    else right = mid;
  }
  return sortedTrips.slice(start, left);
}

// ── Active buses helper ────────────────────────────────────────────────────────
let cachedRouteGeomMap: RouteGeomMap | null = null;
let cachedGeojsonRef: unknown = null;

function computeActiveBuses(
  trips: BusTrip[],
  currentTimeSec: number,
  geomMap: RouteGeomMap,
): ActiveBus[] {
  ensureTripIndex(trips);
  type Candidate = { progress: number; trip: BusTrip };
  const routeBest = new Map<string, Candidate>();

  for (const trip of getWindowTrips(currentTimeSec)) {
    const { timestamps } = trip;
    if (!timestamps.length) continue;
    const t0 = timestamps[0], t1 = timestamps[timestamps.length - 1];
    if (currentTimeSec < t0 || currentTimeSec > t1) continue;
    const duration = t1 - t0;
    if (duration < 900) continue;
    const progress = tripProgressWithDwell(trip.timestamps, currentTimeSec);
    const key = `${trip.route}|${trip.headsign}`;
    const existing = routeBest.get(key);
    if (!existing || Math.abs(progress - 0.5) < Math.abs(existing.progress - 0.5)) {
      routeBest.set(key, { progress, trip });
    }
  }

  const active: ActiveBus[] = [];
  for (const { progress, trip } of routeBest.values()) {
    const geom = geomMap.get(trip.route);
    let pos: Coord;
    if (geom) {
      pos = snapToRoute(progress, geom);
    } else {
      const fallback = interpolatePosition(trip, currentTimeSec);
      if (!fallback) continue;
      pos = fallback;
    }
    const heading = geom ? computeHeading(progress, geom) : 0;
    active.push({
      position: pos,
      route: trip.route,
      headsign: trip.headsign,
      color: trip.color,
      startTimeSec: trip.timestamps[0],
      endTimeSec: trip.timestamps[trip.timestamps.length - 1],
      progress,
      timestamps: trip.timestamps,
      heading,
    });
  }
  return active;
}

export function getActiveBuses(
  trips: BusTrip[],
  currentTimeSec: number,
  busRoutesGeojson?: GeoJSON.FeatureCollection | null,
): ActiveBus[] {
  if (busRoutesGeojson !== cachedGeojsonRef) {
    cachedGeojsonRef = busRoutesGeojson;
    cachedRouteGeomMap = buildRouteGeomMap(busRoutesGeojson);
  }
  return computeActiveBuses(trips, currentTimeSec, cachedRouteGeomMap ?? newRouteGeomMap());
}

// ── Main export ────────────────────────────────────────────────────────────────
export function createBusSimLayers(
  trips: BusTrip[],
  currentTimeSec: number,
  busRoutesGeojson?: GeoJSON.FeatureCollection | null,
  onBusClick?: (bus: ActiveBus) => void,
  zoom = 12,
  selectedBus?: ActiveBus | null,
  bounds?: Bounds,
): Layer[] {
  if (busRoutesGeojson !== cachedGeojsonRef) {
    cachedGeojsonRef = busRoutesGeojson;
    cachedRouteGeomMap = buildRouteGeomMap(busRoutesGeojson);
  }
  const geomMap = cachedRouteGeomMap ?? newRouteGeomMap();
  const allActive = computeActiveBuses(trips, currentTimeSec, geomMap);
  const active = bounds
    ? allActive.filter((b) => inBounds(b.position[0], b.position[1], bounds))
    : allActive;

  const selectedKey = selectedBus ? `${selectedBus.route}|${selectedBus.headsign}` : null;
  const isSelected = (d: ActiveBus) => selectedKey === `${d.route}|${d.headsign}`;
  const baseAlpha = zoom < 9 ? 0 : Math.round(40 + Math.max(0, Math.min(1, (zoom - 10) / 4)) * 215);

  const arrowUrl = buildArrowIcon("#2563eb");

  return [
    new IconLayer<ActiveBus>({
      id: "bus-sim-icons",
      data: active,
      pickable: true,
      sizeUnits: "pixels",
      getPosition: (d) => d.position,
      getIcon: (d) => ({
        url: getBusIcon(d.color),
        width: BUS_ICON_SIZE,
        height: BUS_ICON_SIZE,
        anchorY: BUS_ICON_SIZE / 2,
      }),
      getSize: (d) => isSelected(d) ? 52 : 28,
      getColor: (d) => isSelected(d)
        ? [255, 255, 255, 255]
        : [255, 255, 255, baseAlpha],
      onClick: (info) => {
        if (info.object && onBusClick) onBusClick(info.object);
        return true; // stop propagation to layers below
      },
      updateTriggers: {
        getPosition: currentTimeSec,
        data: currentTimeSec,
        getColor: [zoom, selectedKey],
        getSize: selectedKey,
      },
    }),
    // Direction arrow layer
    new IconLayer<ActiveBus>({
      id: "bus-sim-arrows",
      data: active,
      pickable: false,
      sizeUnits: "pixels",
      getPosition: (d) => d.position,
      getIcon: () => ({ url: arrowUrl, width: 40, height: 40, anchorY: 40 }),
      getSize: (d) => isSelected(d) ? 28 : 18,
      getAngle: (d) => -d.heading, // deck.gl rotates counter-clockwise
      getColor: (d) => [255, 255, 255, isSelected(d) ? 255 : Math.min(255, baseAlpha + 40)],
      updateTriggers: {
        getPosition: currentTimeSec,
        data: currentTimeSec,
        getAngle: currentTimeSec,
        getColor: [zoom, selectedKey],
        getSize: selectedKey,
      },
    }),
  ];
}
