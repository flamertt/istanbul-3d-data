import { Map } from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import type { Layer, MapViewState, PickingInfo } from "deck.gl";
import { useMemo } from "react";
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

  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={({ viewState: vs }) => onViewStateChange(vs as MapViewState)}
      layers={layers}
      onClick={handleClick}
      controller
    >
      <Map mapStyle={mapStyleUrl} />
    </DeckGL>
  );
}

