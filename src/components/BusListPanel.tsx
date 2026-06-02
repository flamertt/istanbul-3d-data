import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Bus, TrainFront, Train, Ship } from "lucide-react";
import type { ActiveBus } from "../layers/busSimLayer";
import type { ActiveVehicle } from "../layers/railSimLayer";

const PAGE_SIZE = 20;

function fmtTime(sec: number) {
  const s = ((sec % 86400) + 86400) % 86400;
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
}

type Tab = "bus" | "metro" | "marmaray" | "ferry";

const TAB_META: Record<Tab, { label: string; color: string; Icon: React.ElementType }> = {
  bus:      { label: "Otobüs",   color: "#2563eb", Icon: Bus },
  metro:    { label: "Metro",    color: "#eab308", Icon: TrainFront },
  marmaray: { label: "Marmaray", color: "#dc2626", Icon: Train },
  ferry:    { label: "Vapur",    color: "#0e7490", Icon: Ship },
};

interface BusListPanelProps {
  buses: ActiveBus[];
  railVehicles: ActiveVehicle[];
  selectedBus: ActiveBus | null;
  selectedVehicle: ActiveVehicle | null;
  onBusClick: (bus: ActiveBus) => void;
  onRailClick: (vehicle: ActiveVehicle) => void;
}

export function BusListPanel({
  buses, railVehicles, selectedBus, selectedVehicle, onBusClick, onRailClick
}: BusListPanelProps) {
  const [tab, setTab] = useState<Tab>("bus");
  const [page, setPage] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  const metro    = railVehicles.filter((v) => v.kind === "metro" || v.kind === "funicular");
  const marmaray = railVehicles.filter((v) => v.kind === "marmaray");
  const ferry    = railVehicles.filter((v) => v.kind === "ferry");

  const hasAny = buses.length > 0 || metro.length > 0 || marmaray.length > 0 || ferry.length > 0;

  const counts = { bus: buses.length, metro: metro.length, marmaray: marmaray.length, ferry: ferry.length };
  const availableTabs: Tab[] = (["bus", "metro", "marmaray", "ferry"] as Tab[]).filter((t) => counts[t] > 0);

  const effectiveTab: Tab = availableTabs.includes(tab) ? tab : (availableTabs[0] ?? "bus");

  useEffect(() => { setPage(0); }, [effectiveTab, buses.length, metro.length, marmaray.length, ferry.length]);

  if (!hasAny) return null;

  type Item = {
    key: string;
    color: [number, number, number];
    name: string;
    headsign: string;
    timeSec: number;
    progress: number;
    bus?: ActiveBus;
    rail?: ActiveVehicle;
  };

  const items: Item[] =
    effectiveTab === "bus"
      ? [...buses]
          .sort((a, b) => a.route.localeCompare(b.route, "tr", { numeric: true }))
          .map((b) => ({ key: `${b.route}|${b.headsign}`, color: b.color, name: b.route, headsign: b.headsign, timeSec: b.startTimeSec, progress: b.progress, bus: b }))
      : effectiveTab === "metro"
      ? [...metro]
          .sort((a, b) => a.name.localeCompare(b.name, "tr", { numeric: true }))
          .map((v) => ({ key: v.routeKey, color: v.color, name: v.name, headsign: v.headsign, timeSec: v.t0, progress: v.progress, rail: v }))
      : effectiveTab === "marmaray"
      ? [...marmaray]
          .sort((a, b) => a.name.localeCompare(b.name, "tr", { numeric: true }))
          .map((v) => ({ key: v.routeKey, color: v.color, name: v.name, headsign: v.headsign, timeSec: v.t0, progress: v.progress, rail: v }))
      : [...ferry]
          .sort((a, b) => a.name.localeCompare(b.name, "tr", { numeric: true }))
          .map((v) => ({ key: v.routeKey, color: v.color, name: v.name, headsign: v.headsign, timeSec: v.t0, progress: v.progress, rail: v }));

  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const pageItems  = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const meta = TAB_META[effectiveTab];

  return (
    <div
      className="absolute top-6 right-6 flex flex-col pointer-events-auto bg-background/80 backdrop-blur-md border border-border/40 shadow-lg overflow-hidden rounded-xl"
      style={{ zIndex: 25, width: 288, maxHeight: collapsed ? undefined : "calc(100vh - 8rem)" }}
    >
      {/* Header — LayerControl başlığıyla aynı stil */}
      <div
        className="px-4 py-3 border-b border-border/40 bg-muted/30 flex items-center gap-2 shrink-0 cursor-pointer select-none"
        onClick={() => setCollapsed((c) => !c)}
      >
        <meta.Icon size={16} style={{ color: meta.color }} className="opacity-70" />
        <span className="text-xs font-semibold uppercase tracking-widest text-foreground flex-1">
          Aktif Hatlar
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/60 mr-1">{items.length}</span>
        <div className="text-muted-foreground/50 hover:text-foreground transition-colors">
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Tabs */}
          <div className="flex shrink-0 border-b border-border/40">
            {availableTabs.map((t) => {
              const m = TAB_META[t];
              const active = effectiveTab === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); setPage(0); }}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all relative ${active ? "bg-muted/40" : "hover:bg-muted/20"}`}
                >
                  <m.Icon size={14} style={{ color: active ? m.color : undefined }} className={active ? "" : "text-muted-foreground"} />
                  <span className={`text-[9px] font-semibold ${active ? "" : "text-muted-foreground"}`} style={active ? { color: m.color } : undefined}>
                    {m.label}
                  </span>
                  <span className={`text-[8px] font-mono ${active ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                    {counts[t]}
                  </span>
                  {active && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: m.color }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* List */}
          <div
            className="overflow-y-auto flex-1
              [&::-webkit-scrollbar]:w-1.5
              [&::-webkit-scrollbar-track]:bg-transparent
              [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20
              [&::-webkit-scrollbar-thumb]:rounded-full
              hover:[&::-webkit-scrollbar-thumb]:bg-primary/40
              [scrollbar-width:thin]
              [scrollbar-color:rgba(156,163,175,0.2)_transparent]"
          >
            {pageItems.length === 0 ? (
              <p className="text-[10px] text-gray-600 text-center py-6">Aktif sefer yok</p>
            ) : pageItems.map((item) => {
              const accent = `rgb(${item.color.join(",")})`;
              const tabColor = meta.color;
              const isSelected = item.bus
                ? selectedBus?.route === item.name && selectedBus?.headsign === item.headsign
                : item.rail ? selectedVehicle?.routeKey === item.rail.routeKey : false;
              const pct = Math.round(item.progress * 100);

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (item.bus) onBusClick(item.bus);
                    else if (item.rail) onRailClick(item.rail);
                  }}
                  className={`w-full text-left px-4 py-2.5 border-b border-border/30 last:border-0 transition-colors ${isSelected ? "bg-muted/40" : "hover:bg-muted/20"}`}
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tabColor }} />
                    <span className="text-xs font-semibold text-foreground leading-none flex-1 truncate">{item.name}</span>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">{fmtTime(item.timeSec)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate mb-2 pl-4">{item.headsign || "—"}</p>
                  <div className="pl-4">
                    <div className="h-px rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: tabColor }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 shrink-0 border-t border-border/40 bg-muted/20">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={13} />
                <span>Önceki</span>
              </button>
              <span className="text-xs font-semibold text-muted-foreground">{page + 1} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                <span>Sonraki</span>
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
