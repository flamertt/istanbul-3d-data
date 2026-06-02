import { GeoJsonLayer, IconLayer } from "deck.gl";
import type { Layer } from "deck.gl";
import { POI_ICON_URLS } from "../lib/poiIcons";

type FeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>;

export type TurkeyPoiKind =
  | "bus_stop"
  | "bus_route"
  | "rail_line"
  | "rail_station"
  | "bike_lane"
  | "micromobility_park"
  | "ev_charging_station"
  | "green_area"
  | "toilet"
  | "taxi_stop"
  | "taxi_dolmus_stop"
  | "minibus_stop"
  | "sea_station"
  | "kent_lokantasi"
  | "sosyal_tesis";

export interface TurkeyPoiPoint {
  kind: TurkeyPoiKind;
  position: [number, number]; // [lng, lat]
  title: string;
  subtitle?: string;
  extra?: string;
  /** Footprint ring in [lng, lat], closed (ilk=son) */
  footprint: [number, number][];
}

type Properties = Record<string, unknown>;
type RgbaColor = [number, number, number, number];
type PointPoiKind =
  | "bus_stop"
  | "rail_station"
  | "ev_charging_station"
  | "micromobility_park"
  | "toilet"
  | "taxi_stop"
  | "taxi_dolmus_stop"
  | "minibus_stop"
  | "sea_station"
  | "kent_lokantasi"
  | "sosyal_tesis";

interface PoiShapeConfig {
  sides: number;
  radiusMeters: number;
  rotationDeg: number;
  elevationMeters: number;
}

const POI_SHAPE_CONFIG: Record<PointPoiKind, PoiShapeConfig> = {
  bus_stop: { sides: 4, radiusMeters: 5.8, rotationDeg: 45, elevationMeters: 50 },
  rail_station: { sides: 6, radiusMeters: 9.5, rotationDeg: 0, elevationMeters: 86 },
  ev_charging_station: { sides: 6, radiusMeters: 6.5, rotationDeg: 0, elevationMeters: 55 },
  micromobility_park: { sides: 8, radiusMeters: 9.2, rotationDeg: 22.5, elevationMeters: 68 },
  toilet: { sides: 4, radiusMeters: 4.8, rotationDeg: 45, elevationMeters: 36 },
  taxi_stop: { sides: 5, radiusMeters: 7.2, rotationDeg: 0, elevationMeters: 54 },
  taxi_dolmus_stop: { sides: 6, radiusMeters: 6.6, rotationDeg: 20, elevationMeters: 46 },
  minibus_stop: { sides: 6, radiusMeters: 7.8, rotationDeg: 10, elevationMeters: 66 },
  sea_station: { sides: 5, radiusMeters: 7.4, rotationDeg: 0, elevationMeters: 58 },
  kent_lokantasi: { sides: 4, radiusMeters: 5.5, rotationDeg: 0, elevationMeters: 44 },
  sosyal_tesis: { sides: 4, radiusMeters: 5.5, rotationDeg: 0, elevationMeters: 44 },
};

function readFirstString(props: Properties | undefined, keys: string[]): string {
  if (!props) return "";
  for (const k of keys) {
    const v = props[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return "";
}

function buildFootprintForKind(kind: PointPoiKind, position: [number, number]): [number, number][] {
  const cfg = POI_SHAPE_CONFIG[kind];
  return buildFootprint(position[1], position[0], cfg.sides, cfg.radiusMeters, cfg.rotationDeg);
}

function extractPointFeatures(fc: FeatureCollection) {
  return fc.features.flatMap((feature) => {
    const geom = feature.geometry;
    if (!geom) return [];
    const properties = (feature.properties ?? {}) as Properties;

    if (geom.type === "Point") {
      const [lng, lat] = geom.coordinates;
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [{ position: [lng, lat] as [number, number], properties }];
      return [];
    }

    if (geom.type === "MultiPoint") {
      return geom.coordinates
        .map((c) => {
          const [lng, lat] = c;
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          return { position: [lng, lat] as [number, number], properties };
        })
        .filter((x): x is { position: [number, number]; properties: Properties } => x !== null);
    }

    return [];
  });
}

// WeakMap cache: GeoJSON referansı değişmediğinde extract tekrar çalışmaz
const extractCache = new WeakMap<FeatureCollection, TurkeyPoiPoint[]>();
function cached(fc: FeatureCollection, fn: (f: FeatureCollection) => TurkeyPoiPoint[]): TurkeyPoiPoint[] {
  if (extractCache.has(fc)) return extractCache.get(fc)!;
  const result = fn(fc);
  extractCache.set(fc, result);
  return result;
}

function extractBusStops(fc: FeatureCollection): TurkeyPoiPoint[] {
  return extractPointFeatures(fc).map(({ position, properties }) => ({
    kind: "bus_stop",
    position,
    title: readFirstString(properties, ["ADI", "Adı", "Name"]),
    subtitle: readFirstString(properties, ["YON_BILGISI", "ILCEID", "ILCE", "MAHALLEID"]),
    extra: readFirstString(properties, ["DURAK_KODU", "DURAK_TIPI"]),
    footprint: buildFootprintForKind("bus_stop", position),
  }));
}

function extractRailStations(fc: FeatureCollection): TurkeyPoiPoint[] {
  return extractPointFeatures(fc).map(({ position, properties }) => ({
    kind: "rail_station",
    position,
    title: readFirstString(properties, ["ISTASYON", "Proje_Adi", "PROJE_ADI", "Name"]),
    subtitle: readFirstString(properties, ["PROJE_ASAMA", "HAT_TURU"]),
    extra: readFirstString(properties, ["MUDURLUK", "PROJE_ADI"]),
    footprint: buildFootprintForKind("rail_station", position),
  }));
}

function extractEvChargingStations(fc: FeatureCollection): TurkeyPoiPoint[] {
  return extractPointFeatures(fc).map(({ position, properties }) => ({
    kind: "ev_charging_station",
    position,
    title: readFirstString(properties, ["AD", "ADRES", "MARKA_TESCIL_BELGESI"]),
    subtitle: readFirstString(properties, ["HIZMET_SEKLI", "AGIL_ISLETMECISI_UNVAN"]),
    extra: readFirstString(properties, ["ISTASYON_NO", "DAGITIM_SIRKETI_LISANS_NO"]),
    footprint: buildFootprintForKind("ev_charging_station", position),
  }));
}

function extractMicromobilityParks(fc: FeatureCollection): TurkeyPoiPoint[] {
  return extractPointFeatures(fc).map(({ position, properties }) => ({
    kind: "micromobility_park",
    position,
    title: readFirstString(properties, ["Park_Alani", "Park Alanı"]),
    subtitle: readFirstString(properties, ["Ilce", "ILCE", "Bolge", "BOLGE"]),
    extra: readFirstString(properties, ["Park_Tipi", "Park Tipi"]),
    footprint: buildFootprintForKind("micromobility_park", position),
  }));
}

function extractSimplePoints(fc: FeatureCollection, kind: string): TurkeyPoiPoint[] {
  return extractPointFeatures(fc).map(({ position, properties }) => ({
    kind: kind as TurkeyPoiPoint["kind"],
    position,
    title: readFirstString(properties, ["name", "TESİS ADI", "Tesis Adı", "ADI"]) ?? kind,
    subtitle: readFirstString(properties, ["address", "ADRES", "İlçe"]),
    footprint: buildFootprintForKind("toilet", position),
  }));
}

function extractToilets(fc: FeatureCollection): TurkeyPoiPoint[] {
  return extractPointFeatures(fc).map(({ position, properties }) => ({
    kind: "toilet",
    position,
    title: readFirstString(properties, ["MAHAL_ADI", "TUVALET_DURUM", "TUVALET_TIP"]),
    subtitle: readFirstString(properties, ["ILCE", "HIZMET_YERI"]),
    extra: readFirstString(properties, ["TUVALET_TIP", "BAKIM_ODASI"]),
    footprint: buildFootprintForKind("toilet", position),
  }));
}

function extractTaxiStops(fc: FeatureCollection): TurkeyPoiPoint[] {
  return extractPointFeatures(fc).map(({ position, properties }) => ({
    kind: "taxi_stop",
    position,
    title: readFirstString(properties, ["DURAK_ADI", "DURAKADI", "ADI", "Name"]),
    subtitle: readFirstString(properties, ["ACIKLAMA", "ILCE", "IL", "MAHALLE"]),
    extra: readFirstString(properties, ["ACIKLAMA", "DURAK_KODU", "Tip"]),
    footprint: buildFootprintForKind("taxi_stop", position),
  }));
}

function extractTaxiDolmusStops(fc: FeatureCollection): TurkeyPoiPoint[] {
  return extractPointFeatures(fc).map(({ position, properties }) => ({
    kind: "taxi_dolmus_stop",
    position,
    title: readFirstString(properties, ["DURAK_ADI", "ADI", "Name"]),
    subtitle: readFirstString(properties, ["ACIKLAMA", "HAT", "ROTA"]),
    extra: "",
    footprint: buildFootprintForKind("taxi_dolmus_stop", position),
  }));
}

function extractMinibusStops(fc: FeatureCollection): TurkeyPoiPoint[] {
  return extractPointFeatures(fc).map(({ position, properties }) => ({
    kind: "minibus_stop",
    position,
    title: readFirstString(properties, ["DURAK_ADI", "DURAKADI", "ADI", "Name"]),
    subtitle: readFirstString(properties, ["ACIKLAMA", "ILCE", "IL", "MAHALLE"]),
    extra: "",
    footprint: buildFootprintForKind("minibus_stop", position),
  }));
}

function extractSeaStations(fc: FeatureCollection): TurkeyPoiPoint[] {
  return extractPointFeatures(fc).map(({ position, properties }) => ({
    kind: "sea_station",
    position,
    title: readFirstString(properties, ["ISKELE_ADI", "AD", "ADI", "Name"]),
    subtitle: readFirstString(properties, ["ILCE", "MAHALLE", "BOLGE"]),
    extra: "",
    footprint: buildFootprintForKind("sea_station", position),
  }));
}

function metersToDegLat(meters: number): number {
  return meters / 111320;
}

function metersToDegLng(latDeg: number, meters: number): number {
  return meters / (111320 * Math.cos((latDeg * Math.PI) / 180));
}

/**
 * Creates a small regular polygon footprint around a point.
 * latDeg/lngDeg are WGS84 degrees; output is ring [lng, lat] closed.
 */
function buildFootprint(
  latDeg: number,
  lngDeg: number,
  sides: number,
  radiusMeters: number,
  rotationDeg: number,
): [number, number][] {
  const latRadius = metersToDegLat(radiusMeters);
  const lngRadius = metersToDegLng(latDeg, radiusMeters);
  const rotationRad = (rotationDeg * Math.PI) / 180;

  const ring: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const a = rotationRad + (i * 2 * Math.PI) / sides;
    const dLng = Math.cos(a) * lngRadius;
    const dLat = Math.sin(a) * latRadius;
    ring.push([lngDeg + dLng, latDeg + dLat]);
  }
  // close ring
  ring.push(ring[0]);
  return ring;
}

function createPoiIconLayer(
  id: string,
  data: TurkeyPoiPoint[],
  iconUrl: string,
  elevation: number,
  tint: RgbaColor,
): Layer {
  return new IconLayer<TurkeyPoiPoint>({
    id,
    data,
    pickable: true,
    billboard: true,
    sizeUnits: "pixels",
    getIcon: () => ({
      url: iconUrl,
      width: 100,
      height: 100,
      anchorY: 50,
    }),
    getPosition: (d) => [d.position[0], d.position[1], 0],
    getSize: 26,
    getColor: tint,
  });
}

export function createTurkeyOverlayLayers(
  overlays: {
    busRoutes: FeatureCollection | null;
    railLines: FeatureCollection | null;
    bikeLanes: FeatureCollection | null;
    greenAreas: FeatureCollection | null;

    busStops: FeatureCollection | null;
    railStations: FeatureCollection | null;
    evChargingStations: FeatureCollection | null;
    micromobilityParks: FeatureCollection | null;
    toilets: FeatureCollection | null;

    taxiStops: FeatureCollection | null;
    taxiDolmusStops: FeatureCollection | null;
    minibusRoutes: FeatureCollection | null;
    minibusStops: FeatureCollection | null;
    seaStations: FeatureCollection | null;
    kentLokantasi: FeatureCollection | null;
    sosyalTesisler: FeatureCollection | null;
  },
  zoom: number,
  ui?: {
    selectedBusRouteProps?: Record<string, unknown> | null;
    onPoiClick?: (poi: TurkeyPoiPoint) => void;
  },
): Layer[] {
  const showLines = zoom >= 11;
  const showPolygons = zoom >= 10.5;
  const showPoints = zoom >= 13;

  const layers: Layer[] = [];

  const getFeatureProperties = (f: unknown): Record<string, unknown> | null => {
    if (!f || typeof f !== "object") return null;
    const maybe = f as Record<string, unknown>;
    const props = maybe.properties;
    if (props && typeof props === "object") {
      return props as Record<string, unknown>;
    }
    return maybe;
  };

  const stripDiacritics = (s: string): string => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const normalizeKeyPart = (v: unknown): string | null => {
    if (v == null) return null;
    const s = String(v).trim();
    if (!s) return null;
    // Büyük/küçük + Türkçe karakter farklarını tolere et.
    return stripDiacritics(s).toLowerCase();
  };

  const selectedHatKodu = normalizeKeyPart(ui?.selectedBusRouteProps?.["HAT_KODU"]);
  const selectedGuzergahKodu = normalizeKeyPart(ui?.selectedBusRouteProps?.["GUZERGAH_KODU"]);
  const selectedId = normalizeKeyPart(ui?.selectedBusRouteProps?.["ID"]);

  const matchesSelectedBusRoute = (p: Record<string, unknown> | null): boolean => {
    if (!p) return false;
    const hatKodu = normalizeKeyPart(p["HAT_KODU"]);
    const guzergahKodu = normalizeKeyPart(p["GUZERGAH_KODU"]);
    const id = normalizeKeyPart(p["ID"]);

    // Seçimde hangi alanlar varsa, feature da aynı alanları taşımalı.
    if (selectedHatKodu && selectedGuzergahKodu) {
      return hatKodu === selectedHatKodu && guzergahKodu === selectedGuzergahKodu;
    }
    if (selectedHatKodu) {
      return hatKodu === selectedHatKodu;
    }
    if (selectedGuzergahKodu) {
      return guzergahKodu === selectedGuzergahKodu;
    }
    if (selectedId) {
      return id === selectedId;
    }
    return false;
  };

  // Polygons behind lines/points
  if (overlays.greenAreas && showPolygons) {
    layers.push(
      new GeoJsonLayer({
        id: "turkey-green-areas",
        data: overlays.greenAreas,
        stroked: true,
        filled: true,
        pickable: true,
        getFillColor: [34, 197, 94, 45],
        getLineColor: [34, 197, 94, 120],
        lineWidthMinPixels: 1,
        opacity: 1,
        onClick: (info) => {
          if (info.object && ui?.onPoiClick) {
            const props = getFeatureProperties(info.object);
            if (props) {
              ui.onPoiClick({
                kind: "green_area",
                position: info.coordinate as [number, number],
                title: readFirstString(props, ["AD", "ADI", "Name", "AD_TR"]),
                subtitle: readFirstString(props, ["TURU", "TİPİ", "MAHALLE"]),
                extra: readFirstString(props, ["ILCE", "İlçe"]),
                footprint: [],
              });
            }
          }
        },
      }),
    );
  }

  if (overlays.busRoutes && showLines) {
    layers.push(
      new GeoJsonLayer({
        id: "turkey-bus-routes",
        data: overlays.busRoutes,
        stroked: true,
        filled: false,
        pickable: true,
        getLineColor: (f: unknown) => {
          const p = getFeatureProperties(f);
          const isSelected = matchesSelectedBusRoute(p);
          // Seçili hat varsa → sadece o hat görünür, diğerleri tamamen şeffaf
          const n = (p?.["guzergahNo"] as number) ?? 1;
          const baseColor = n <= 3  ? [99, 179, 237]  :
                            n <= 8  ? [59, 130, 246]  :
                            n <= 15 ? [234, 179, 8]   :
                            n <= 25 ? [249, 115, 22]  :
                                      [239, 68,  68];
          if (selectedHatKodu || selectedGuzergahKodu || selectedId) {
            if (isSelected) return [...baseColor, 255];
            return [0, 0, 0, 0];
          }
          const alpha = n <= 3 ? 180 : n <= 8 ? 190 : n <= 15 ? 200 : n <= 25 ? 210 : 220;
          return [...baseColor, alpha];
        },
        lineWidthUnits: "pixels",
        lineWidthMinPixels: 1,
        getLineWidth: (f: unknown) => {
          const p = getFeatureProperties(f);
          const isSelected = matchesSelectedBusRoute(p);
          if (isSelected) return 5;
          return 1;
        },
        updateTriggers: {
          getLineColor: [selectedHatKodu, selectedGuzergahKodu, selectedId],
          getLineWidth: [selectedHatKodu, selectedGuzergahKodu, selectedId],
        },
        onClick: (info) => {
          if (info.object && ui?.onPoiClick) {
            const props = getFeatureProperties(info.object);
            if (props) {
              ui.onPoiClick({
                kind: "bus_stop", // Using bus_stop as proxy for info panel
                position: info.coordinate as [number, number],
                title: readFirstString(props, ["HAT_KODU", "AD", "ADI"]) || "Otobüs Hattı",
                subtitle: readFirstString(props, ["GUZERGAH_KODU", "HAT_ADI"]) || "İETT Güzergahı",
                extra: `Sefer Sayısı: ${props["guzergahNo"] || "Bilinmiyor"}`,
                footprint: [],
                properties: props
              });
            }
          }
        }
      }),
    );
  }

  if (overlays.railLines && showLines) {
    layers.push(
      new GeoJsonLayer({
        id: "turkey-rail-lines",
        data: overlays.railLines,
        stroked: true,
        filled: false,
        pickable: true,
        getLineColor: (f: unknown) => {
          const p = getFeatureProperties(f);
          const isSelected = selectedId !== null && selectedId === normalizeKeyPart(p?.["ID"] || p?.["id"] || p?.["OBJECTID"]);
          return isSelected ? [255, 255, 255, 255] : [167, 139, 250, 240]; // Violet — otobüs mavisinden ayrışır
        },
        lineWidthMinPixels: 2,
        getLineWidth: (f: unknown) => {
          const p = getFeatureProperties(f);
          const isSelected = selectedId !== null && selectedId === normalizeKeyPart(p?.["ID"] || p?.["id"] || p?.["OBJECTID"]);
          return isSelected ? 14 : 6;
        },
        updateTriggers: {
          getLineColor: [selectedId],
          getLineWidth: [selectedId],
        },
        onClick: (info) => {
          if (info.object && ui?.onPoiClick) {
            const props = getFeatureProperties(info.object);
            if (props) {
              ui.onPoiClick({
                kind: "rail_station", // Info panel should handle this
                position: info.coordinate as [number, number],
                title: readFirstString(props, ["HAT_ADI", "AD", "ADI", "Name"]),
                subtitle: "Raylı Sistem Hattı",
                extra: readFirstString(props, ["DURUM", "TURU"]),
                footprint: [],
                properties: props
              });
            }
          }
        }
      }),
    );
  }

  if (overlays.bikeLanes && showLines) {
    layers.push(
      new GeoJsonLayer({
        id: "turkey-bike-lanes",
        data: overlays.bikeLanes,
        stroked: true,
        filled: false,
        pickable: true,
        getLineColor: (f: unknown) => {
          const p = getFeatureProperties(f);
          const isSelected = selectedId !== null && selectedId === normalizeKeyPart(p?.["ID"] || p?.["id"] || p?.["OBJECTID"]);
          return isSelected ? [255, 255, 255, 255] : [20, 184, 166, 180]; // Turkuaz
        },
        lineWidthMinPixels: 1,
        getLineWidth: (f: unknown) => {
          const p = getFeatureProperties(f);
          const isSelected = selectedId !== null && selectedId === normalizeKeyPart(p?.["ID"] || p?.["id"] || p?.["OBJECTID"]);
          return isSelected ? 12 : 4; // Kalınlık artırıldı
        },
        updateTriggers: {
          getLineColor: [selectedId],
          getLineWidth: [selectedId],
        },
        onClick: (info) => {
          if (info.object && ui?.onPoiClick) {
            const props = getFeatureProperties(info.object);
            if (props) {
              ui.onPoiClick({
                kind: "micromobility_park", // Map to similar type or generic
                position: info.coordinate as [number, number],
                title: readFirstString(props, ["YOL_ADI", "AD", "ADI", "Name"]) || "Bisiklet Yolu",
                subtitle: "Bisiklet Yolu Ağı",
                extra: readFirstString(props, ["YOL_TIPI", "MALZEME"]),
                footprint: [],
                properties: props
              });
            }
          }
        }
      }),
    );
  }

  if (overlays.minibusRoutes && showLines) {
    layers.push(
      new GeoJsonLayer({
        id: "turkey-minibus-routes",
        data: overlays.minibusRoutes,
        stroked: true,
        filled: false,
        pickable: true,
        getLineColor: (f: unknown) => {
          const p = getFeatureProperties(f);
          const isSelected = selectedId !== null && selectedId === normalizeKeyPart(p?.["ID"] || p?.["id"] || p?.["OBJECTID"]);
          return isSelected ? [255, 255, 255, 255] : [245, 158, 11, 180]; // Kehribar (Amber)
        },
        lineWidthMinPixels: 1,
        getLineWidth: (f: unknown) => {
          const p = getFeatureProperties(f);
          const isSelected = selectedId !== null && selectedId === normalizeKeyPart(p?.["ID"] || p?.["id"] || p?.["OBJECTID"]);
          return isSelected ? 12 : 4; // Kalınlık artırıldı
        },
        updateTriggers: {
          getLineColor: [selectedId],
          getLineWidth: [selectedId],
        },
        onClick: (info) => {
          if (info.object && ui?.onPoiClick) {
            const props = getFeatureProperties(info.object);
            if (props) {
              ui.onPoiClick({
                kind: "minibus_stop",
                position: info.coordinate as [number, number],
                title: readFirstString(props, ["HAT_ADI", "AD", "ADI", "Name"]),
                subtitle: "Minibüs Güzergahı",
                extra: readFirstString(props, ["GUZERGAH", "ACIKLAMA"]),
                footprint: [],
                properties: props
              });
            }
          }
        }
      }),
    );
  }

  // Points as different 3D extruded shapes (deep zoom)
  // Not only height/radius; footprint geometry differs per POI type.
  if (overlays.busStops && showPoints) {
    const pts = cached(overlays.busStops, extractBusStops);
    layers.push(createPoiIconLayer("turkey-bus-stops-icons", pts, POI_ICON_URLS.busStop, 40, [255, 255, 255, 255]));
  }

  if (overlays.railStations && showPoints) {
    const pts = cached(overlays.railStations, extractRailStations);
    layers.push(createPoiIconLayer("turkey-rail-stations-icons", pts, POI_ICON_URLS.railStation, 60, [255, 255, 255, 255]));
  }

  if (overlays.evChargingStations && showPoints) {
    const pts = cached(overlays.evChargingStations, extractEvChargingStations);
    layers.push(createPoiIconLayer("turkey-ev-charging-icons", pts, POI_ICON_URLS.evCharging, 50, [255, 255, 255, 255]));
  }

  if (overlays.micromobilityParks && showPoints) {
    const pts = cached(overlays.micromobilityParks, extractMicromobilityParks);
    layers.push(createPoiIconLayer("turkey-micromobility-parks-icons", pts, POI_ICON_URLS.micromobility, 40, [255, 255, 255, 255]));
  }

  if (overlays.toilets && showPoints) {
    const pts = cached(overlays.toilets, extractToilets);
    layers.push(createPoiIconLayer("turkey-toilets-icons", pts, POI_ICON_URLS.toilet, 30, [255, 255, 255, 255]));
  }

  if (overlays.taxiStops && showPoints) {
    const pts = cached(overlays.taxiStops, extractTaxiStops);
    layers.push(createPoiIconLayer("turkey-taxi-stops-icons", pts, POI_ICON_URLS.taxi, 40, [255, 255, 255, 255]));
  }

  if (overlays.taxiDolmusStops && showPoints) {
    const pts = cached(overlays.taxiDolmusStops, extractTaxiDolmusStops);
    layers.push(createPoiIconLayer("turkey-taxi-dolmus-stops-icons", pts, POI_ICON_URLS.taxiDolmus, 40, [255, 255, 255, 255]));
  }

  if (overlays.minibusStops && showPoints) {
    const pts = cached(overlays.minibusStops, extractMinibusStops);
    const elevation = POI_SHAPE_CONFIG.minibus_stop.elevationMeters;
    layers.push(createPoiIconLayer("turkey-minibus-stops-icons", pts, POI_ICON_URLS.minibus, elevation, [255, 255, 255, 255]));
  }

  if (overlays.seaStations && showPoints) {
    const pts = cached(overlays.seaStations, extractSeaStations);
    const elevation = POI_SHAPE_CONFIG.sea_station.elevationMeters;
    layers.push(createPoiIconLayer("turkey-sea-stations-icons", pts, POI_ICON_URLS.seaStation, elevation, [255, 255, 255, 255]));
  }

  if (overlays.kentLokantasi && showPoints) {
    const pts = extractSimplePoints(overlays.kentLokantasi, "kent_lokantasi");
    layers.push(createPoiIconLayer("turkey-kent-lokantasi-icons", pts, POI_ICON_URLS.kentLokantasi, 40, [255, 255, 255, 255]));
  }

  if (overlays.sosyalTesisler && showPoints) {
    const pts = extractSimplePoints(overlays.sosyalTesisler, "sosyal_tesis");
    layers.push(createPoiIconLayer("turkey-sosyal-tesisler-icons", pts, POI_ICON_URLS.sosyalTesis, 40, [255, 255, 255, 255]));
  }

  return layers;
}

