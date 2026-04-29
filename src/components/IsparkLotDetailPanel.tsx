import { X } from "lucide-react";
import type { IsparkLot } from "../types";

function formatNullableNumber(v: number | null | undefined) {
  if (v == null) return null;
  if (!Number.isFinite(v)) return null;
  return v.toLocaleString();
}

export function IsparkLotDetailPanel({ lot, onClose }: { lot: IsparkLot; onClose: () => void }) {
  const isOpen = lot.isOpen;
  const statusPill = isOpen
    ? { bg: "bg-emerald-500/15", text: "text-emerald-200", border: "border-emerald-500/20" }
    : { bg: "bg-rose-500/15", text: "text-rose-200", border: "border-rose-500/20" };

  const occupancyRatio = lot.capacity > 0 ? (lot.capacity - lot.emptyCapacity) / lot.capacity : 0;

  return (
    <div className="absolute top-16 right-4 z-30 w-80 rounded-xl bg-gray-950/90 backdrop-blur-md border border-gray-800/50 shadow-[0_10px_35px_rgba(0,0,0,0.45)] overflow-hidden">
      <div className="px-3 py-3 bg-gradient-to-r from-blue-500/20 via-blue-500/10 to-transparent">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-blue-500/15 border border-white/5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-200">İSPARK Otoparkı</span>
            </div>

            <p className="text-sm font-semibold mt-2 break-words text-blue-50">{lot.name || "Otopark"}</p>
            {lot.district && <p className="text-xs text-gray-400 mt-1 break-words">{lot.district}</p>}
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
        <div className={`rounded-lg border p-2 ${statusPill.bg} ${statusPill.border}`}>
          <div className={`text-xs uppercase tracking-wider font-semibold ${statusPill.text}`}>Durum</div>
          <div className="text-sm text-gray-100 mt-1">{isOpen ? "Açık" : "Kapalı"}</div>
        </div>

        {lot.parkType && (
          <div className="rounded-lg border border-white/5 bg-gray-900/40 p-2">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-300">Tip</div>
            <div className="text-sm text-gray-100 mt-1 break-words">{lot.parkType}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/5 bg-gray-900/40 p-2">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-300">Kapasite</div>
            <div className="text-sm text-gray-100 mt-1">{lot.capacity.toLocaleString()}</div>
          </div>
          <div className="rounded-lg border border-white/5 bg-gray-900/40 p-2">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-300">Boş Kapasite</div>
            <div className="text-sm text-gray-100 mt-1">{lot.emptyCapacity.toLocaleString()}</div>
          </div>
        </div>

        <div className="rounded-lg border border-white/5 bg-gray-900/40 p-2">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-300">Doluluk</div>
          <div className="text-sm text-gray-100 mt-1">{Math.round(occupancyRatio * 100)}%</div>
        </div>

        {formatNullableNumber(lot.freeTimeMinutes ?? null) && (
          <div className="rounded-lg border border-white/5 bg-gray-900/40 p-2">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-300">Ücretsiz süre</div>
            <div className="text-sm text-gray-100 mt-1">{formatNullableNumber(lot.freeTimeMinutes ?? null)} dk</div>
          </div>
        )}

        {lot.workHours && (
          <div className="rounded-lg border border-white/5 bg-gray-900/40 p-2">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-300">Çalışma saatleri</div>
            <div className="text-sm text-gray-100 mt-1 break-words">{lot.workHours}</div>
          </div>
        )}
      </div>
    </div>
  );
}

