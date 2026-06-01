import React from "react";
import { 
  Bus, Train, TrainFront, Bike, Waypoints, Zap, Trees, PersonStanding, 
  Car, Navigation, Ship, GraduationCap, School, Moon, Theater, 
  Landmark, Binoculars, Castle, Building2, Trophy, LibraryIcon,
  ParkingSquare, MapPin, Layers
} from "lucide-react";
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
  className?: string;
}

export const LayerControl: React.FC<LayerControlProps> = ({
  isparkEnabled,
  setIsparkEnabled,
  overlayFlags,
  toggleFlag,
  landmarkFlags,
  toggleLandmark,
  className
}) => {
  return (
    <Card className={cn(
      "w-80 flex flex-col pointer-events-auto border-border/40 bg-background/80 backdrop-blur-sm overflow-hidden shadow-2xl", 
      className
    )}>
      {/* Başlık alanı */}
      <div className="px-4 py-3 border-b border-border/40 bg-muted/30 flex items-center gap-2 shrink-0">
        <Layers size={16} className="text-primary/70" />
        <span className="text-xs font-semibold uppercase tracking-widest text-foreground">Harita Katmanları</span>
      </div>

      {/* Kaydırma alanı ve Özel İnce Scrollbar Stili */}
      <div className="flex-1 overflow-y-auto max-h-[60vh] p-2 pr-1
        [&::-webkit-scrollbar]:w-1.5
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20
        [&::-webkit-scrollbar-thumb]:rounded-full
        hover:[&::-webkit-scrollbar-thumb]:bg-primary/40
        [scrollbar-width:thin]
        [scrollbar-color:rgba(156,163,175,0.2)_transparent]"
      >
        <Accordion type="multiple" defaultValue={["core", "transport"]}>
          {/* Temel Katmanlar */}
          <AccordionItem value="core" className="border-gray-800/50 px-2">
            <AccordionTrigger className="text-[11px] uppercase tracking-wider text-gray-400 hover:no-underline py-3">
              Temel Katmanlar
            </AccordionTrigger>
            <AccordionContent className="space-y-1">
              <LayerItem 
                icon={<ParkingSquare size={16} />} 
                label="İSPARK Otoparkları" 
                checked={isparkEnabled} 
                onCheckedChange={() => setIsparkEnabled(s => !s)}
                color="emerald"
              />
              <LayerItem 
                 icon={<Trees size={16} />} 
                 label="Yeşil Alanlar" 
                 checked={overlayFlags.greenAreas} 
                 onCheckedChange={() => toggleFlag("greenAreas")} 
                 color="emerald"
              />
            </AccordionContent>
          </AccordionItem>
          
          {/* Ulaşım Katmanları */}
          <AccordionItem value="transport" className="border-gray-800/50 px-2">
            <AccordionTrigger className="text-[11px] uppercase tracking-wider text-gray-400 hover:no-underline py-3">
              Toplu Taşıma & Yol
            </AccordionTrigger>
            <AccordionContent className="space-y-1">
              <div className="text-[10px] text-gray-500 font-semibold px-2 py-1 uppercase tracking-tighter">Raylı Sistem & Deniz</div>
              <LayerItem icon={<Train size={16} />} label="Raylı Hatlar" checked={overlayFlags.railLines} onCheckedChange={() => toggleFlag("railLines")} color="violet" />
              <LayerItem icon={<TrainFront size={16} />} label="Raylı İstasyonlar" checked={overlayFlags.railStations} onCheckedChange={() => toggleFlag("railStations")} color="violet" />
              <LayerItem icon={<Ship size={16} />} label="Deniz İstasyonları" checked={overlayFlags.seaStations} onCheckedChange={() => toggleFlag("seaStations")} color="cyan" />
              
              <div className="text-[10px] text-gray-500 font-semibold px-2 py-1 mt-2 uppercase tracking-tighter">Otobüs & Minibüs</div>
              <LayerItem icon={<Bus size={16} />} label="Otobüs Hatları" checked={overlayFlags.busRoutes} onCheckedChange={() => toggleFlag("busRoutes")} color="blue" />
              <LayerItem icon={<MapPin size={16} />} label="Otobüs Durakları" checked={overlayFlags.busStops} onCheckedChange={() => toggleFlag("busStops")} color="blue" />
              <LayerItem icon={<Bus size={16} className="opacity-70" />} label="Minibüs Hatları" checked={overlayFlags.minibusRoutes} onCheckedChange={() => toggleFlag("minibusRoutes")} color="teal" />
              <LayerItem icon={<MapPin size={16} className="opacity-70" />} label="Minibüs Durakları" checked={overlayFlags.minibusStops} onCheckedChange={() => toggleFlag("minibusStops")} color="teal" />
              
              <div className="text-[10px] text-gray-500 font-semibold px-2 py-1 mt-2 uppercase tracking-tighter">Diğer</div>
              <LayerItem icon={<Bike size={16} />} label="Bisiklet Yolları" checked={overlayFlags.bikeLanes} onCheckedChange={() => toggleFlag("bikeLanes")} color="teal" />
              <LayerItem icon={<Waypoints size={16} />} label="Mikromobilite" checked={overlayFlags.micromobilityParks} onCheckedChange={() => toggleFlag("micromobilityParks")} color="orange" />
              <LayerItem icon={<Car size={16} />} label="Taksi Durakları" checked={overlayFlags.taxiStops} onCheckedChange={() => toggleFlag("taxiStops")} color="fuchsia" />
              <LayerItem icon={<Navigation size={16} />} label="Dolmuş Durakları" checked={overlayFlags.taxiDolmusStops} onCheckedChange={() => toggleFlag("taxiDolmusStops")} color="rose" />
            </AccordionContent>
          </AccordionItem>

          {/* Simgesel Yapılar */}
          <AccordionItem value="landmarks" className="border-gray-800/50 border-b-0 px-2">
            <AccordionTrigger className="text-[11px] uppercase tracking-wider text-gray-400 hover:no-underline py-3">
              Simgesel Yapılar
            </AccordionTrigger>
            <AccordionContent className="space-y-1">
              <LayerItem icon={<Moon size={16} />} label="Cami" checked={landmarkFlags.mosque} onCheckedChange={() => toggleLandmark("mosque")} color="blue" />
              <LayerItem icon={<School size={16} />} label="Müze" checked={landmarkFlags.museum} onCheckedChange={() => toggleLandmark("museum")} color="purple" />
              <LayerItem icon={<Castle size={16} />} label="Hisar / Kale" checked={landmarkFlags.castle} onCheckedChange={() => toggleLandmark("castle")} color="red" />
              <LayerItem icon={<Landmark size={16} />} label="Anıt" checked={landmarkFlags.monument} onCheckedChange={() => toggleLandmark("monument")} color="slate" />
              <LayerItem icon={<GraduationCap size={16} />} label="Üniversite" checked={landmarkFlags.university} onCheckedChange={() => toggleLandmark("university")} color="indigo" />
              <LayerItem icon={<Theater size={16} />} label="Tiyatro" checked={landmarkFlags.theatre} onCheckedChange={() => toggleLandmark("theatre")} color="orange" />
              <LayerItem icon={<Binoculars size={16} />} label="Manzara" checked={landmarkFlags.viewpoint} onCheckedChange={() => toggleLandmark("viewpoint")} color="fuchsia" />
              <LayerItem icon={<Building2 size={16} />} label="AVM" checked={landmarkFlags.mall} onCheckedChange={() => toggleLandmark("mall")} color="pink" />
              <LayerItem icon={<Trophy size={16} />} label="Stadyum" checked={landmarkFlags.stadium} onCheckedChange={() => toggleLandmark("stadium")} color="green" />
              <LayerItem icon={<LibraryIcon size={16} />} label="Kütüphane" checked={landmarkFlags.library} onCheckedChange={() => toggleLandmark("library")} color="lime" />
            </AccordionContent>
          </AccordionItem>
          
          {/* Tesisler */}
          <AccordionItem value="facilities" className="border-gray-800/50 border-b-0 px-2">
            <AccordionTrigger className="text-[11px] uppercase tracking-wider text-gray-400 hover:no-underline py-3">
              Sosyo-Teknik Tesisler
            </AccordionTrigger>
            <AccordionContent className="space-y-1 pb-4">
               <LayerItem icon={<Zap size={16} />} label="Şarj İstasyonları" checked={overlayFlags.evChargingStations} onCheckedChange={() => toggleFlag("evChargingStations")} color="amber" />
               <LayerItem icon={<PersonStanding size={16} />} label="Halka Açık Tuvaletler" checked={overlayFlags.toilets} onCheckedChange={() => toggleFlag("toilets")} color="rose" />
            </AccordionContent>
          </AccordionItem>
        </Accordion> {/* <- </Accordion> buraya taşınarak tüm Item'ları sarmalaması sağlandı */}
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