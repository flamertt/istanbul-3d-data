import { IconLayer } from "@deck.gl/layers";
import type { Layer } from "deck.gl";
import type { BusTrip } from "../hooks/useBusSim";

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
}

// ── Icon builder ───────────────────────────────────────────────────────────────
const iconCache = new Map<string, string>();
function getBusIcon(color: [number, number, number]): string {
  const key = color.join(",");
  if (iconCache.has(key)) return iconCache.get(key)!;
  const stroke = `rgb(${color[0]},${color[1]},${color[2]})`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="46" fill="#030712" stroke="${stroke}" stroke-width="8"/>
    <g transform="translate(22,26)" stroke="none">
      <rect x="2" y="5" width="52" height="28" rx="6" fill="white"/>
      <rect x="6" y="10" width="19" height="10" rx="2" fill="${stroke}" opacity="0.8"/>
      <rect x="32" y="10" width="19" height="10" rx="2" fill="${stroke}" opacity="0.8"/>
      <circle cx="15" cy="36" r="5" fill="white"/>
      <circle cx="41" cy="36" r="5" fill="white"/>
      <rect x="3" y="2" width="50" height="5" rx="2.5" fill="white" opacity="0.6"/>
    </g>
  </svg>`;
  const url = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  iconCache.set(key, url);
  return url;
}

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
const DWELL_SEC = 90;

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

// ── Main export ────────────────────────────────────────────────────────────────
let cachedRouteGeomMap: RouteGeomMap | null = null;
let cachedGeojsonRef: unknown = null;

export function createBusSimLayers(
  trips: BusTrip[],
  currentTimeSec: number,
  busRoutesGeojson?: GeoJSON.FeatureCollection | null,
  onBusClick?: (bus: ActiveBus) => void,
  zoom = 12,
): Layer[] {
  // Re-build geom map only when data reference changes
  if (busRoutesGeojson !== cachedGeojsonRef) {
    cachedGeojsonRef = busRoutesGeojson;
    cachedRouteGeomMap = buildRouteGeomMap(busRoutesGeojson);
  }
  const geomMap = cachedRouteGeomMap ?? newRouteGeomMap();

  // Compute one representative bus per route+headsign
  // Among all active trips for a route, pick the one closest to 50% progress
  type Candidate = { progress: number; trip: BusTrip };
  const routeBest = new Map<string, Candidate>();

  for (const trip of trips) {
    const { timestamps } = trip;
    if (!timestamps.length) continue;
    const t0 = timestamps[0], t1 = timestamps[timestamps.length - 1];
    if (currentTimeSec < t0 || currentTimeSec > t1) continue;
    const duration = t1 - t0;
    if (duration < 900) continue; // < 15 dakikalık çok kısa seferleri atla
    const progress = tripProgressWithDwell(trip.timestamps, currentTimeSec);
    const key = `${trip.route}|${trip.headsign}`;
    const existing = routeBest.get(key);
    // Prefer bus closest to 50% (mid-route is most visible)
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
    active.push({
      position: pos,
      route: trip.route,
      headsign: trip.headsign,
      color: trip.color,
      startTimeSec: trip.timestamps[0],
      endTimeSec: trip.timestamps[trip.timestamps.length - 1],
      progress,
      timestamps: trip.timestamps,
    });
  }

  return [
    new IconLayer<ActiveBus>({
      id: "bus-sim-icons",
      data: active,
      pickable: true,
      sizeUnits: "pixels",
      getPosition: (d) => d.position,
      getIcon: (d) => ({
        url: getBusIcon(d.color),
        width: 100,
        height: 100,
        anchorY: 50,
      }),
      getSize: 28,
      // Uzaktan soluk, yakınlaştıkça belirginleşir
      getColor: zoom < 9 ? [0, 0, 0, 0] : [255, 255, 255, Math.round(40 + Math.max(0, Math.min(1, (zoom - 10) / 4)) * 215)],
      onClick: (info) => {
        if (info.object && onBusClick) onBusClick(info.object);
      },
      updateTriggers: { getPosition: currentTimeSec, data: currentTimeSec, getColor: zoom },
    }),
  ];
}
