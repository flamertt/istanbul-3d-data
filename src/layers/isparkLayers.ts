import { ColumnLayer, ScatterplotLayer } from "deck.gl";
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

export function createIsparkLayers(lots: IsparkLot[], zoom: number): Layer[] {
  // 264 adet kolon için GPU yükü yaratabiliyor; daha akıcı render için biraz aşağı çekiyoruz.
  const maxElevationMeters = 420;
  const showColumns = zoom >= 11;

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
        getElevation: (d) => {
          const occ = getOccupancyRatio(d);
          const parkKey = getParkTypeKey(d);
          // Veri yoksa bile görünür minimum yükseklik (görsel karışıklığı azaltır).
          if (occ < 0) return parkKey === "closed" ? 65 : parkKey === "open" ? 55 : parkKey === "road" ? 45 : 55;

          const baseByType = parkKey === "closed" ? 120 : parkKey === "open" ? 95 : parkKey === "road" ? 80 : 95;
          const scaleByType = parkKey === "closed" ? 1.0 : parkKey === "open" ? 0.9 : parkKey === "road" ? 0.7 : 0.9;

          // Always give a readable minimum height, then scale with occupancy.
          const scaled = occ > 0 ? occ * maxElevationMeters * scaleByType : 0;
          return baseByType + scaled;
        },
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

