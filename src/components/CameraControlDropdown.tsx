import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, Lock, Unlock, Compass, Check } from "lucide-react";
import { cn } from "../lib/utils";

interface CameraControlDropdownProps {
  bearingLocked: boolean;
  cameraLocked: boolean;
  onToggleBearingLock: () => void;
  onToggleCameraLock: () => void;
  onResetNorth: () => void;
}

export function CameraControlDropdown({
  bearingLocked,
  cameraLocked,
  onToggleBearingLock,
  onToggleCameraLock,
  onResetNorth,
}: CameraControlDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [open]);

  const anyActive = bearingLocked || cameraLocked;

  return (
    <div ref={ref} className="relative select-none">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={cn(
          "rounded-xl backdrop-blur-md border shadow-xl p-3 transition-all hover:scale-105 active:scale-95 group relative",
          anyActive
            ? "bg-primary/10 border-primary/40 text-primary"
            : "bg-background/90 border-border/40 text-muted-foreground hover:text-foreground"
        )}
        aria-label="Kamera kontrolleri"
        title="Kamera kontrolleri"
      >
        <SlidersHorizontal size={18} />
        {anyActive && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-background/95 backdrop-blur-md border border-border/40 shadow-2xl p-1.5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground font-bold border-b border-border/40 mb-1">
            Kamera Kontrolleri
          </div>

          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => { onToggleBearingLock(); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all hover:bg-accent/50",
                bearingLocked ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {bearingLocked ? <Lock size={16} className="shrink-0" /> : <Unlock size={16} className="shrink-0 opacity-50" />}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold leading-tight">Yönü Kilitle</div>
                <div className="text-[10px] opacity-70 mt-0.5 font-medium">{bearingLocked ? "Kilitlendi — Çözmek için bas" : "Bulunulan açıyı sabitler"}</div>
              </div>
              {bearingLocked && <Check size={14} className="shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => { onToggleCameraLock(); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all hover:bg-accent/50",
                cameraLocked ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {cameraLocked ? <Lock size={16} className="shrink-0" /> : <Unlock size={16} className="shrink-0 opacity-50" />}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold leading-tight">Kamerayı Dondur</div>
                <div className="text-[10px] opacity-70 mt-0.5 font-medium">{cameraLocked ? "Kilitlendi — Çözmek için bas" : "Hareket/Zoomu dondurur"}</div>
              </div>
              {cameraLocked && <Check size={14} className="shrink-0" />}
            </button>
          </div>

          <div className="h-px bg-border/40 my-1.5 mx-1" />

          <button
            type="button"
            onClick={() => { onResetNorth(); setOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all hover:bg-accent/50 text-muted-foreground hover:text-foreground"
          >
            <Compass size={16} className="shrink-0 opacity-50" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold leading-tight">Kuzeye Hizala</div>
              <div className="text-[10px] opacity-70 mt-0.5 font-medium">Haritayı 0°'a döndürür</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}