import { GeoJsonLayer, PolygonLayer } from "deck.gl";
import type { Layer } from "deck.gl";

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

function readFirstString(props: Properties | undefined, keys: string[]): string {
  if (!props) return "";
  for (const k of keys) {
    const v = props[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return "";
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
    footprint: buildFootprint(position[1], position[0], 3, 5, 90),
  }));
}

function extractRailStations(fc: FeatureCollection): TurkeyPoiPoint[] {
  return extractPointFeatures(fc).map(({ position, properties }) => ({
    kind: "rail_station",
    position,
    title: readFirstString(properties, ["ISTASYON", "Proje_Adi", "PROJE_ADI", "Name"]),
    subtitle: readFirstString(properties, ["PROJE_ASAMA", "HAT_TURU"]),
    extra: readFirstString(properties, ["MUDURLUK", "PROJE_ADI"]),
    footprint: buildFootprint(position[1], position[0], 4, 8, 0),
  }));
}

function extractEvChargingStations(fc: FeatureCollection): TurkeyPoiPoint[] {
  return extractPointFeatures(fc).map(({ position, properties }) => ({
    kind: "ev_charging_station",
    position,
    title: readFirstString(properties, ["AD", "ADRES", "MARKA_TESCIL_BELGESI"]),
    subtitle: readFirstString(properties, ["HIZMET_SEKLI", "AGIL_ISLETMECISI_UNVAN"]),
    extra: readFirstString(properties, ["ISTASYON_NO", "DAGITIM_SIRKETI_LISANS_NO"]),
    footprint: buildFootprint(position[1], position[0], 6, 6, 0),
  }));
}

function extractMicromobilityParks(fc: FeatureCollection): TurkeyPoiPoint[] {
  return extractPointFeatures(fc).map(({ position, properties }) => ({
    kind: "micromobility_park",
    position,
    title: readFirstString(properties, ["Park_Alani", "Park Alanı"]),
    subtitle: readFirstString(properties, ["Ilce", "ILCE", "Bolge", "BOLGE"]),
    extra: readFirstString(properties, ["Park_Tipi", "Park Tipi"]),
    footprint: buildFootprint(position[1], position[0], 8, 8, 22.5),
  }));
}

function extractToilets(fc: FeatureCollection): TurkeyPoiPoint[] {
  return extractPointFeatures(fc).map(({ position, properties }) => ({
    kind: "toilet",
    position,
    title: readFirstString(properties, ["MAHAL_ADI", "TUVALET_DURUM", "TUVALET_TIP"]),
    subtitle: readFirstString(properties, ["ILCE", "HIZMET_YERI"]),
    extra: readFirstString(properties, ["TUVALET_TIP", "BAKIM_ODASI"]),
    footprint: buildFootprint(position[1], position[0], 4, 4, 45),
  }));
}

function extractTaxiStops(fc: FeatureCollection): TurkeyPoiPoint[] {
  return extractPointFeatures(fc).map(({ position, properties }) => ({
    kind: "taxi_stop",
    position,
    title: readFirstString(properties, ["DURAK_ADI", "DURAKADI", "ADI", "Name"]),
    subtitle: readFirstString(properties, ["ACIKLAMA", "ILCE", "IL", "MAHALLE"]),
    extra: readFirstString(properties, ["ACIKLAMA", "DURAK_KODU", "Tip"]),
    footprint: buildFootprint(position[1], position[0], 4, 6.2, 0),
  }));
}

function extractTaxiDolmusStops(fc: FeatureCollection): TurkeyPoiPoint[] {
  return extractPointFeatures(fc).map(({ position, properties }) => ({
    kind: "taxi_dolmus_stop",
    position,
    title: readFirstString(properties, ["DURAK_ADI", "ADI", "Name"]),
    subtitle: readFirstString(properties, ["ACIKLAMA", "HAT", "ROTA"]),
    extra: "",
    footprint: buildFootprint(position[1], position[0], 5, 5.6, 20),
  }));
}

function extractMinibusStops(fc: FeatureCollection): TurkeyPoiPoint[] {
  return extractPointFeatures(fc).map(({ position, properties }) => ({
    kind: "minibus_stop",
    position,
    title: readFirstString(properties, ["DURAK_ADI", "DURAKADI", "ADI", "Name"]),
    subtitle: readFirstString(properties, ["ACIKLAMA", "ILCE", "IL", "MAHALLE"]),
    extra: "",
    footprint: buildFootprint(position[1], position[0], 6, 6.8, 10),
  }));
}

function extractSeaStations(fc: FeatureCollection): TurkeyPoiPoint[] {
  return extractPointFeatures(fc).map(({ position, properties }) => ({
    kind: "sea_station",
    position,
    title: readFirstString(properties, ["ISKELE_ADI", "AD", "ADI", "Name"]),
    subtitle: readFirstString(properties, ["ILCE", "MAHALLE", "BOLGE"]),
    extra: "",
    footprint: buildFootprint(position[1], position[0], 3, 6.2, 0),
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

  const getBusRouteMatchKey = (p: Record<string, unknown> | null | undefined): string | null => {
    if (!p) return null;
    const hatKodu = typeof p["HAT_KODU"] === "string" ? p["HAT_KODU"] : null;
    const guzergahKodu = typeof p["GUZERGAH_KODU"] === "string" ? p["GUZERGAH_KODU"] : null;
    const id = typeof p["ID"] === "string" || typeof p["ID"] === "number" ? String(p["ID"]) : null;
    if (!hatKodu && !guzergahKodu && !id) return null;
    return `${hatKodu ?? ""}|${guzergahKodu ?? ""}|${id ?? ""}`;
  };

  const selectedBusRouteKey = getBusRouteMatchKey(ui?.selectedBusRouteProps ?? null);

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
          const key = getBusRouteMatchKey(p);
          const isSelected = selectedBusRouteKey != null && key === selectedBusRouteKey;
          return isSelected ? [239, 68, 68, 230] : [59, 130, 246, 160];
        },
        // Tıklanabilirlik ve görünürlük için çizgi kalınlığını seçime göre değiştiriyoruz.
        lineWidthMinPixels: 2,
        getLineWidth: (f: unknown) => {
          const p = getFeatureProperties(f);
          const key = getBusRouteMatchKey(p);
          const isSelected = selectedBusRouteKey != null && key === selectedBusRouteKey;
          return isSelected ? 8 : 3;
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
        getElevation: () => 45,
        getFillColor: [59, 130, 246, 230],
        getLineColor: [59, 130, 246, 255],
        getLineWidth: () => 1,
        material: { ambient: 0.55, diffuse: 0.9, shininess: 28 },
        highlightColor: [255, 255, 255, 120],
      }),
    );
  }

  if (overlays.railStations && showPoints) {
    const pts = extractRailStations(overlays.railStations);
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
        getElevation: () => 78,
        getFillColor: [168, 85, 247, 235],
        getLineColor: [168, 85, 247, 255],
        getLineWidth: () => 1,
        material: { ambient: 0.55, diffuse: 0.9, shininess: 28 },
        highlightColor: [255, 255, 255, 120],
      }),
    );
  }

  if (overlays.evChargingStations && showPoints) {
    const pts = extractEvChargingStations(overlays.evChargingStations);
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
        getElevation: () => 50,
        getFillColor: [250, 204, 21, 230],
        getLineColor: [250, 204, 21, 255],
        getLineWidth: () => 1,
        material: { ambient: 0.55, diffuse: 0.9, shininess: 28 },
        highlightColor: [255, 255, 255, 120],
      }),
    );
  }

  if (overlays.micromobilityParks && showPoints) {
    const pts = extractMicromobilityParks(overlays.micromobilityParks);
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
        getElevation: () => 62,
        getFillColor: [249, 115, 22, 230],
        getLineColor: [249, 115, 22, 255],
        getLineWidth: () => 1,
        material: { ambient: 0.55, diffuse: 0.9, shininess: 28 },
        highlightColor: [255, 255, 255, 120],
      }),
    );
  }

  if (overlays.toilets && showPoints) {
    const pts = extractToilets(overlays.toilets);
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
        getElevation: () => 30,
        getFillColor: [244, 63, 94, 230],
        getLineColor: [244, 63, 94, 255],
        getLineWidth: () => 1,
        material: { ambient: 0.55, diffuse: 0.9, shininess: 28 },
        highlightColor: [255, 255, 255, 120],
      }),
    );
  }

  if (overlays.taxiStops && showPoints) {
    const pts = extractTaxiStops(overlays.taxiStops);
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
        getElevation: () => 48,
        getFillColor: [217, 70, 239, 230],
        getLineColor: [217, 70, 239, 255],
        getLineWidth: () => 1,
        material: { ambient: 0.55, diffuse: 0.9, shininess: 30 },
        highlightColor: [255, 255, 255, 120],
      }),
    );
  }

  if (overlays.taxiDolmusStops && showPoints) {
    const pts = extractTaxiDolmusStops(overlays.taxiDolmusStops);
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
        getElevation: () => 40,
        getFillColor: [244, 63, 94, 230],
        getLineColor: [244, 63, 94, 255],
        getLineWidth: () => 1,
        material: { ambient: 0.55, diffuse: 0.9, shininess: 30 },
        highlightColor: [255, 255, 255, 120],
      }),
    );
  }

  if (overlays.minibusStops && showPoints) {
    const pts = extractMinibusStops(overlays.minibusStops);
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
        getElevation: () => 60,
        getFillColor: [16, 185, 129, 230],
        getLineColor: [16, 185, 129, 255],
        getLineWidth: () => 1,
        material: { ambient: 0.55, diffuse: 0.9, shininess: 30 },
        highlightColor: [255, 255, 255, 120],
      }),
    );
  }

  if (overlays.seaStations && showPoints) {
    const pts = extractSeaStations(overlays.seaStations);
    layers.push(
      new PolygonLayer<TurkeyPoiPoint>({
        id: "turkey-sea-stations",
        data: pts,
        extruded: true,
        stroked: true,
        filled: true,
        pickable: true,
        autoHighlight: true,
        lineWidthMinPixels: 1,
        getPolygon: (d) => [d.footprint],
        getElevation: () => 52,
        getFillColor: [56, 189, 248, 230],
        getLineColor: [56, 189, 248, 255],
        getLineWidth: () => 1,
        material: { ambient: 0.55, diffuse: 0.9, shininess: 30 },
        highlightColor: [255, 255, 255, 120],
      }),
    );
  }

  return layers;
}

