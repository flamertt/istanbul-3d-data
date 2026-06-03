// Bus simulation worker — runs on a separate thread
// Receives trips once, then computes active buses on each tick

type Coord = [number, number];

interface BusTrip {
  route: string;
  headsign: string;
  color: [number, number, number];
  path: Coord[];
  timestamps: number[];
}

interface ActiveBus {
  position: Coord;
  route: string;
  headsign: string;
  color: [number, number, number];
  startTimeSec: number;
  endTimeSec: number;
  progress: number;
  timestamps: number[];
}

const DWELL_SEC = 45;

// ── Sorted trip index ──────────────────────────────────────────────────────────
let sortedTrips: BusTrip[] = [];
let maxTripDuration = 7200;
let geomMap: Map<string, Coord[]> = new Map();

function buildIndex(trips: BusTrip[]) {
  sortedTrips = [...trips].sort((a, b) => (a.timestamps[0] ?? 0) - (b.timestamps[0] ?? 0));
  let max = 0;
  for (const t of trips) {
    const dur = (t.timestamps[t.timestamps.length - 1] ?? 0) - (t.timestamps[0] ?? 0);
    if (dur > max) max = dur;
  }
  maxTripDuration = max || 7200;
}

function binarySlice(lo: number, hi: number): BusTrip[] {
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

function getWindowTrips(currentTimeSec: number): BusTrip[] {
  const lo = Math.max(0, currentTimeSec - maxTripDuration);
  const result = binarySlice(lo, currentTimeSec);
  // Gece yarısı sonrası: önceki günden devam eden seferleri de dahil et
  if (currentTimeSec < 10800) {
    const overnight = binarySlice(86400 - maxTripDuration, 86400);
    return [...result, ...overnight];
  }
  return result;
}

// ── Geometry ───────────────────────────────────────────────────────────────────
function snapToRoute(progress: number, coords: Coord[]): Coord {
  if (coords.length < 2) return coords[0];
  let totalLen = 0;
  const segs: number[] = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const dx = coords[i + 1][0] - coords[i][0];
    const dy = coords[i + 1][1] - coords[i][1];
    segs.push(Math.sqrt(dx * dx + dy * dy));
    totalLen += segs[segs.length - 1];
  }
  let target = Math.max(0, Math.min(1, progress)) * totalLen;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i]) {
      const t = segs[i] > 0 ? target / segs[i] : 0;
      return [coords[i][0] + t * (coords[i + 1][0] - coords[i][0]),
              coords[i][1] + t * (coords[i + 1][1] - coords[i][1])];
    }
    target -= segs[i];
  }
  return coords[coords.length - 1];
}

function interpolatePosition(trip: BusTrip, timeSec: number): Coord | null {
  const { path, timestamps } = trip;
  if (!path.length || !timestamps.length) return null;
  for (let i = 0; i < timestamps.length - 1; i++) {
    const dwell = Math.min(DWELL_SEC, (timestamps[i + 1] - timestamps[i]) * 0.3);
    const dep = timestamps[i] + dwell;
    if (timeSec >= timestamps[i] && timeSec < dep) return [path[i][0], path[i][1]];
    if (timeSec >= dep && timeSec <= timestamps[i + 1]) {
      const dur = timestamps[i + 1] - dep;
      const t = dur === 0 ? 1 : (timeSec - dep) / dur;
      return [path[i][0] + t * (path[i + 1][0] - path[i][0]),
              path[i][1] + t * (path[i + 1][1] - path[i][1])];
    }
  }
  return null;
}

function tripProgress(timestamps: number[], timeSec: number): number {
  const t0 = timestamps[0], t1 = timestamps[timestamps.length - 1];
  if (timeSec <= t0) return 0;
  if (timeSec >= t1) return 1;
  let totalMove = 0, elapsed = 0;
  for (let i = 0; i < timestamps.length - 1; i++) {
    const gap = timestamps[i + 1] - timestamps[i];
    const dwell = Math.min(DWELL_SEC, gap * 0.3);
    const move = gap - dwell;
    totalMove += move;
    const dep = timestamps[i] + dwell;
    if (timeSec >= dep && timeSec <= timestamps[i + 1]) elapsed += timeSec - dep;
    else if (timeSec > timestamps[i + 1]) elapsed += move;
  }
  return totalMove === 0 ? 1 : Math.min(1, elapsed / totalMove);
}

// ── Compute active buses ───────────────────────────────────────────────────────
function computeActive(currentTimeSec: number): ActiveBus[] {
  type Candidate = { progress: number; trip: BusTrip };
  const best = new Map<string, Candidate>();

  for (const trip of getWindowTrips(currentTimeSec)) {
    const { timestamps } = trip;
    if (!timestamps.length) continue;
    const t0 = timestamps[0], t1 = timestamps[timestamps.length - 1];
    // Gece yarısı geçiş: sefer geç başladıysa ve şimdiki saat erken sabahsa, saat üzerine 86400 ekle
    const adjTime = (t0 > 75600 && currentTimeSec < 10800) ? currentTimeSec + 86400 : currentTimeSec;
    if (adjTime < t0 || adjTime > t1) continue;
    if (t1 - t0 < 900) continue;
    const progress = tripProgress(timestamps, adjTime);
    const key = trip.route;
    const existing = best.get(key);
    if (!existing || Math.abs(progress - 0.5) < Math.abs(existing.progress - 0.5)) {
      best.set(key, { progress, trip });
    }
  }

  const active: ActiveBus[] = [];
  for (const { progress, trip } of best.values()) {
    const geom = geomMap.get(trip.route);
    let pos: Coord;
    const t0 = trip.timestamps[0];
    const adjTime = (t0 > 75600 && currentTimeSec < 10800) ? currentTimeSec + 86400 : currentTimeSec;
    if (geom) pos = snapToRoute(progress, geom);
    else {
      const fb = interpolatePosition(trip, adjTime);
      if (!fb) continue;
      pos = fb;
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
  return active;
}

// ── Message handler ────────────────────────────────────────────────────────────
self.onmessage = (e: MessageEvent) => {
  const msg = e.data as
    | { type: 'init'; trips: BusTrip[]; geomEntries: [string, Coord[]][] }
    | { type: 'compute'; currentTimeSec: number };

  if (msg.type === 'init') {
    buildIndex(msg.trips);
    geomMap = new Map(msg.geomEntries);
    self.postMessage({ type: 'ready' });
  } else if (msg.type === 'compute') {
    const activeBuses = computeActive(msg.currentTimeSec);
    self.postMessage({ type: 'result', activeBuses });
  }
};
