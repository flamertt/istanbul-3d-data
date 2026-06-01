import { ColumnLayer, IconLayer, ScatterplotLayer } from "deck.gl";
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
  const baseByType = parkKey === "closed" ? 50 : parkKey === "open" ? 40 : parkKey === "road" ? 30 : 40;

  // Kapasiteye göre yükseklik; katsayıyı 0.8'e çektik, sınırı 800m yaptık.
  const capacityHeight = Math.min(lot.capacity * 0.8, 800);

  return baseByType + capacityHeight;
}

const ISPARK_ICON_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 112 112">
      <rect x="8" y="8" width="96" height="96" rx="24" fill="#1d4ed8" stroke="#e2e8f0" stroke-width="6"/>
      <path d="M36 28h20c12 0 22 7 22 20s-10 20-22 20H46v16H36V28zm10 10v20h9c7 0 13-3 13-10s-6-10-13-10h-9z" fill="#ffffff"/>
    </svg>`,
  );

export function createIsparkLayers(lots: IsparkLot[], zoom: number): Layer[] {
  const showColumns = zoom >= 11;
  const showColumnIcons = zoom >= 12;

  const layers: Layer[] = [];

  if (!lots.length) return layers;

  if (showColumns) {
    layers.push(
      new ColumnLayer<IsparkLot>({
        id: "ispark-columns",
        data: lots,
        // Daha düşük disk çözünürlüğü daha az vertex üretir.
        diskResolution: 20,
        radius: 30,
        radiusUnits: "meters",
        extruded: true,
        // Stroke, fragment maliyetini artırıyor; performans için kapatıyoruz.
        stroked: false,
        getPosition: (d) => [d.lng, d.lat],
        getElevation: (d) => getColumnElevation(d),
        getFillColor: (d) => {
          const occ = getOccupancyRatio(d);
          if (occ < 0) return [107, 114, 128, 180];
          const [r, g, b] = occupancyToRgb(occ);
          return [r, g, b, getIsOpenOpacity(d)];
        },
        getLineColor: (d) => {
          const occ = getOccupancyRatio(d);
          if (occ < 0) return [160, 160, 160, 110];
          const [r, g, b] = occupancyToRgb(occ);
          return [r, g, b, 200];
        },
        // Click için pickable yeterli; autoHighlight hover/picking işini sürekli tetikleyebiliyor.
        pickable: true,
        autoHighlight: false,
        highlightColor: [255, 255, 255, 90],
        // Veri gelince uzun geçiş animasyonları performansı düşürebilir.
        transitions: undefined,
        updateTriggers: {},
      }),
    );
    if (showColumnIcons) {
      layers.push(
        new IconLayer<IsparkLot>({
          id: "ispark-column-icons",
          data: lots,
          pickable: true,
          billboard: true,
          sizeUnits: "meters",
          getIcon: () => ({
            url: ISPARK_ICON_URL,
            width: 112,
            height: 112,
            anchorY: 112,
          }),
          getPosition: (d) => [d.lng, d.lat, getColumnElevation(d) + 14],
          getSize: 90,
          getColor: (d) => (d.isOpen ? [255, 255, 255, 230] : [203, 213, 225, 180]),
          updateTriggers: {},
        }),
      );
    }

  } else {
    layers.push(
      new ScatterplotLayer<IsparkLot>({
        id: "ispark-scatter",
        data: lots,
        pickable: true,
        autoHighlight: false,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: 24,
        radiusUnits: "meters",
        radiusMinPixels: 3,
        radiusMaxPixels: 24,
        stroked: false,
        getFillColor: (d) => {
          const occ = getOccupancyRatio(d);
          if (occ < 0) return [107, 114, 128, 160];
          const [r, g, b] = occupancyToRgb(occ);
          return [r, g, b, getIsOpenOpacity(d)];
        },
        highlightColor: [255, 255, 255, 120],
        updateTriggers: {},
      }),
    );
  }

  return layers;
}

