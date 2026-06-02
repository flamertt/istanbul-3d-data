import { ColumnLayer, IconLayer } from "deck.gl";
import type { Layer } from "deck.gl";
import type { IsparkLot } from "../types";
import { occupancyToRgb } from "../lib/colors";

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function getOccupancyRatio(lot: IsparkLot): number {
  if (lot.capacity <= 0) return -1; // no data
  // capacity doluluk oranı = (capacity - empty) / capacity
  const occ = (lot.capacity - lot.emptyCapacity) / lot.capacity;
  return clamp01(occ);
}

function getIsOpenOpacity(lot: IsparkLot): number {
  return lot.isOpen ? 220 : 90;
}

function stripDiacritics(s: string): string {
  // normalize('NFD') + combining marks temizliği (ör. “Açık” -> “Acik”)
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getParkTypeKey(lot: IsparkLot): "open" | "closed" | "road" | "other" {
  const raw = typeof lot.parkType === "string" ? lot.parkType : "";
  const t = stripDiacritics(raw).toLowerCase();
  if (t.includes("kapali")) return "closed";
  if (t.includes("acik")) return "open";
  if (t.includes("yol")) return "road";
  return "other";
}

function getColumnElevation(lot: IsparkLot): number {
  const parkKey = getParkTypeKey(lot);
  // Base elevation based on type for visual distinction
  const baseByType = parkKey === "closed" ? 20 : parkKey === "open" ? 15 : parkKey === "road" ? 12 : 15;

  // Kapasiteye göre yükseklik — görsel ölçek için küçültüldü
  const capacityHeight = Math.min(lot.capacity * 0.15, 80);

  return baseByType + capacityHeight;
}

// Cache keyed by "r,g,b,closed"
const iconCache = new Map<string, string>();

// Landmark stiliyle aynı: koyu daire + doluluk renkli stroke + beyaz P harfi
function buildIsparkIcon(r: number, g: number, b: number, isOpen: boolean): string {
  const key = `${r},${g},${b},${isOpen}`;
  if (iconCache.has(key)) return iconCache.get(key)!;
  const stroke = `rgb(${r},${g},${b})`;
  const opacity = isOpen ? 1 : 0.5;
  // P harfi - parking sembolü
  const pPath = `<path d="M36 28h20c12 0 22 7 22 20s-10 20-22 20H46v16H36V28zm10 10v20h9c7 0 13-3 13-10s-6-10-13-10h-9z" fill="white"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" opacity="${opacity}">
    <circle cx="50" cy="50" r="46" fill="#030712" stroke="${stroke}" stroke-width="8"/>
    ${pPath}
  </svg>`;
  const url = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  iconCache.set(key, url);
  return url;
}

function getIsparkIconUrl(lot: IsparkLot): string {
  const occ = getOccupancyRatio(lot);
  const [r, g, b] = occ < 0 ? [107, 114, 128] : occupancyToRgb(occ);
  return buildIsparkIcon(r, g, b, lot.isOpen);
}

export function createIsparkLayers(lots: IsparkLot[], zoom: number): Layer[] {
  const showColumns = zoom >= 13;
  const layers: Layer[] = [];
  if (!lots.length) return layers;

  if (showColumns) {
    layers.push(
      new ColumnLayer<IsparkLot>({
        id: "ispark-columns",
        data: lots,
        diskResolution: 20,
        radius: 7,
        radiusUnits: "meters",
        extruded: true,
        stroked: false,
        getPosition: (d) => [d.lng, d.lat],
        getElevation: (d) => getColumnElevation(d),
        getFillColor: (d) => {
          const occ = getOccupancyRatio(d);
          if (occ < 0) return [107, 114, 128, 180];
          const [r, g, b] = occupancyToRgb(occ);
          return [r, g, b, getIsOpenOpacity(d)];
        },
        pickable: true,
        autoHighlight: false,
        transitions: undefined,
        updateTriggers: {},
      }),
    );
  }

  layers.push(
    new IconLayer<IsparkLot>({
      id: "ispark-icons",
      data: lots,
      pickable: true,
      billboard: true,
      sizeUnits: "pixels",
      getPosition: (d) =>
        showColumns
          ? [d.lng, d.lat, getColumnElevation(d) + 60]
          : [d.lng, d.lat],
      getIcon: (d) => ({
        url: getIsparkIconUrl(d),
        width: 100,
        height: 100,
        anchorY: 50,
      }),
      getSize: 14,
      getColor: [255, 255, 255],
      updateTriggers: { getPosition: zoom },
    }),
  );

  return layers;
}

