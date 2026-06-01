import { X as CloseIcon, MapPin, Clock, Info, Car, Navigation2 } from "lucide-react";
import type { IsparkLot } from "../types";
import type { RouteMode, RouteState } from "../hooks/useRoute";
import { DirectionsSection } from "./DirectionsSection";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "../lib/utils";

function formatNullableNumber(v: number | null | undefined) {
  if (v == null) return null;
  if (!Number.isFinite(v)) return null;
  return v.toLocaleString();
}

export function IsparkLotDetailPanel({
  lot,
  onClose,
  onGetDirections,
  route,
}: {
  lot: IsparkLot;
  onClose: () => void;
  onGetDirections?: (lat: number, lng: number, mode: RouteMode) => void;
  route?: RouteState;
}) {
  const isOpen = lot.isOpen;
  const statusColors = isOpen
    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
    : "bg-destructive/10 text-destructive border-destructive/20";

  const occupancyRatio = lot.capacity > 0 ? (lot.capacity - lot.emptyCapacity) / lot.capacity : 0;
  const occupancyPercentage = Math.round(occupancyRatio * 100);

  return (
    <Card className="absolute top-16 right-4 z-40 w-96 max-h-[calc(100vh-theme(spacing.20))] flex flex-col pointer-events-auto border-border/40 bg-background/90 backdrop-blur-md shadow-2xl overflow-hidden panel-slide-in">
      <div className="p-1 bg-gradient-to-r from-blue-500/20 via-blue-500/5 to-transparent">
        <CardHeader className="p-4 pb-2 space-y-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2.5 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 scale-110" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">
                  İSPARK Otoparkı
                </span>
              </div>
              
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold leading-tight break-words">
                  {lot.name || "İsimsiz Otopark"}
                </CardTitle>
                {lot.district && (
                  <CardDescription className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin size={12} className="shrink-0" />
                    {lot.district}
                  </CardDescription>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-accent/40 text-muted-foreground hover:text-foreground transition-all shrink-0"
              aria-label="Kapat"
            >
              {/* Burada daha önce çakışan X yerine yukarıda as ile tanımladığımız CloseIcon'u kullandık */}
              <CloseIcon size={18} />
            </button>
          </div>
        </CardHeader>
      </div>

      <ScrollArea className="flex-1">
        <CardContent className="p-4 pt-2 space-y-6">
          {/* Status and Occupancy */}
          <div className="grid grid-cols-2 gap-3">
            <div className={cn("rounded-xl border p-3 flex flex-col gap-1.5 transition-colors", statusColors)}>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Durum</span>
              <span className="text-sm font-semibold">{isOpen ? "Açık" : "Kapalı"}</span>
            </div>
            
            <div className="rounded-xl border border-border/40 bg-muted/20 p-3 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Oto Tip</span>
              <span className="text-sm font-semibold">{lot.parkType || "Belirtilmemiş"}</span>
            </div>
          </div>

          {/* Capacity Stats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">
              <span>Kapasite Durumu</span>
              <span>%{occupancyPercentage} Dolu</span>
            </div>
            
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/20">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  occupancyPercentage > 90 ? "bg-destructive" : 
                  occupancyPercentage > 70 ? "bg-amber-500" : "bg-blue-500"
                )}
                style={{ width: `${occupancyPercentage}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-muted/30 border border-border/20">
                <span className="text-[10px] text-muted-foreground">Toplam</span>
                <span className="font-mono text-sm font-bold">{lot.capacity.toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-0.5 px-3 py-2 rounded-lg bg-muted/30 border border-border/20">
                <span className="text-[10px] text-muted-foreground">Boş Yer</span>
                <span className="font-mono text-sm font-bold text-emerald-500">{lot.emptyCapacity.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-0.5">
              <Info size={12} />
              Ek Bilgiler
            </div>
            
            <div className="grid gap-2">
              {formatNullableNumber(lot.freeTimeMinutes ?? null) && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/5">
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Clock size={16} className="text-blue-500" />
                    Ücretsiz Süre
                  </div>
                  <span className="text-sm font-semibold">{formatNullableNumber(lot.freeTimeMinutes ?? null)} dk</span>
                </div>
              )}

              {lot.workHours && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/5">
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Car size={16} className="text-blue-500" />
                    Çalışma Saatleri
                  </div>
                  <span className="text-sm font-semibold text-right max-w-[150px]">{lot.workHours}</span>
                </div>
              )}
            </div>
          </div>

          {/* Directions Section */}
          <div className="pt-2 border-t border-border/40">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-4 px-0.5">
              <Navigation2 size={12} />
              Ulaşım & Yol Tarifi
            </div>
            <DirectionsSection 
              lat={lot.lat} 
              lng={lot.lng} 
              onGetDirections={onGetDirections} 
              route={route} 
            />
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}