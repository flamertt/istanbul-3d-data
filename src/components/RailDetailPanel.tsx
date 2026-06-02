import { Clock, Navigation, TrainFront, Train, Cable, MapPin, Ship } from "lucide-react";
import { SidePanel, StatGrid, StatCard, SectionLabel } from "./SidePanel";
import type { ActiveVehicle } from "../layers/railSimLayer";
import type { RailRoute } from "../hooks/useRailSim";

function fmtTime(sec: number) {
  const s = ((sec % 86400) + 86400) % 86400;
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
}

function fmtMin(sec: number) {
  return `${Math.round(sec / 60)} dk`;
}

const KIND_META: Record<ActiveVehicle["kind"], { label: string; Icon: React.ElementType; color: string }> = {
  metro:     { label: "Metro",    Icon: TrainFront, color: "#eab308" },
  marmaray:  { label: "Marmaray", Icon: Train,      color: "#dc2626" },
  tram:      { label: "Tramvay",  Icon: Cable,      color: "#0891b2" },
  funicular: { label: "Füniküler",Icon: Cable,      color: "#7c3aed" },
  ferry:     { label: "Vapur",    Icon: Ship,       color: "#0e7490" },
};

export function RailDetailPanel({ vehicle, route, currentTimeSec, onClose }: {
  vehicle: ActiveVehicle;
  route?: RailRoute;
  currentTimeSec: number;
  onClose: () => void;
}) {
  const meta     = KIND_META[vehicle.kind];
  const pct      = Math.round(vehicle.progress * 100);
  const elapsed  = Math.max(0, currentTimeSec - vehicle.t0);
  const remaining = Math.max(0, vehicle.endSec - currentTimeSec);
  const duration = vehicle.endSec - vehicle.t0;

  // Kalan duraklar: elapsed_secs > elapsed olan duraklar
  const upcomingStops = (route?.stops ?? [])
    .filter((s) => s.elapsed_secs > elapsed)
    .slice(0, 6);

  return (
    <SidePanel
      title={vehicle.name}
      subtitle={vehicle.headsign || "—"}
      icon={<meta.Icon size={17} className="text-white" />}
      accentColor={meta.color}
      onClose={onClose}
    >
      {/* Tür etiketi */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
          style={{ background: meta.color + "22", border: `1px solid ${meta.color}55`, color: meta.color }}
        >
          <meta.Icon size={10} />
          {meta.label}
        </span>
      </div>

      {/* Sefer ilerlemesi */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock size={11} />{fmtTime(vehicle.t0)}
          </span>
          <span className="font-semibold text-foreground tabular-nums">{pct}%</span>
          <span className="flex items-center gap-1.5">
            {fmtTime(vehicle.endSec)}<Navigation size={11} />
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: meta.color }}
          />
        </div>
      </div>

      {/* İstatistikler */}
      <StatGrid>
        <StatCard label="Toplam süre"  value={fmtMin(duration)} />
        <StatCard label="Geçen süre"   value={fmtMin(elapsed)} />
        <StatCard label="Kalan süre"   value={fmtMin(remaining)} />
        <StatCard label="Hat"          value={vehicle.name} />
      </StatGrid>

      {/* Yaklaşan duraklar */}
      {upcomingStops.length > 0 && (
        <div className="space-y-2">
          <SectionLabel><MapPin size={10} className="inline mr-1" />Yaklaşan Duraklar</SectionLabel>
          <div className="space-y-1.5">
            {upcomingStops.map((stop, i) => {
              const arrivalAbs = vehicle.t0 + stop.elapsed_secs;
              const inSecs = Math.max(0, arrivalAbs - currentTimeSec);
              return (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                    <span className="text-xs font-medium truncate max-w-[140px]">{stop.name}</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="text-xs font-mono font-medium">{fmtTime(arrivalAbs)}</div>
                    <div className="text-[10px] text-muted-foreground">~{fmtMin(inSecs)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </SidePanel>
  );
}
