import { useMemo, useState, useCallback } from "react";
import { PathLayer } from "@deck.gl/layers";
import type { Layer } from "deck.gl";
import { useMapView } from "./hooks/useMapView";
import { useIsparkLots } from "./hooks/useIsparkLots";
import { useGeoSearch } from "./hooks/useGeoSearch";
import { useTurkeyOverlays } from "./hooks/useTurkeyOverlays";
import { useRoute } from "./hooks/useRoute";
import { createTurkeyOverlayLayers } from "./layers/turkeyOverlayLayers";
import { createRadiusOverlayLayer } from "./layers/radiusOverlayLayer";
import { IsparkMap } from "./components/IsparkMap";
import { SearchBar } from "./components/SearchBar";
import { Header } from "./components/Header";
import { IsparkLotDetailPanel } from "./components/IsparkLotDetailPanel";
import { PoiDetailPanel } from "./components/PoiDetailPanel";
import { BusRouteDetailPanel } from "./components/BusRouteDetailPanel";
import { Sun, Moon, LocateFixed, ParkingSquare, Bus, Train, TrainFront, Bike, Zap, Trees, PersonStanding, Car, Navigation, Ship, MapPin, Waypoints, ChevronDown, ChevronUp } from "lucide-react";
import type { GeoResult } from "./lib/geocode";
import type { TurkeyOverlayFlags } from "./hooks/useTurkeyOverlays";
import { useEffect } from "react";
import type { TurkeyPoiPoint } from "./layers/turkeyOverlayLayers";
import type { IsparkLot } from "./types";

function AppIspark() {
  const { viewState, onViewStateChange, flyTo } = useMapView();
  const ispark = useIsparkLots();
  const search = useGeoSearch();
  const { route, getDirections, clearRoute } = useRoute();

  const [isparkEnabled, setIsparkEnabled] = useState(true);
  const [layersCollapsed, setLayersCollapsed] = useState(false);
  const [selectedLot, setSelectedLot] = useState<IsparkLot | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<TurkeyPoiPoint | null>(null);
  const [selectedBusRouteProps, setSelectedBusRouteProps] = useState<Record<string, unknown> | null>(null);
  const [overlayFlags, setOverlayFlags] = useState<TurkeyOverlayFlags>({
    // Otobüs hatları çok büyük veri olduğu için default kapalı (tıklanınca açıyoruz).
    busRoutes: false,
    railLines: false,
    bikeLanes: false,
    greenAreas: true,
    busStops: false,
    railStations: false,
    evChargingStations: true,
    micromobilityParks: false,
    toilets: true,
    taxiStops: false,
    taxiDolmusStops: false,
    minibusRoutes: false,
    minibusStops: false,
    seaStations: false,
  });

  // Sayfa her açılışta İstanbul merkezli başlasın (URL state/hmr kalıntıları olmasın diye).
  useEffect(() => {
    flyTo(28.9784, 41.0082, 13.2);
  }, [flyTo]);

  const turkeyOverlays = useTurkeyOverlays(overlayFlags, viewState.zoom);
  const {
    busRoutes,
    railLines,
    bikeLanes,
    greenAreas,
    busStops,
    railStations,
    evChargingStations,
    micromobilityParks,
    toilets,
    taxiStops,
    taxiDolmusStops,
    minibusRoutes,
    minibusStops,
    seaStations,
  } = turkeyOverlays;

  const turkeyOverlayLayers = useMemo(() => {
    return createTurkeyOverlayLayers(
      {
        busRoutes,
        railLines,
        bikeLanes,
        greenAreas,
        busStops,
        railStations,
        evChargingStations,
        micromobilityParks,
        toilets,
        taxiStops,
        taxiDolmusStops,
        minibusRoutes,
        minibusStops,
        seaStations,
      },
      viewState.zoom,
      { selectedBusRouteProps: selectedBusRouteProps },
    );
  }, [
    busRoutes,
    railLines,
    bikeLanes,
    greenAreas,
    busStops,
    railStations,
    evChargingStations,
    micromobilityParks,
    toilets,
    taxiStops,
    taxiDolmusStops,
    minibusRoutes,
    minibusStops,
    seaStations,
    selectedBusRouteProps,
    viewState.zoom,
  ]);

  const radiusLayers = useMemo((): Layer[] => {
    if (!search.selectedResult) return [];
    return [
      createRadiusOverlayLayer(
        { lat: search.selectedResult.lat, lng: search.selectedResult.lng },
        search.radius,
      ),
    ];
  }, [search.selectedResult, search.radius]);

  const routeLayers = useMemo((): Layer[] => {
    if (!route.path || route.path.length < 2) return [];
    return [
      new PathLayer({
        id: "valhalla-route",
        data: [{ path: route.path }],
        getPath: (d) => d.path,
        getColor: [59, 130, 246],
        getWidth: 5,
        widthUnits: "pixels",
        capRounded: true,
        jointRounded: true,
        pickable: false,
      }),
    ];
  }, [route.path]);

  const extraLayers = useMemo(
    () => [...radiusLayers, ...turkeyOverlayLayers, ...routeLayers],
    [radiusLayers, turkeyOverlayLayers, routeLayers],
  );

  const handleSearchSelect = useCallback(
    (result: GeoResult) => {
      search.selectResult(result);
      flyTo(result.lng, result.lat, 16);
    },
    [search, flyTo],
  );

  const handleLotClick = useCallback(
    (lot: IsparkLot) => {
      setSelectedPoi(null);
      setSelectedLot(lot);
      flyTo(lot.lng, lot.lat, 16);
    },
    [flyTo],
  );

  const lots = isparkEnabled ? ispark.lots : [];

  const DARK_MATTER_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
  const LIGHT_POSITRON_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

  const [mapTheme, setMapTheme] = useState<"light" | "dark">("dark");
  const mapStyleUrl = mapTheme === "light" ? LIGHT_POSITRON_URL : DARK_MATTER_URL;

  const toggleFlag = (key: keyof TurkeyOverlayFlags) => {
    setOverlayFlags((s) => ({ ...s, [key]: !s[key] }));
  };

  const [locating, setLocating] = useState(false);
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        flyTo(coords.longitude, coords.latitude, 16.8);
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, [flyTo]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-950">
      {(ispark.loading || turkeyOverlays.errors.length > 0) && (
        <div className="absolute inset-0 z-40 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 p-3">
            <div className="w-fit rounded-xl bg-gray-950/90 border border-gray-800/50 px-3 py-2">
              <p className="text-xs text-gray-300">
                {ispark.loading ? "İSPARK verisi yükleniyor..." : null}
              </p>
              {ispark.error && <p className="text-xs text-red-300">{ispark.error}</p>}
              {turkeyOverlays.errors.length > 0 && (
                <p className="text-[11px] text-gray-400 mt-1">Bazı overlay dosyaları yüklenemedi.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <Header
        generated={ispark.lastUpdated}
        themeToggle={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={locating}
              className="rounded-2xl bg-gray-950/88 backdrop-blur-md border border-gray-800/60 shadow-[0_12px_36px_rgba(0,0,0,0.28)] p-3 text-gray-200 hover:text-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Konumuma git"
              title={locating ? "Konum alınıyor..." : "Konumuma git"}
            >
              <LocateFixed size={18} />
            </button>
            <button
              type="button"
              onClick={() => setMapTheme((t) => (t === "light" ? "dark" : "light"))}
              className="rounded-2xl bg-gray-950/88 backdrop-blur-md border border-gray-800/60 shadow-[0_12px_36px_rgba(0,0,0,0.28)] p-3 text-gray-200 hover:text-gray-50 transition-colors"
              aria-label="Harita temasını değiştir"
              title={mapTheme === "light" ? "Koyu temaya geç" : "Açık temaya geç"}
            >
              {mapTheme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        }
      />

      <div className="absolute top-32 left-4 z-30 w-80">
        <div className="rounded-2xl bg-gray-950/82 backdrop-blur-md border border-gray-800/50 shadow-[0_10px_28px_rgba(0,0,0,0.22)] overflow-hidden">
          <button
            type="button"
            onClick={() => setLayersCollapsed((s) => !s)}
            className="w-full px-4 py-3 border-b border-gray-800/50 bg-gradient-to-r from-emerald-500/20 via-blue-500/10 to-transparent flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.35)]" />
              <p className="text-[11px] text-gray-200 uppercase tracking-wider font-semibold">Katmanlar</p>
            </div>
            {layersCollapsed ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronUp size={14} className="text-gray-400" />}
          </button>

          {!layersCollapsed && <div className="p-3">
            <div className="grid grid-cols-3 gap-1.5">
              {/* İSPARK */}
              <button type="button" onClick={() => setIsparkEnabled((s) => !s)}
                className={`flex flex-col items-center justify-center gap-1 py-8 px-1 rounded-xl border transition-all ${isparkEnabled ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-white/[0.03] border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"}`}>
                <ParkingSquare size={17} /><span className="text-[9px] font-medium text-center leading-tight">İSPARK</span>
              </button>
              {/* Otobüs hatları */}
              <button type="button" onClick={() => toggleFlag("busRoutes")}
                className={`flex flex-col items-center justify-center gap-1 py-8 px-1 rounded-xl border transition-all ${overlayFlags.busRoutes ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "bg-white/[0.03] border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"}`}>
                <Bus size={17} /><span className="text-[9px] font-medium text-center leading-tight">Otobüs Hatları</span>
              </button>
              {/* Otobüs durakları */}
              <button type="button" onClick={() => toggleFlag("busStops")}
                className={`flex flex-col items-center justify-center gap-1 py-8 px-1 rounded-xl border transition-all ${overlayFlags.busStops ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "bg-white/[0.03] border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"}`}>
                <MapPin size={17} /><span className="text-[9px] font-medium text-center leading-tight">Otobüs Durakları</span>
              </button>
              {/* Raylı hatlar */}
              <button type="button" onClick={() => toggleFlag("railLines")}
                className={`flex flex-col items-center justify-center gap-1 py-8 px-1 rounded-xl border transition-all ${overlayFlags.railLines ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "bg-white/[0.03] border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"}`}>
                <Train size={17} /><span className="text-[9px] font-medium text-center leading-tight">Raylı Hatlar</span>
              </button>
              {/* Raylı istasyonlar */}
              <button type="button" onClick={() => toggleFlag("railStations")}
                className={`flex flex-col items-center justify-center gap-1 py-8 px-1 rounded-xl border transition-all ${overlayFlags.railStations ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "bg-white/[0.03] border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"}`}>
                <TrainFront size={17} /><span className="text-[9px] font-medium text-center leading-tight">Raylı İstasyon</span>
              </button>
              {/* Bisiklet yolları */}
              <button type="button" onClick={() => toggleFlag("bikeLanes")}
                className={`flex flex-col items-center justify-center gap-1 py-8 px-1 rounded-xl border transition-all ${overlayFlags.bikeLanes ? "bg-teal-500/20 border-teal-500/40 text-teal-300" : "bg-white/[0.03] border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"}`}>
                <Bike size={17} /><span className="text-[9px] font-medium text-center leading-tight">Bisiklet Yolu</span>
              </button>
              {/* Mikromobilite */}
              <button type="button" onClick={() => toggleFlag("micromobilityParks")}
                className={`flex flex-col items-center justify-center gap-1 py-8 px-1 rounded-xl border transition-all ${overlayFlags.micromobilityParks ? "bg-orange-500/20 border-orange-500/40 text-orange-300" : "bg-white/[0.03] border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"}`}>
                <Waypoints size={17} /><span className="text-[9px] font-medium text-center leading-tight">Mikromobilite</span>
              </button>
              {/* Şarj istasyonları */}
              <button type="button" onClick={() => toggleFlag("evChargingStations")}
                className={`flex flex-col items-center justify-center gap-1 py-8 px-1 rounded-xl border transition-all ${overlayFlags.evChargingStations ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-white/[0.03] border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"}`}>
                <Zap size={17} /><span className="text-[9px] font-medium text-center leading-tight">Şarj İst.</span>
              </button>
              {/* Yeşil alanlar */}
              <button type="button" onClick={() => toggleFlag("greenAreas")}
                className={`flex flex-col items-center justify-center gap-1 py-8 px-1 rounded-xl border transition-all ${overlayFlags.greenAreas ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-white/[0.03] border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"}`}>
                <Trees size={17} /><span className="text-[9px] font-medium text-center leading-tight">Yeşil Alan</span>
              </button>
              {/* Tuvaletler */}
              <button type="button" onClick={() => toggleFlag("toilets")}
                className={`flex flex-col items-center justify-center gap-1 py-8 px-1 rounded-xl border transition-all ${overlayFlags.toilets ? "bg-rose-500/20 border-rose-500/40 text-rose-300" : "bg-white/[0.03] border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"}`}>
                <PersonStanding size={17} /><span className="text-[9px] font-medium text-center leading-tight">Tuvalet</span>
              </button>
              {/* Taksi */}
              <button type="button" onClick={() => toggleFlag("taxiStops")}
                className={`flex flex-col items-center justify-center gap-1 py-8 px-1 rounded-xl border transition-all ${overlayFlags.taxiStops ? "bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300" : "bg-white/[0.03] border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"}`}>
                <Car size={17} /><span className="text-[9px] font-medium text-center leading-tight">Taksi Durağı</span>
              </button>
              {/* Dolmuş */}
              <button type="button" onClick={() => toggleFlag("taxiDolmusStops")}
                className={`flex flex-col items-center justify-center gap-1 py-8 px-1 rounded-xl border transition-all ${overlayFlags.taxiDolmusStops ? "bg-rose-500/20 border-rose-500/40 text-rose-300" : "bg-white/[0.03] border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"}`}>
                <Navigation size={17} /><span className="text-[9px] font-medium text-center leading-tight">Dolmuş Durağı</span>
              </button>
              {/* Minibüs hatları */}
              <button type="button" onClick={() => toggleFlag("minibusRoutes")}
                className={`flex flex-col items-center justify-center gap-1 py-8 px-1 rounded-xl border transition-all ${overlayFlags.minibusRoutes ? "bg-teal-500/20 border-teal-500/40 text-teal-300" : "bg-white/[0.03] border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"}`}>
                <Bus size={17} /><span className="text-[9px] font-medium text-center leading-tight">Minibüs Hatları</span>
              </button>
              {/* Minibüs durakları */}
              <button type="button" onClick={() => toggleFlag("minibusStops")}
                className={`flex flex-col items-center justify-center gap-1 py-8 px-1 rounded-xl border transition-all ${overlayFlags.minibusStops ? "bg-teal-500/20 border-teal-500/40 text-teal-300" : "bg-white/[0.03] border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"}`}>
                <MapPin size={17} /><span className="text-[9px] font-medium text-center leading-tight">Minibüs Durağı</span>
              </button>
              {/* Deniz istasyonları */}
              <button type="button" onClick={() => toggleFlag("seaStations")}
                className={`flex flex-col items-center justify-center gap-1 py-8 px-1 rounded-xl border transition-all ${overlayFlags.seaStations ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" : "bg-white/[0.03] border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"}`}>
                <Ship size={17} /><span className="text-[9px] font-medium text-center leading-tight">Deniz İst.</span>
              </button>
            </div>
          </div>}
        </div>
      </div>

      {selectedLot && (
        <IsparkLotDetailPanel
          lot={selectedLot}
          onClose={() => { setSelectedLot(null); clearRoute(); }}
          onGetDirections={getDirections}
          route={route}
        />
      )}

      {!selectedLot && selectedBusRouteProps && (
        <BusRouteDetailPanel routeProps={selectedBusRouteProps} onClose={() => setSelectedBusRouteProps(null)} />
      )}

      {!selectedLot && !selectedBusRouteProps && selectedPoi && (
        <PoiDetailPanel
          poi={selectedPoi}
          onClose={() => { setSelectedPoi(null); clearRoute(); }}
          onGetDirections={getDirections}
          route={route}
        />
      )}

      <IsparkMap
        lots={lots}
        viewState={viewState}
        onViewStateChange={onViewStateChange}
        onLotClick={handleLotClick}
        onPoiClick={(poi) => {
          setSelectedPoi(poi);
          setSelectedLot(null);
          setSelectedBusRouteProps(null);
        }}
        onBusRouteClick={(p) => {
          setSelectedBusRouteProps(p);
          setSelectedLot(null);
          setSelectedPoi(null);
        }}
        onClearSelection={() => {
          setSelectedPoi(null);
          setSelectedLot(null);
          setSelectedBusRouteProps(null);
        }}
        extraLayers={extraLayers}
        mapStyleUrl={mapStyleUrl}
      />

      <SearchBar
        query={search.query}
        results={search.results}
        isSearching={search.isSearching}
        radius={search.radius}
        hasSelection={search.selectedResult !== null}
        onQueryChange={search.setQuery}
        onSelectResult={handleSearchSelect}
        onClear={search.clearSearch}
        onRadiusChange={search.setRadius}
      />
    </div>
  );
}

export default AppIspark;

