import React from "react";
import { Map, type MapRef } from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import type { Layer, MapViewState, PickingInfo } from "deck.gl";
import { useCallback, useMemo, useRef, useEffect } from "react";
import type { IsparkLot } from "../types";
import type { TurkeyPoiPoint } from "../layers/turkeyOverlayLayers";
import { createIsparkLayers } from "../layers/isparkLayers";

type FeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>;

interface IsparkMapProps {
  lots: IsparkLot[];
  viewState: MapViewState;
  onViewStateChange: (vs: MapViewState) => void;
  onLotClick?: (lot: IsparkLot) => void;
  onPoiClick?: (poi: TurkeyPoiPoint) => void;
  onBusRouteClick?: (props: Record<string, unknown>) => void;
  onClearSelection?: () => void;
  extraLayers?: Layer[];
  mapStyleUrl: string;
  greenAreasData?: FeatureCollection | null;
  bridges3dEnabled?: boolean;
}

function isIsparkLot(obj: unknown): obj is IsparkLot {
  if (obj == null || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return typeof o["id"] === "number" && typeof o["lat"] === "number" && typeof o["lng"] === "number";
}

export function IsparkMap({
  lots,
  viewState,
  onViewStateChange,
  greenAreasData,
  bridges3dEnabled = false,
  onLotClick,
  onPoiClick,
  onBusRouteClick,
  onClearSelection,
  extraLayers,
  mapStyleUrl,
}: IsparkMapProps) {
  const zoom = viewState.zoom;
  const mapRef = useRef<MapRef>(null);

  const isparkLayers = useMemo(() => createIsparkLayers(lots, zoom), [lots, zoom]);
  const layers = useMemo(
    () => [...isparkLayers, ...(extraLayers ?? [])],
    [isparkLayers, extraLayers],
  );

  const handleClick = (info: PickingInfo) => {
    if (!info.object) {
      onClearSelection?.();
      return;
    }

    if (isIsparkLot(info.object)) {
      onLotClick?.(info.object);
      return;
    }

    const obj = info.object as unknown as Record<string, unknown>;
    if (onPoiClick && obj && typeof obj === "object" && "kind" in obj && "position" in obj) {
      onPoiClick(info.object as TurkeyPoiPoint);
      return;
    }

    if (onBusRouteClick) {
      const layerId = (info.layer as { id?: unknown } | undefined)?.id as string | undefined;

      // GeoJsonLayer: info.object çoğu zaman GeoJSON Feature => properties alanında veriler olur.
      let candidate: Record<string, unknown> = obj;
      if (obj && typeof obj === "object" && "properties" in obj) {
        const maybeProps = (obj as { properties?: unknown }).properties;
        if (maybeProps && typeof maybeProps === "object") {
          candidate = maybeProps as Record<string, unknown>;
        }
      }

      // En garantisi: layer id üzerinden yakala.
      if (layerId === "turkey-bus-routes") {
        onBusRouteClick(candidate);
        return;
      }

      // Fallback: properties içinde HAT_KODU varsa aç.
      const hatKodu = candidate["HAT_KODU"];
      if (typeof hatKodu === "string") {
        onBusRouteClick(candidate);
      }
    }
  };


  // Her zaman güncel greenAreasData'ya erişmek için ref
  const greenAreasRef = useRef(greenAreasData);
  useEffect(() => { greenAreasRef.current = greenAreasData; }, [greenAreasData]);

  const handleMapLoad = useCallback((e: { target: { getStyle: () => { sources: Record<string, unknown>; layers: { id: string; type: string }[] }; addSource: (id: string, src: object) => void; addLayer: (layer: object, beforeId?: string) => void } }) => {
    const map = e.target;
    const style = map.getStyle();
    const source = "openmaptiles" in style.sources ? "openmaptiles" : "carto";
    const isLight = !mapStyleUrl.includes("dark");
    const firstSymbol = style.layers.find((l) => l.type === "symbol")?.id;

    // 1) Yeşil alanlar — veri zaten geldiyse hemen ekle, yoksa boş başlat
    map.addSource("green-areas-src", {
      type: "geojson",
      data: (greenAreasRef.current ?? { type: "FeatureCollection", features: [] }) as GeoJSON.FeatureCollection,
    });
    map.addLayer({
      id: "green-areas-fill",
      type: "fill",
      source: "green-areas-src",
      paint: {
        "fill-color": "#22c55e",
        "fill-opacity": isLight ? 0.25 : 0.18,
      },
    }, firstSymbol); // label'lardan önce → binalardan da önce

    // 2) 3D binalar — yeşil alanların üstünde, label'lardan önce
    map.addLayer({
      id: "3d-buildings",
      source,
      "source-layer": "building",
      type: "fill-extrusion",
      minzoom: 3,
      paint: {
        "fill-extrusion-color": isLight ? "#c8c0b8" : "#2a2a3a",
        "fill-extrusion-height": ["*", ["coalesce", ["get", "render_height"], 10], 1.5],
        "fill-extrusion-base": ["*", ["coalesce", ["get", "render_min_height"], 0], 1.5],
        "fill-extrusion-opacity": 1.0,
      },
    }, firstSymbol);

    // 3) Green areas click — map yüklendikten sonra ekle (timing fix)
    const canvas = (map as unknown as { getCanvas: () => HTMLElement }).getCanvas();
    (map as unknown as { on: (event: string, layer: string, handler: (e: unknown) => void) => void })
      .on("click", "green-areas-fill", (e: unknown) => {
        const ev = e as { lngLat: { lng: number; lat: number }; features?: { properties: Record<string, unknown> }[] };
        const props = ev.features?.[0]?.properties ?? {};
        onPoiClickRef.current?.({
          kind: "green_area",
          position: [ev.lngLat.lng, ev.lngLat.lat],
          title: String(props["AD"] ?? props["ADI"] ?? props["Name"] ?? "Yeşil Alan"),
          subtitle: String(props["TURU"] ?? props["TİPİ"] ?? ""),
          footprint: [],
        });
      });
    (map as unknown as { on: (event: string, layer: string, handler: () => void) => void })
      .on("mouseenter", "green-areas-fill", () => { canvas.style.cursor = "pointer"; });
    (map as unknown as { on: (event: string, layer: string, handler: () => void) => void })
      .on("mouseleave", "green-areas-fill", () => { canvas.style.cursor = ""; });
  }, [mapStyleUrl]);

  // Yeşil alan verisi değiştiğinde MapLibre source'u güncelle
  useEffect(() => {
    const ml = mapRef.current?.getMap();
    if (!ml) return;
    const src = ml.getSource("green-areas-src") as { setData?: (d: object) => void } | undefined;
    if (!src?.setData) return;
    src.setData(greenAreasData ?? { type: "FeatureCollection", features: [] });
  }, [greenAreasData]);

  // onPoiClick ref — handleMapLoad'da closure stale olmasın
  const onPoiClickRef = useRef(onPoiClick);
  useEffect(() => { onPoiClickRef.current = onPoiClick; }, [onPoiClick]);

  return (
    <div className="w-full h-full" onContextMenu={(e) => e.preventDefault()}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => onViewStateChange(vs as MapViewState)}
        layers={layers}
        onClick={(info, e) => {
          handleClick(info, e);
        }}
        getTooltip={({ object, layer }: { object: unknown; layer: { id: string } | null }) => {
          if (!layer?.id?.startsWith("bridge")) return null;
          const d = object as { name?: string; variant?: string };
          const text = d?.variant ?? d?.name ?? "";
          return text ? { html: `<div style="background:#111;color:#fff;padding:6px 10px;border-radius:8px;font-size:12px;border:1px solid #1e90ff">${text}</div>`, style: { backgroundColor: "transparent" } } : null;
        }}
        controller
      >
        <Map key={mapStyleUrl} ref={mapRef} mapStyle={mapStyleUrl} onLoad={handleMapLoad} />
      </DeckGL>
    </div>
  );
}

