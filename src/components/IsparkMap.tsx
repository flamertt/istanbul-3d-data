import { Map, type MapRef } from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import type { Layer, MapViewState, PickingInfo } from "deck.gl";
import { useCallback, useMemo, useRef } from "react";
import type { IsparkLot } from "../types";
import type { TurkeyPoiPoint } from "../layers/turkeyOverlayLayers";
import { createIsparkLayers } from "../layers/isparkLayers";

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


  const handleMapLoad = useCallback((e: { target: { getStyle: () => { sources: Record<string, unknown> }; addLayer: (layer: object) => void } }) => {
    const map = e.target;
    const sources = map.getStyle().sources;
    const source = "openmaptiles" in sources ? "openmaptiles" : "carto";
    const isLight = !mapStyleUrl.includes("dark");
    map.addLayer({
      id: "3d-buildings",
      source,
      "source-layer": "building",
      type: "fill-extrusion",
      minzoom: 3,
      paint: {
        "fill-extrusion-color": isLight ? "#c8c0b8" : "#2a2a3a",
        "fill-extrusion-height": ["*", ["coalesce", ["get", "render_height"], 10], 5],
        "fill-extrusion-base": ["*", ["coalesce", ["get", "render_min_height"], 0], 5],
        "fill-extrusion-opacity": 1.0,
      },
    });
  }, [mapStyleUrl]);

  return (
    <div className="w-full h-full" onContextMenu={(e) => e.preventDefault()}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => onViewStateChange(vs as MapViewState)}
        layers={layers}
        onClick={handleClick}
        controller
      >
        <Map key={mapStyleUrl} ref={mapRef} mapStyle={mapStyleUrl} onLoad={handleMapLoad} />
      </DeckGL>
    </div>
  );
}

