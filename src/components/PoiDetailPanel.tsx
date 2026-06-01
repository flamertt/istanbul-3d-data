import { X, Navigation2, Info, Layers } from "lucide-react";
import type { TurkeyPoiKind, TurkeyPoiPoint } from "../layers/turkeyOverlayLayers";
import type { RouteMode, RouteState } from "../hooks/useRoute";
import { DirectionsSection } from "./DirectionsSection";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "../lib/utils";

type PoiTheme = {
  label: string;
  headerStripe: string;
  pillBg: string;
  pillText: string;
  dotBg: string;
  titleText: string;
  subtitleLabel: string;
  subtitlePillBg: string;
  subtitlePillText: string;
  extraLabel: string;
  extraPanelBorder: string;
  extraPanelBg: string;
  extraText: string;
};

const POI_THEMES: Record<TurkeyPoiKind, PoiTheme> = {
  bus_stop: {
    label: "Otobüs Durağı",
    headerStripe: "bg-gradient-to-r from-blue-500/30 via-blue-500/10 to-transparent",
    pillBg: "bg-blue-500/15",
    pillText: "text-blue-200",
    dotBg: "bg-blue-400",
    titleText: "text-blue-100",
    subtitleLabel: "İlçe",
    subtitlePillBg: "bg-blue-500/10",
    subtitlePillText: "text-blue-200",
    extraLabel: "Kod / Tip",
    extraPanelBorder: "border-blue-500/20",
    extraPanelBg: "bg-blue-950/20",
    extraText: "text-blue-100",
  },
  bus_route: {
    label: "Otobüs Hattı",
    headerStripe: "bg-gradient-to-r from-blue-500/30 via-blue-500/10 to-transparent",
    pillBg: "bg-blue-500/15",
    pillText: "text-blue-200",
    dotBg: "bg-blue-400",
    titleText: "text-blue-100",
    subtitleLabel: "Bilgi",
    subtitlePillBg: "bg-blue-500/10",
    subtitlePillText: "text-blue-200",
    extraLabel: "Detay",
    extraPanelBorder: "border-blue-500/20",
    extraPanelBg: "bg-blue-950/20",
    extraText: "text-blue-100",
  },
  rail_line: {
    label: "Raylı Sistem Hattı",
    headerStripe: "bg-gradient-to-r from-violet-500/30 via-violet-500/10 to-transparent",
    pillBg: "bg-violet-500/15",
    pillText: "text-violet-200",
    dotBg: "bg-violet-400",
    titleText: "text-violet-100",
    subtitleLabel: "Bilgi",
    subtitlePillBg: "bg-violet-500/10",
    subtitlePillText: "text-violet-200",
    extraLabel: "Detay",
    extraPanelBorder: "border-violet-500/20",
    extraPanelBg: "bg-violet-950/20",
    extraText: "text-violet-100",
  },
  rail_station: {
    label: "Raylı Sistem İstasyonu",
    headerStripe: "bg-gradient-to-r from-violet-500/30 via-violet-500/10 to-transparent",
    pillBg: "bg-violet-500/15",
    pillText: "text-violet-200",
    dotBg: "bg-violet-400",
    titleText: "text-violet-100",
    subtitleLabel: "Aşama / Hat",
    subtitlePillBg: "bg-violet-500/10",
    subtitlePillText: "text-violet-200",
    extraLabel: "Birim / Proje",
    extraPanelBorder: "border-violet-500/20",
    extraPanelBg: "bg-violet-950/20",
    extraText: "text-violet-100",
  },
  bike_lane: {
    label: "Bisiklet Yolu",
    headerStripe: "bg-gradient-to-r from-emerald-500/30 via-emerald-500/10 to-transparent",
    pillBg: "bg-emerald-500/15",
    pillText: "text-emerald-200",
    dotBg: "bg-emerald-400",
    titleText: "text-emerald-100",
    subtitleLabel: "Bilgi",
    subtitlePillBg: "bg-emerald-500/10",
    subtitlePillText: "text-emerald-200",
    extraLabel: "Detay",
    extraPanelBorder: "border-emerald-500/20",
    extraPanelBg: "bg-emerald-950/20",
    extraText: "text-emerald-100",
  },
  micromobility_park: {
    label: "Mikromobilite Parkı",
    headerStripe: "bg-gradient-to-r from-orange-500/30 via-orange-500/10 to-transparent",
    pillBg: "bg-orange-500/15",
    pillText: "text-orange-200",
    dotBg: "bg-orange-400",
    titleText: "text-orange-100",
    subtitleLabel: "Bölge",
    subtitlePillBg: "bg-orange-500/10",
    subtitlePillText: "text-orange-200",
    extraLabel: "Park Tipi",
    extraPanelBorder: "border-orange-500/20",
    extraPanelBg: "bg-orange-950/20",
    extraText: "text-orange-100",
  },
  ev_charging_station: {
    label: "EV Şarj Noktası",
    headerStripe: "bg-gradient-to-r from-amber-500/30 via-amber-500/10 to-transparent",
    pillBg: "bg-amber-500/15",
    pillText: "text-amber-200",
    dotBg: "bg-amber-400",
    titleText: "text-amber-100",
    subtitleLabel: "Hizmet / İşletme",
    subtitlePillBg: "bg-amber-500/10",
    subtitlePillText: "text-amber-200",
    extraLabel: "Numara / Şirket",
    extraPanelBorder: "border-amber-500/20",
    extraPanelBg: "bg-amber-950/20",
    extraText: "text-amber-100",
  },
  green_area: {
    label: "Yeşil Alan",
    headerStripe: "bg-gradient-to-r from-emerald-500/30 via-emerald-500/10 to-transparent",
    pillBg: "bg-emerald-500/15",
    pillText: "text-emerald-200",
    dotBg: "bg-emerald-400",
    titleText: "text-emerald-100",
    subtitleLabel: "Bilgi",
    subtitlePillBg: "bg-emerald-500/10",
    subtitlePillText: "text-emerald-200",
    extraLabel: "Detay",
    extraPanelBorder: "border-emerald-500/20",
    extraPanelBg: "bg-emerald-950/20",
    extraText: "text-emerald-100",
  },
  toilet: {
    label: "Şehir Tuvaleti",
    headerStripe: "bg-gradient-to-r from-rose-500/30 via-rose-500/10 to-transparent",
    pillBg: "bg-rose-500/15",
    pillText: "text-rose-200",
    dotBg: "bg-rose-400",
    titleText: "text-rose-100",
    subtitleLabel: "İlçe / Hizmet",
    subtitlePillBg: "bg-rose-500/10",
    subtitlePillText: "text-rose-200",
    extraLabel: "Tip / Bakım",
    extraPanelBorder: "border-rose-500/20",
    extraPanelBg: "bg-rose-950/20",
    extraText: "text-rose-100",
  },
  taxi_stop: {
    label: "Taksi Durağı",
    headerStripe: "bg-gradient-to-r from-fuchsia-500/30 via-fuchsia-500/10 to-transparent",
    pillBg: "bg-fuchsia-500/15",
    pillText: "text-fuchsia-200",
    dotBg: "bg-fuchsia-400",
    titleText: "text-fuchsia-100",
    subtitleLabel: "Bilgi",
    subtitlePillBg: "bg-fuchsia-500/10",
    subtitlePillText: "text-fuchsia-200",
    extraLabel: "Detay",
    extraPanelBorder: "border-fuchsia-500/20",
    extraPanelBg: "bg-fuchsia-950/20",
    extraText: "text-fuchsia-100",
  },
  taxi_dolmus_stop: {
    label: "Dolmuş Durağı",
    headerStripe: "bg-gradient-to-r from-red-500/30 via-rose-500/10 to-transparent",
    pillBg: "bg-rose-500/15",
    pillText: "text-rose-200",
    dotBg: "bg-rose-400",
    titleText: "text-rose-100",
    subtitleLabel: "Açıklama",
    subtitlePillBg: "bg-rose-500/10",
    subtitlePillText: "text-rose-200",
    extraLabel: "Detay",
    extraPanelBorder: "border-rose-500/20",
    extraPanelBg: "bg-rose-950/20",
    extraText: "text-rose-100",
  },
  minibus_stop: {
    label: "Minibüs Durağı",
    headerStripe: "bg-gradient-to-r from-emerald-500/30 via-teal-500/10 to-transparent",
    pillBg: "bg-emerald-500/15",
    pillText: "text-emerald-200",
    dotBg: "bg-emerald-400",
    titleText: "text-emerald-100",
    subtitleLabel: "Bilgi",
    subtitlePillBg: "bg-emerald-500/10",
    subtitlePillText: "text-emerald-200",
    extraLabel: "Detay",
    extraPanelBorder: "border-emerald-500/20",
    extraPanelBg: "bg-emerald-950/20",
    extraText: "text-emerald-100",
  },
  sea_station: {
    label: "Deniz İstasyonu",
    headerStripe: "bg-gradient-to-r from-sky-500/30 via-cyan-500/10 to-transparent",
    pillBg: "bg-cyan-500/15",
    pillText: "text-cyan-200",
    dotBg: "bg-cyan-400",
    titleText: "text-cyan-100",
    subtitleLabel: "Bilgi",
    subtitlePillBg: "bg-cyan-500/10",
    subtitlePillText: "text-cyan-200",
    extraLabel: "Detay",
    extraPanelBorder: "border-blue-500/20",
    extraPanelBg: "bg-blue-950/20",
    extraText: "text-blue-100",
  },
};

export function PoiDetailPanel({
  poi,
  onClose,
  onGetDirections,
  route,
}: {
  poi: TurkeyPoiPoint;
  onClose: () => void;
  onGetDirections?: (lat: number, lng: number, mode: RouteMode) => void;
  route?: RouteState;
}) {
  const theme = POI_THEMES[poi.kind];

  return (
    <Card className="absolute top-16 right-4 z-40 w-96 max-h-[calc(100vh-theme(spacing.20))] flex flex-col pointer-events-auto border-border/40 bg-background/90 backdrop-blur-md shadow-2xl overflow-hidden panel-slide-in">
      <div className={cn("p-1", theme.headerStripe)}>
        <CardHeader className="p-4 pb-2 space-y-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2.5 min-w-0">
              <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/40", theme.pillBg)}>
                <span className={cn("w-1.5 h-1.5 rounded-full scale-110", theme.dotBg)} />
                <span className={cn("text-[10px] font-bold uppercase tracking-widest", theme.pillText)}>
                  {theme.label}
                </span>
              </div>
              
              <CardTitle className={cn("text-lg font-bold leading-tight break-words", theme.titleText)}>
                {poi.title || theme.label}
              </CardTitle>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-accent/40 text-muted-foreground hover:text-foreground transition-all shrink-0"
              aria-label="Kapat"
            >
              <X size={18} />
            </button>
          </div>
        </CardHeader>
      </div>

      <ScrollArea className="flex-1">
        <CardContent className="p-4 pt-2 space-y-4">
          {poi.subtitle && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                <Info size={12} />
                {theme.subtitleLabel}
              </div>
              <div className={cn("rounded-xl border border-border/40 p-3 text-sm bg-muted/20", theme.subtitlePillText)}>
                {poi.subtitle}
              </div>
            </div>
          )}

          {poi.extra && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                <Layers size={12} />
                {theme.extraLabel}
              </div>
              <div className={cn("rounded-xl border p-3 text-sm leading-relaxed", theme.extraPanelBorder, theme.extraPanelBg, theme.extraText)}>
                {poi.extra}
              </div>
            </div>
          )}

          {poi.position && (
            <div className="pt-2 border-t border-border/40">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-3">
                <Navigation2 size={12} />
                Ulaşım & Yol Tarifi
              </div>
              <DirectionsSection 
                lat={poi.position[1]} 
                lng={poi.position[0]} 
                onGetDirections={onGetDirections} 
                route={route} 
              />
            </div>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}

