import { X } from "lucide-react";

type PropsMap = Record<string, unknown>;

function pickString(p: PropsMap, keys: string[]): string {
  for (const k of keys) {
    const v = p[k];
    if (typeof v === "string" && v.trim().length) return v.trim();
  }
  return "";
}

function pickNumberLike(p: PropsMap, keys: string[]): string {
  const s = pickString(p, keys);
  if (!s) return "";
  // Genelde "12,34" gibi geliyor. UI'da daha okunur olsun diye sadece virgülü noktaya çeviriyoruz.
  return s.replace(",", ".").trim();
}

export function BusRouteDetailPanel({
  routeProps,
  onClose,
}: {
  routeProps: PropsMap;
  onClose: () => void;
}) {
  const hatKodu = pickString(routeProps, ["HAT_KODU", "HAT KODU", "HAT KODU"]);
  const hatAdi = pickString(routeProps, ["HAT_ADI", "HAT ADI", "HAT_AD"]);
  const yon = pickString(routeProps, ["YON"]);
  const guzergahAdi = pickString(routeProps, ["GUZERGAH_ADI", "GUZERGAH ADI"]);
  const hatBasi = pickString(routeProps, ["HAT_BASI", "HAT BASSI"]);
  const hatSonu = pickString(routeProps, ["HAT_SONU", "HAT SONU"]);
  const durum = pickString(routeProps, ["DURUM", "DURUMU"]);
  const guzergahKodu = pickString(routeProps, ["GUZERGAH_KODU"]);
  const uzunluk = pickNumberLike(routeProps, ["UZUNLUK"]);
  const sure = pickNumberLike(routeProps, ["SURE", "SÜRE"]);

  const title = hatKodu
    ? `${hatKodu}${hatAdi ? ` - ${hatAdi}` : ""}`
    : hatAdi || guzergahAdi || "Otobüs Hattı";

  return (
    <div className="absolute top-16 right-4 z-30 w-80 rounded-xl bg-gray-950/90 backdrop-blur-md border border-gray-800/50 shadow-[0_10px_35px_rgba(0,0,0,0.45)] overflow-hidden">
      <div className="px-3 py-3 bg-gradient-to-r from-blue-500/25 via-blue-500/10 to-transparent">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-blue-500/15 border border-white/5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-200">Otobüs Hattı</span>
            </div>

            <p className="text-sm font-semibold mt-2 break-words text-blue-50">{title}</p>
            {yon && <p className="text-xs text-gray-300 mt-1 break-words">Yön: {yon}</p>}
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

      <div className="p-3 space-y-2">
        {hatBasi && (
          <div className="rounded-lg border border-white/5 bg-gray-900/40 p-2">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-300">Başlangıç</div>
            <div className="text-xs text-gray-100 mt-1 break-words">{hatBasi}</div>
          </div>
        )}

        {hatSonu && (
          <div className="rounded-lg border border-white/5 bg-gray-900/40 p-2">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-300">Bitiş</div>
            <div className="text-xs text-gray-100 mt-1 break-words">{hatSonu}</div>
          </div>
        )}

        {(uzunluk || sure) && (
          <div className="grid grid-cols-2 gap-2">
            {uzunluk && (
              <div className="rounded-lg border border-white/5 bg-gray-900/40 p-2">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-300">Uzunluk</div>
                <div className="text-sm text-gray-100 mt-1 break-words">{uzunluk}</div>
              </div>
            )}
            {sure && (
              <div className="rounded-lg border border-white/5 bg-gray-900/40 p-2">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-300">Süre</div>
                <div className="text-sm text-gray-100 mt-1 break-words">{sure}</div>
              </div>
            )}
          </div>
        )}

        {(durum || guzergahKodu) && (
          <div className="rounded-lg border border-white/5 bg-gray-900/40 p-2">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-300">Detay</div>
            <div className="text-xs text-gray-100 mt-1 break-words">
              {[guzergahKodu ? `Güzergah Kodu: ${guzergahKodu}` : "", durum ? `Durum: ${durum}` : ""]
                .filter(Boolean)
                .join(" • ")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

