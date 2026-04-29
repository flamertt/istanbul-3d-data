import { X } from "lucide-react";
import type { TurkeyPoiKind, TurkeyPoiPoint } from "../layers/turkeyOverlayLayers";

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

export function PoiDetailPanel({ poi, onClose }: { poi: TurkeyPoiPoint; onClose: () => void }) {
  const theme = POI_THEMES[poi.kind];

  return (
    <div className="absolute top-16 right-4 z-30 w-80 rounded-xl bg-gray-950/90 backdrop-blur-md border border-gray-800/50 shadow-[0_10px_35px_rgba(0,0,0,0.45)] overflow-hidden">
      <div className={`px-3 py-3 ${theme.headerStripe}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {/* En üstte sabit 'POI' yazısı yerine POI türüne özel badge */}
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full ${theme.pillBg} border border-white/5`}>
              <span className={`w-2 h-2 rounded-full ${theme.dotBg}`} />
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${theme.pillText}`}>{theme.label}</span>
            </div>

            <p className={`text-sm font-semibold mt-2 break-words ${theme.titleText}`}>{poi.title || theme.label}</p>

            {poi.subtitle && (
              <div className={`mt-2 rounded-lg border border-white/5 ${theme.subtitlePillBg} ${theme.subtitlePillText} p-2`}>
                <div className="text-[11px] uppercase tracking-wider font-semibold">{theme.subtitleLabel}</div>
                <div className="text-xs mt-1 break-words">{poi.subtitle}</div>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-800/60 hover:text-gray-200 transition-colors flex items-center justify-center"
            aria-label="Kapat"
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="p-3">
        {poi.extra && (
          <div className={`mt-2 rounded-lg border border-white/5 ${theme.extraPanelBorder} ${theme.extraPanelBg} p-2`}>
            <div className={`text-[11px] uppercase tracking-wider font-semibold ${theme.extraText}`}>{theme.extraLabel}</div>
            <div className={`text-xs mt-1 break-words ${theme.extraText}`}>{poi.extra}</div>
          </div>
        )}
      </div>
    </div>
  );
}

