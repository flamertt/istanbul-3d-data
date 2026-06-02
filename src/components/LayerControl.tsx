import React from "react";
import {
  Bus, Train, TrainFront, Bike, Waypoints, Zap, Trees, PersonStanding,
  Car, Navigation, Ship, GraduationCap, School, Moon, Theater,
  Binoculars, Castle, Building2, Trophy, LibraryIcon,
  ParkingSquare, MapPin, Layers, Utensils, Heart, Cable
} from "lucide-react";

function ObeliskIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Tepe */}
      <polygon points="8,1 6.2,4 9.8,4" fill="currentColor" />
      {/* Gövde üst */}
      <rect x="6.5" y="4" width="3" height="5" fill="currentColor" rx="0.2" />
      {/* Gövde alt — biraz daha geniş */}
      <rect x="5.8" y="9" width="4.4" height="3.5" fill="currentColor" rx="0.2" />
      {/* Kaide */}
      <rect x="4.5" y="12.5" width="7" height="1.5" fill="currentColor" rx="0.3" />
      {/* Gölge çizgisi */}
      <line x1="9" y1="4.5" x2="9.5" y2="12" stroke="white" strokeOpacity="0.15" strokeWidth="0.5" />
    </svg>
  );
}
import type { TurkeyOverlayFlags } from "../hooks/useTurkeyOverlays";
import { Switch } from "./ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Card } from "./ui/card";
import { cn } from "../lib/utils";

interface LayerControlProps {
  isparkEnabled: boolean;
  setIsparkEnabled: (val: boolean | ((s: boolean) => boolean)) => void;
  overlayFlags: TurkeyOverlayFlags;
  toggleFlag: (key: keyof TurkeyOverlayFlags) => void;
  landmarkFlags: Record<string, boolean>;
  toggleLandmark: (category: string) => void;
  busSimEnabled?: boolean;
  setBusSimEnabled?: (val: boolean | ((s: boolean) => boolean)) => void;
  busSimLoading?: boolean;
  metroSimEnabled?: boolean;
  setMetroSimEnabled?: (val: boolean | ((s: boolean) => boolean)) => void;
  marmaraySimEnabled?: boolean;
  setMarmaraySimEnabled?: (val: boolean | ((s: boolean) => boolean)) => void;
  tramSimEnabled?: boolean;
  setTramSimEnabled?: (val: boolean | ((s: boolean) => boolean)) => void;
  ferrySimEnabled?: boolean;
  setFerrySimEnabled?: (val: boolean | ((s: boolean) => boolean)) => void;
  railSimLoading?: boolean;
  className?: string;
}

export const LayerControl: React.FC<LayerControlProps> = ({
  isparkEnabled,
  setIsparkEnabled,
  overlayFlags,
  toggleFlag,
  landmarkFlags,
  toggleLandmark,
  busSimEnabled = false,
  setBusSimEnabled,
  busSimLoading = false,
  metroSimEnabled = false,
  setMetroSimEnabled,
  marmaraySimEnabled = false,
  setMarmaraySimEnabled,
  tramSimEnabled = false,
  setTramSimEnabled,
  ferrySimEnabled = false,
  setFerrySimEnabled,
  railSimLoading = false,
  className
}) => {
  return (
    <Card className={cn(
      "w-72 flex-1 flex flex-col pointer-events-auto bg-background/80 backdrop-blur-md border border-border/40 shadow-lg overflow-hidden rounded-xl",
      className
    )}>
      {/* Başlık alanı */}
      <div className="px-4 py-3 border-b border-border/40 bg-muted/30 flex items-center gap-2 shrink-0">
        <Layers size={16} className="text-primary/70" />
        <span className="text-xs font-semibold uppercase tracking-widest text-foreground">Harita Katmanları</span>
      </div>

      {/* Kaydırma alanı ve Özel İnce Scrollbar Stili */}
      <div className="flex-1 overflow-y-auto p-2 pr-1
        [&::-webkit-scrollbar]:w-1.5
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20
        [&::-webkit-scrollbar-thumb]:rounded-full
        hover:[&::-webkit-scrollbar-thumb]:bg-primary/40
        [scrollbar-width:thin]
        [scrollbar-color:rgba(156,163,175,0.2)_transparent]"
      >
        <Accordion type="multiple" defaultValue={["transit", "road", "urban", "landmarks"]}>
          {/* Toplu Taşıma */}
          <AccordionItem value="transit" className="border-gray-800/50 px-2">
            <AccordionTrigger className="text-[11px] uppercase tracking-wider text-gray-400 hover:no-underline py-3">
              Toplu Taşıma
            </AccordionTrigger>
            <AccordionContent className="space-y-1">
              <LayerItem icon={<ParkingSquare size={16} />} label="İSPARK Otoparkları" checked={isparkEnabled} onCheckedChange={() => setIsparkEnabled(s => !s)} color="emerald" />
              <div className="h-px bg-gray-800/60 my-1" />
              {setBusSimEnabled && (
                <LayerItem icon={<Bus size={16} />} label={busSimLoading ? "Yükleniyor…" : "Otobüs"} checked={busSimEnabled} onCheckedChange={() => setBusSimEnabled(s => !s)} color="blue" />
              )}
              {setMetroSimEnabled && (
                <LayerItem icon={<TrainFront size={16} />} label={railSimLoading ? "Yükleniyor…" : "Metro"} checked={metroSimEnabled} onCheckedChange={() => setMetroSimEnabled(s => !s)} color="red" />
              )}
              {setMarmaraySimEnabled && (
                <LayerItem icon={<Train size={16} />} label={railSimLoading ? "Yükleniyor…" : "Marmaray"} checked={marmaraySimEnabled} onCheckedChange={() => setMarmaraySimEnabled(s => !s)} color="indigo" />
              )}
              {setTramSimEnabled && (
                <LayerItem icon={<Cable size={16} />} label={railSimLoading ? "Yükleniyor…" : "Tramvay & Füniküler"} checked={tramSimEnabled} onCheckedChange={() => setTramSimEnabled(s => !s)} color="cyan" />
              )}
              {setFerrySimEnabled && (
                <LayerItem icon={<Ship size={16} />} label={railSimLoading ? "Yükleniyor…" : "Vapur"} checked={ferrySimEnabled} onCheckedChange={() => setFerrySimEnabled(s => !s)} color="cyan" />
              )}
              <div className="h-px bg-gray-800/60 my-1" />
              <LayerItem icon={<Train size={16} />} label="Raylı Hatlar" checked={overlayFlags.railLines} onCheckedChange={() => toggleFlag("railLines")} color="amber" />
              <LayerItem icon={<TrainFront size={16} />} label="Raylı İstasyonlar" checked={overlayFlags.railStations} onCheckedChange={() => toggleFlag("railStations")} color="violet" />
              <LayerItem icon={<Ship size={16} />} label="Deniz Ulaşımı" checked={overlayFlags.seaStations} onCheckedChange={() => toggleFlag("seaStations")} color="cyan" />
              <LayerItem icon={<Bus size={16} />} label="Otobüs Hatları" checked={overlayFlags.busRoutes} onCheckedChange={() => toggleFlag("busRoutes")} color="blue" />
              <LayerItem icon={<MapPin size={16} />} label="Otobüs Durakları" checked={overlayFlags.busStops} onCheckedChange={() => toggleFlag("busStops")} color="blue" />
              <LayerItem icon={<Bus size={16} className="opacity-70" />} label="Minibüs Hatları" checked={overlayFlags.minibusRoutes} onCheckedChange={() => toggleFlag("minibusRoutes")} color="teal" />
              <LayerItem icon={<MapPin size={16} className="opacity-70" />} label="Minibüs Durakları" checked={overlayFlags.minibusStops} onCheckedChange={() => toggleFlag("minibusStops")} color="teal" />
            </AccordionContent>
          </AccordionItem>

          {/* Karayolu */}
          <AccordionItem value="road" className="border-gray-800/50 px-2">
            <AccordionTrigger className="text-[11px] uppercase tracking-wider text-gray-400 hover:no-underline py-3">
              Karayolu & Ulaşım
            </AccordionTrigger>
            <AccordionContent className="space-y-1">
              <LayerItem icon={<Car size={16} />} label="Taksi Durakları" checked={overlayFlags.taxiStops} onCheckedChange={() => toggleFlag("taxiStops")} color="fuchsia" />
              <LayerItem icon={<Navigation size={16} />} label="Dolmuş Durakları" checked={overlayFlags.taxiDolmusStops} onCheckedChange={() => toggleFlag("taxiDolmusStops")} color="rose" />
              <LayerItem icon={<Bike size={16} />} label="Bisiklet Yolları" checked={overlayFlags.bikeLanes} onCheckedChange={() => toggleFlag("bikeLanes")} color="teal" />
              <LayerItem icon={<Waypoints size={16} />} label="Mikromobilite" checked={overlayFlags.micromobilityParks} onCheckedChange={() => toggleFlag("micromobilityParks")} color="orange" />
              <LayerItem icon={<Zap size={16} />} label="Şarj İstasyonları" checked={overlayFlags.evChargingStations} onCheckedChange={() => toggleFlag("evChargingStations")} color="amber" />
            </AccordionContent>
          </AccordionItem>

          {/* Kentsel Yaşam */}
          <AccordionItem value="urban" className="border-gray-800/50 px-2">
            <AccordionTrigger className="text-[11px] uppercase tracking-wider text-gray-400 hover:no-underline py-3">
              Kentsel Yaşam
            </AccordionTrigger>
            <AccordionContent className="space-y-1">
              <LayerItem icon={<Trees size={16} />} label="Yeşil Alanlar" checked={overlayFlags.greenAreas} onCheckedChange={() => toggleFlag("greenAreas")} color="emerald" />
              <LayerItem icon={<Utensils size={16} />} label="Kent Lokantaları" checked={overlayFlags.kentLokantasi} onCheckedChange={() => toggleFlag("kentLokantasi")} color="amber" />
              <LayerItem icon={<Heart size={16} />} label="Sosyal Tesisler" checked={overlayFlags.sosyalTesisler} onCheckedChange={() => toggleFlag("sosyalTesisler")} color="pink" />
              <LayerItem icon={<PersonStanding size={16} />} label="Halka Açık Tuvaletler" checked={overlayFlags.toilets} onCheckedChange={() => toggleFlag("toilets")} color="rose" />
            </AccordionContent>
          </AccordionItem>

          {/* Simgesel Yapılar */}
          <AccordionItem value="landmarks" className="border-gray-800/50 border-b-0 px-2">
            <AccordionTrigger className="text-[11px] uppercase tracking-wider text-gray-400 hover:no-underline py-3">
              Simgesel Yapılar
            </AccordionTrigger>
            <AccordionContent className="space-y-1 pb-4">
              <LayerItem icon={<Moon size={16} />} label="Cami" checked={landmarkFlags.mosque} onCheckedChange={() => toggleLandmark("mosque")} color="blue" />
              <LayerItem icon={<School size={16} />} label="Müze" checked={landmarkFlags.museum} onCheckedChange={() => toggleLandmark("museum")} color="purple" />
              <LayerItem icon={<Castle size={16} />} label="Hisar / Kale" checked={landmarkFlags.castle} onCheckedChange={() => toggleLandmark("castle")} color="red" />
              <LayerItem icon={<ObeliskIcon size={16} />} label="Anıt" checked={landmarkFlags.monument} onCheckedChange={() => toggleLandmark("monument")} color="slate" />
              <LayerItem icon={<GraduationCap size={16} />} label="Üniversite" checked={landmarkFlags.university} onCheckedChange={() => toggleLandmark("university")} color="indigo" />
              <LayerItem icon={<Theater size={16} />} label="Tiyatro" checked={landmarkFlags.theatre} onCheckedChange={() => toggleLandmark("theatre")} color="orange" />
              <LayerItem icon={<Binoculars size={16} />} label="Manzara" checked={landmarkFlags.viewpoint} onCheckedChange={() => toggleLandmark("viewpoint")} color="fuchsia" />
              <LayerItem icon={<Building2 size={16} />} label="AVM" checked={landmarkFlags.mall} onCheckedChange={() => toggleLandmark("mall")} color="pink" />
              <LayerItem icon={<Trophy size={16} />} label="Stadyum" checked={landmarkFlags.stadium} onCheckedChange={() => toggleLandmark("stadium")} color="green" />
              <LayerItem icon={<LibraryIcon size={16} />} label="Kütüphane" checked={landmarkFlags.library} onCheckedChange={() => toggleLandmark("library")} color="lime" />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Card>
  );
};

interface LayerItemProps {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onCheckedChange: () => void;
  color?: string;
}

const LayerItem: React.FC<LayerItemProps> = ({ icon, label, checked, onCheckedChange, color = "blue" }) => {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400 group-hover:text-emerald-300",
    blue: "text-blue-400 group-hover:text-blue-300",
    violet: "text-violet-400 group-hover:text-violet-300",
    cyan: "text-cyan-400 group-hover:text-cyan-300",
    teal: "text-teal-400 group-hover:text-teal-300",
    orange: "text-orange-400 group-hover:text-orange-300",
    fuchsia: "text-fuchsia-400 group-hover:text-fuchsia-300",
    rose: "text-rose-400 group-hover:text-rose-300",
    amber: "text-amber-400 group-hover:text-amber-300",
    purple: "text-purple-400 group-hover:text-purple-300",
    red: "text-red-400 group-hover:text-red-300",
    slate: "text-slate-400 group-hover:text-slate-300",
    indigo: "text-indigo-400 group-hover:text-indigo-300",
    pink: "text-pink-400 group-hover:text-pink-300",
    green: "text-green-400 group-hover:text-green-300",
    lime: "text-lime-400 group-hover:text-lime-300",
  };

  return (
    <div 
      className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group" 
      onClick={onCheckedChange}
    >
      <div className="flex items-center gap-3">
        <div className={cn("transition-colors", colorMap[color] || "text-gray-400")}>
          {icon}
        </div>
        <span className={cn("text-xs font-medium transition-colors", checked ? "text-gray-100" : "text-gray-500 group-hover:text-gray-400")}>
          {label}
        </span>
      </div>
      
      <div onClick={(e) => e.stopPropagation()}>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
};