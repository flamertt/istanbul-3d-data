import { GeoJsonLayer, IconLayer, PolygonLayer } from "deck.gl";
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
  | "sea_station";

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
  | "sea_station";

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
    sizeUnits: "meters",
    getIcon: () => ({
      url: iconUrl,
      width: 112,
      height: 112,
      anchorY: 112,
    }),
    getPosition: (d) => [d.position[0], d.position[1], elevation + 16],
    getSize: 56,
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
  },
  zoom: number,
  ui?: {
    selectedBusRouteProps?: Record<string, unknown> | null;
  },
): Layer[] {
  const showLines = zoom >= 11;
  const showPolygons = zoom >= 10.5;
  const showPoints = zoom >= 13.2;

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
        pickable: false,
        getFillColor: [34, 197, 94, 45],
        getLineColor: [34, 197, 94, 120],
        lineWidthMinPixels: 1,
        opacity: 1,
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
          return isSelected ? [239, 68, 68, 255] : [59, 130, 246, 160];
        },
        // Tıklanabilirlik ve görünürlük için çizgi kalınlığını seçime göre değiştiriyoruz.
        lineWidthMinPixels: 2,
        getLineWidth: (f: unknown) => {
          const p = getFeatureProperties(f);
          const isSelected = matchesSelectedBusRoute(p);
          return isSelected ? 14 : 3;
        },
        updateTriggers: {
          getLineColor: [selectedHatKodu, selectedGuzergahKodu, selectedId],
          getLineWidth: [selectedHatKodu, selectedGuzergahKodu, selectedId],
        },
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
        pickable: false,
        getLineColor: [168, 85, 247, 170],
        lineWidthMinPixels: 1,
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
        pickable: false,
        getLineColor: [20, 184, 166, 160],
        lineWidthMinPixels: 1,
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
        pickable: false,
        getLineColor: [45, 212, 191, 170],
        lineWidthMinPixels: 1,
      }),
    );
  }

  // Points as different 3D extruded shapes (deep zoom)
  // Not only height/radius; footprint geometry differs per POI type.
  if (overlays.busStops && showPoints) {
    const pts = extractBusStops(overlays.busStops);
    const elevation = POI_SHAPE_CONFIG.bus_stop.elevationMeters;
    layers.push(
      new PolygonLayer<TurkeyPoiPoint>({
        id: "turkey-bus-stops",
        data: pts,
        extruded: true,
        stroked: true,
        filled: true,
        pickable: true,
        autoHighlight: true,
        lineWidthMinPixels: 1,
        getPolygon: (d) => [d.footprint],
        getElevation: () => elevation,
        getFillColor: [59, 130, 246, 230],
        getLineColor: [59, 130, 246, 255],
        getLineWidth: () => 1,
        material: { ambient: 0.55, diffuse: 0.9, shininess: 28 },
        highlightColor: [255, 255, 255, 120],
      }),
    );
    layers.push(createPoiIconLayer("turkey-bus-stops-icons", pts, POI_ICON_URLS.busStop, elevation, [255, 255, 255, 255]));
  }

  if (overlays.railStations && showPoints) {
    const pts = extractRailStations(overlays.railStations);
    const elevation = POI_SHAPE_CONFIG.rail_station.elevationMeters;
    layers.push(
      new PolygonLayer<TurkeyPoiPoint>({
        id: "turkey-rail-stations",
        data: pts,
        extruded: true,
        stroked: true,
        filled: true,
        pickable: true,
        autoHighlight: true,
        lineWidthMinPixels: 1,
        getPolygon: (d) => [d.footprint],
        getElevation: () => elevation,
        getFillColor: [168, 85, 247, 235],
        getLineColor: [168, 85, 247, 255],
        getLineWidth: () => 1,
        material: { ambient: 0.55, diffuse: 0.9, shininess: 28 },
        highlightColor: [255, 255, 255, 120],
      }),
    );
    layers.push(createPoiIconLayer("turkey-rail-stations-icons", pts, POI_ICON_URLS.railStation, elevation, [255, 255, 255, 255]));
  }

  if (overlays.evChargingStations && showPoints) {
    const pts = extractEvChargingStations(overlays.evChargingStations);
    const elevation = POI_SHAPE_CONFIG.ev_charging_station.elevationMeters;
    layers.push(
      new PolygonLayer<TurkeyPoiPoint>({
        id: "turkey-ev-charging",
        data: pts,
        extruded: true,
        stroked: true,
        filled: true,
        pickable: true,
        autoHighlight: true,
        lineWidthMinPixels: 1,
        getPolygon: (d) => [d.footprint],
        getElevation: () => elevation,
        getFillColor: [250, 204, 21, 230],
        getLineColor: [250, 204, 21, 255],
        getLineWidth: () => 1,
        material: { ambient: 0.55, diffuse: 0.9, shininess: 28 },
        highlightColor: [255, 255, 255, 120],
      }),
    );
    layers.push(createPoiIconLayer("turkey-ev-charging-icons", pts, POI_ICON_URLS.evCharging, elevation, [255, 255, 255, 255]));
  }

  if (overlays.micromobilityParks && showPoints) {
    const pts = extractMicromobilityParks(overlays.micromobilityParks);
    const elevation = POI_SHAPE_CONFIG.micromobility_park.elevationMeters;
    layers.push(
      new PolygonLayer<TurkeyPoiPoint>({
        id: "turkey-micromobility-parks",
        data: pts,
        extruded: true,
        stroked: true,
        filled: true,
        pickable: true,
        autoHighlight: true,
        lineWidthMinPixels: 1,
        getPolygon: (d) => [d.footprint],
        getElevation: () => elevation,
        getFillColor: [249, 115, 22, 230],
        getLineColor: [249, 115, 22, 255],
        getLineWidth: () => 1,
        material: { ambient: 0.55, diffuse: 0.9, shininess: 28 },
        highlightColor: [255, 255, 255, 120],
      }),
    );
    layers.push(createPoiIconLayer("turkey-micromobility-parks-icons", pts, POI_ICON_URLS.micromobility, elevation, [255, 255, 255, 255]));
  }

  if (overlays.toilets && showPoints) {
    const pts = extractToilets(overlays.toilets);
    const elevation = POI_SHAPE_CONFIG.toilet.elevationMeters;
    layers.push(
      new PolygonLayer<TurkeyPoiPoint>({
        id: "turkey-toilets",
        data: pts,
        extruded: true,
        stroked: true,
        filled: true,
        pickable: true,
        autoHighlight: true,
        lineWidthMinPixels: 1,
        getPolygon: (d) => [d.footprint],
        getElevation: () => elevation,
        getFillColor: [244, 63, 94, 230],
        getLineColor: [244, 63, 94, 255],
        getLineWidth: () => 1,
        material: { ambient: 0.55, diffuse: 0.9, shininess: 28 },
        highlightColor: [255, 255, 255, 120],
      }),
    );
    layers.push(createPoiIconLayer("turkey-toilets-icons", pts, POI_ICON_URLS.toilet, elevation, [255, 255, 255, 255]));
  }

  if (overlays.taxiStops && showPoints) {
    const pts = extractTaxiStops(overlays.taxiStops);
    const elevation = POI_SHAPE_CONFIG.taxi_stop.elevationMeters;
    layers.push(
      new PolygonLayer<TurkeyPoiPoint>({
        id: "turkey-taxi-stops",
        data: pts,
        extruded: true,
        stroked: true,
        filled: true,
        pickable: true,
        autoHighlight: true,
        lineWidthMinPixels: 1,
        getPolygon: (d) => [d.footprint],
        getElevation: () => elevation,
        getFillColor: [217, 70, 239, 230],
        getLineColor: [217, 70, 239, 255],
        getLineWidth: () => 1,
        material: { ambient: 0.55, diffuse: 0.9, shininess: 30 },
        highlightColor: [255, 255, 255, 120],
      }),
    );
    layers.push(createPoiIconLayer("turkey-taxi-stops-icons", pts, POI_ICON_URLS.taxi, elevation, [255, 255, 255, 255]));
  }

  if (overlays.taxiDolmusStops && showPoints) {
    const pts = extractTaxiDolmusStops(overlays.taxiDolmusStops);
    const elevation = POI_SHAPE_CONFIG.taxi_dolmus_stop.elevationMeters;
    layers.push(
      new PolygonLayer<TurkeyPoiPoint>({
        id: "turkey-taxi-dolmus-stops",
        data: pts,
        extruded: true,
        stroked: true,
        filled: true,
        pickable: true,
        autoHighlight: true,
        lineWidthMinPixels: 1,
        getPolygon: (d) => [d.footprint],
        getElevation: () => elevation,
        getFillColor: [244, 63, 94, 230],
        getLineColor: [244, 63, 94, 255],
        getLineWidth: () => 1,
        material: { ambient: 0.55, diffuse: 0.9, shininess: 30 },
        highlightColor: [255, 255, 255, 120],
      }),
    );
    layers.push(createPoiIconLayer("turkey-taxi-dolmus-stops-icons", pts, POI_ICON_URLS.taxiDolmus, elevation, [255, 255, 255, 255]));
  }

  if (overlays.minibusStops && showPoints) {
    const pts = extractMinibusStops(overlays.minibusStops);
    const elevation = POI_SHAPE_CONFIG.minibus_stop.elevationMeters;
    layers.push(
      new PolygonLayer<TurkeyPoiPoint>({
        id: "turkey-minibus-stops",
        data: pts,
        extruded: true,
        stroked: true,
        filled: true,
        pickable: true,
        autoHighlight: true,
        lineWidthMinPixels: 1,
        getPolygon: (d) => [d.footprint],
        getElevation: () => elevation,
        getFillColor: [16, 185, 129, 230],
        getLineColor: [16, 185, 129, 255],
        getLineWidth: () => 1,
        material: { ambient: 0.55, diffuse: 0.9, shininess: 30 },
        highlightColor: [255, 255, 255, 120],
      }),
    );
    layers.push(createPoiIconLayer("turkey-minibus-stops-icons", pts, POI_ICON_URLS.minibus, elevation, [255, 255, 255, 255]));
  }

  if (overlays.seaStations && showPoints) {
    const pts = extractSeaStations(overlays.seaStations);
    const elevation = POI_SHAPE_CONFIG.sea_station.elevationMeters;
    layers.push(
      new PolygonLayer<TurkeyPoiPoint>({
        id: "turkey-sea-stations",
        data: pts,
        extruded: true,
        stroked: true,
        filled: true,
        pickable: true,
        // Deniz katmanı için hover'da beyaza çeviren highlight'i kapatıyoruz.
        autoHighlight: false,
        lineWidthMinPixels: 2,
        getPolygon: (d) => [d.footprint],
        getElevation: () => elevation,
        // Deniz istasyonları: daha belirgin mavi ton
        getFillColor: [20, 90, 220, 255],
        getLineColor: [20, 90, 220, 255],
        getLineWidth: () => 2,
        material: { ambient: 0.9, diffuse: 0.85, shininess: 15 },
        highlightColor: [255, 255, 255, 120],
      }),
    );
    layers.push(createPoiIconLayer("turkey-sea-stations-icons", pts, POI_ICON_URLS.seaStation, elevation, [255, 255, 255, 255]));
  }

  return layers;
}

