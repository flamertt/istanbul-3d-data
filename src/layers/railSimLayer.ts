import { IconLayer, PathLayer } from "@deck.gl/layers";
import { PathStyleExtension } from "@deck.gl/extensions";
import type { Layer } from "deck.gl";
import type { RailRoute, RailSimData } from "../hooks/useRailSim";
import { buildCircleIcon, buildArrowIcon, computeHeading, ICON_PATHS } from "../lib/iconBuilder";
import { type Bounds, inBounds } from "../lib/viewportBounds";

type Coord = [number, number];

export interface ActiveVehicle {
  position: Coord;
  routeKey: string;
  name: string;
  headsign: string;
  color: [number, number, number];
  kind: "metro" | "marmaray" | "tram" | "funicular" | "ferry";
  progress: number;
  t0: number;
  endSec: number;
  heading: number; // degrees clockwise from north
}

// ── Icons — circle style matching landmark icons ───────────────────────────────
// Sabit renkler — her araç türü farklı border rengi
const RAIL_ICONS: Record<string, string> = {
  metro:     buildCircleIcon(ICON_PATHS.metro,    "#eab308", 2.4), // sarı
  marmaray:  buildCircleIcon(ICON_PATHS.marmaray, "#dc2626", 2.4), // kırmızı
  tram:      buildCircleIcon(ICON_PATHS.tram,     "#0891b2", 2.4), // cyan
  funicular: buildCircleIcon(ICON_PATHS.tram,     "#7c3aed", 2.4), // mor
  ferry:     buildCircleIcon(ICON_PATHS.ferry,    "#0e7490", 2.4), // deniz mavisi
};

function getIcon(kind: string, _color: [number, number, number]): string {
  return RAIL_ICONS[kind] ?? RAIL_ICONS.metro;
}

// ── Geometry helpers ───────────────────────────────────────────────────────────
function snapToRoute(progress: number, coords: Coord[]): Coord {
  if (coords.length < 2) return coords[0];
  let totalLen = 0;
  const segs: number[] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const dx = coords[i + 1][0] - coords[i][0];
    const dy = coords[i + 1][1] - coords[i][1];
    const l = Math.sqrt(dx * dx + dy * dy);
    segs.push(l);
    totalLen += l;
  }
  let target = Math.max(0, Math.min(1, progress)) * totalLen;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i]) {
      const t = segs[i] > 0 ? target / segs[i] : 0;
      return [
        coords[i][0] + t * (coords[i + 1][0] - coords[i][0]),
        coords[i][1] + t * (coords[i + 1][1] - coords[i][1]),
      ];
    }
    target -= segs[i];
  }
  return coords[coords.length - 1];
}

// ── Active vehicle computation ─────────────────────────────────────────────────
export function getActiveVehicles(
  data: RailSimData,
  currentTimeSec: number,
  filter: (kind: string) => boolean,
): ActiveVehicle[] {
  const { routes, trips } = data;
  const active: ActiveVehicle[] = [];

  // One vehicle per route_key at the position closest to 50% progress
  // (shows the "representative" train — avoids overwhelming the screen)
  // Ferry'lerde her iki yön (|0 ve |1) ayrı araç olarak görünmesin,
  // route adına göre grupla (örn. "BSK-HLC" için tek vapur)
  type Best = { progress: number; t0: number; rk: string };
  const best = new Map<string, Best>();

  for (const trip of trips) {
    const route = routes[trip.rk];
    if (!route || !filter(route.kind)) continue;
    const end = trip.t0 + route.duration_secs;
    // Gece yarısı geçiş: sefer geç başladıysa ve şimdiki saat erken sabahsa
    const adjTime = (trip.t0 > 75600 && currentTimeSec < 10800) ? currentTimeSec + 86400 : currentTimeSec;
    if (adjTime < trip.t0 || adjTime > end) continue;
    const progress = (adjTime - trip.t0) / route.duration_secs;
    // Ferry'lerde yön suffix'ini kaldır: "BSK-HLC|0" → "BSK-HLC"
    const groupKey = route.kind === 'ferry' ? route.name : trip.rk;
    const prev = best.get(groupKey);
    if (!prev || Math.abs(progress - 0.5) < Math.abs(prev.progress - 0.5)) {
      best.set(groupKey, { progress, t0: trip.t0, rk: trip.rk });
    }
  }

  for (const [, { progress, t0, rk }] of best) {
    const route = routes[rk];
    const pos = snapToRoute(progress, route.path);
    const heading = computeHeading(progress, route.path);
    active.push({
      position: pos,
      routeKey: rk,
      name: route.name,
      headsign: route.headsign,
      color: route.color,
      kind: route.kind,
      progress,
      t0,
      endSec: t0 + route.duration_secs,
      heading,
    });
  }

  return active;
}

// ── Rail route lines (ferry / metro / marmaray) ────────────────────────────────
type RouteLineEntry = { rk: string; name: string; path: Coord[]; kind: string };

const routeLinesCache = new Map<string, RouteLineEntry[]>(); // kind → entries
let routeLineDataRef: RailSimData | null = null;

function getRouteLines(data: RailSimData, kind: string): RouteLineEntry[] {
  if (data !== routeLineDataRef) {
    routeLinesCache.clear();
    routeLineDataRef = data;
  }
  if (routeLinesCache.has(kind)) return routeLinesCache.get(kind)!;
  const seen = new Set<string>();
  const result = Object.entries(data.routes)
    .filter(([rk, r]) => r.kind === kind && rk.endsWith("|0"))
    .filter(([, r]) => { if (seen.has(r.name)) return false; seen.add(r.name); return true; })
    .map(([rk, r]) => ({ rk, name: r.name, path: r.path, kind: r.kind }));
  routeLinesCache.set(kind, result);
  return result;
}

export function createFerryRouteLayers(
  data: RailSimData,
  ferryEnabled: boolean,
  selectedVehicle?: ActiveVehicle | null,
): Layer[] {
  if (!ferryEnabled) return [];
  const lines = getRouteLines(data, "ferry");
  if (!lines.length) return [];

  // Seçili vapur varsa sadece onu göster, diğerleri kaybolsun
  const selectedName = selectedVehicle?.kind === "ferry" ? selectedVehicle.name : null;
  const visible = selectedName ? lines.filter((l) => l.name === selectedName) : lines;
  if (!visible.length) return [];

  return [
    new PathLayer({
      id: "ferry-route-lines",
      data: visible,
      pickable: false,
      getPath: (d) => d.path as unknown as number[][],
      getColor: selectedName ? [14, 116, 144, 220] : [14, 116, 144, 100],
      getWidth: selectedName ? 3 : 2,
      widthUnits: "pixels",
      widthMinPixels: 1,
      getDashArray: [8, 5],
      dashJustified: true,
      extensions: [new PathStyleExtension({ dash: true })],
      updateTriggers: { getColor: selectedName, getWidth: selectedName, data: selectedName },
    }),
  ];
}

export function createRailSelectedRouteLayers(
  data: RailSimData,
  selectedVehicle: ActiveVehicle | null,
): Layer[] {
  if (!selectedVehicle) return [];
  const { kind, name } = selectedVehicle;
  if (kind !== "metro" && kind !== "marmaray" && kind !== "funicular" && kind !== "tram") return [];

  const lines = getRouteLines(data, kind).filter((l) => l.name === name);
  if (!lines.length) return [];

  const color: [number, number, number, number] =
    kind === "metro" ? [234, 179, 8, 220] :
    kind === "marmaray" ? [220, 38, 38, 220] :
    [8, 145, 178, 220];

  return [
    new PathLayer({
      id: "rail-selected-route-line",
      data: lines,
      pickable: false,
      getPath: (d) => d.path as unknown as number[][],
      getColor: color,
      getWidth: 3,
      widthUnits: "pixels",
      widthMinPixels: 2,
      getDashArray: [10, 4],
      dashJustified: true,
      extensions: [new PathStyleExtension({ dash: true })],
      updateTriggers: { data: `${name}|${kind}` },
    }),
  ];
}

// ── Layer builder ──────────────────────────────────────────────────────────────
export function createRailSimLayers(
  data: RailSimData,
  currentTimeSec: number,
  filter: (kind: string) => boolean,
  onVehicleClick?: (v: ActiveVehicle) => void,
  zoom = 12,
  selectedVehicle?: ActiveVehicle | null,
  bounds?: Bounds,
): Layer[] {
  const allActive = getActiveVehicles(data, currentTimeSec, filter);
  const active = bounds
    ? allActive.filter((v) => inBounds(v.position[0], v.position[1], bounds))
    : allActive;
  if (active.length === 0) return [];

  const selectedKey = selectedVehicle?.routeKey ?? null;
  const baseAlpha = zoom < 9 ? 0 : Math.round(40 + Math.max(0, Math.min(1, (zoom - 10) / 4)) * 215);

  // Kind-specific arrow colors
  const kindColor: Record<string, string> = {
    metro: "#eab308", marmaray: "#dc2626", tram: "#0891b2", funicular: "#7c3aed", ferry: "#0e7490"
  };

  return [
    new IconLayer<ActiveVehicle>({
      id: "rail-sim-icons",
      data: active,
      pickable: true,
      sizeUnits: "pixels",
      getPosition: (d) => d.position,
      getIcon: (d) => ({
        url: getIcon(d.kind, d.color),
        width: 100,
        height: 100,
        anchorY: 50,
      }),
      getSize: (d) => d.routeKey === selectedKey ? 56 : 32,
      getColor: (d) => d.routeKey === selectedKey
        ? [255, 255, 255, 255]
        : [255, 255, 255, baseAlpha],
      onClick: (info) => {
        if (info.object && onVehicleClick) onVehicleClick(info.object);
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
    new IconLayer<ActiveVehicle>({
      id: "rail-sim-arrows",
      data: active,
      pickable: false,
      sizeUnits: "pixels",
      getPosition: (d) => d.position,
      getIcon: (d) => {
        const col = kindColor[d.kind] ?? "#ffffff";
        return { url: buildArrowIcon(col), width: 40, height: 40, anchorY: 40 };
      },
      getSize: (d) => d.routeKey === selectedKey ? 30 : 20,
      getAngle: (d) => -d.heading,
      getColor: (d) => [255, 255, 255, d.routeKey === selectedKey ? 255 : Math.min(255, baseAlpha + 40)],
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
