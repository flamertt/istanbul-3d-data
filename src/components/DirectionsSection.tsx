import { Navigation, Car, Bike, PersonStanding, Loader2 } from "lucide-react";
import type { RouteMode, RouteState } from "../hooks/useRoute";

const MODES: { mode: RouteMode; label: string; Icon: React.ElementType }[] = [
  { mode: "auto", label: "Araç", Icon: Car },
  { mode: "bicycle", label: "Bisiklet", Icon: Bike },
  { mode: "pedestrian", label: "Yürüyüş", Icon: PersonStanding },
];

export function DirectionsSection({
  lat,
  lng,
  onGetDirections,
  route,
}: {
  lat: number;
  lng: number;
  onGetDirections?: (lat: number, lng: number, mode: RouteMode) => void;
  route?: RouteState;
}) {
  if (!onGetDirections) return null;

  const isSameDest = route?.destLat === lat && route?.destLng === lng;
  const isLoading = isSameDest && (route?.status === "locating" || route?.status === "routing");
  const isDone = isSameDest && route?.status === "done";
  const isError = isSameDest && route?.status === "error";

  return (
    <div className="pt-1 border-t border-gray-800/50">
      <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-400 mb-2 flex items-center gap-1.5">
        <Navigation size={11} />
        Yol Tarifi Al
      </div>

      <div className="flex gap-1.5">
        {MODES.map(({ mode, label, Icon }) => (
          <button
            key={mode}
            type="button"
            disabled={isLoading}
            onClick={() => onGetDirections(lat, lng, mode)}
            className="flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-gray-900/60 border border-white/5 hover:bg-blue-500/20 hover:border-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 hover:text-blue-200"
          >
            {isLoading && route?.mode === mode ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Icon size={14} />
            )}
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>

      {isDone && route.distanceKm != null && route.durationMin != null && (
        <div className="mt-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 flex items-center justify-between">
          <div className="text-xs text-blue-200">
            <span className="font-semibold">{route.durationMin < 60
              ? `${Math.round(route.durationMin)} dk`
              : `${Math.floor(route.durationMin / 60)} sa ${Math.round(route.durationMin % 60)} dk`}
            </span>
            <span className="text-blue-300/70 ml-1">· {route.distanceKm.toFixed(1)} km</span>
          </div>
          <span className="text-[10px] text-blue-300/50 capitalize">{
            route.mode === "auto" ? "Araç" : route.mode === "bicycle" ? "Bisiklet" : "Yürüyüş"
          }</span>
        </div>
      )}

      {isError && (
        <div className="mt-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs text-rose-300">
          {route.error}
        </div>
      )}
    </div>
  );
}
