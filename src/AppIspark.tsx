import { useMemo, useState, useCallback } from "react";
import type { Layer } from "deck.gl";
import { useMapView } from "./hooks/useMapView";
import { useIsparkLots } from "./hooks/useIsparkLots";
import { useGeoSearch } from "./hooks/useGeoSearch";
import { useTurkeyOverlays } from "./hooks/useTurkeyOverlays";
import { createTurkeyOverlayLayers } from "./layers/turkeyOverlayLayers";
import { createRadiusOverlayLayer } from "./layers/radiusOverlayLayer";
import { IsparkMap } from "./components/IsparkMap";
import { SearchBar } from "./components/SearchBar";
import { Header } from "./components/Header";
import { IsparkLotDetailPanel } from "./components/IsparkLotDetailPanel";
import { PoiDetailPanel } from "./components/PoiDetailPanel";
import { BusRouteDetailPanel } from "./components/BusRouteDetailPanel";
import { Sun, Moon } from "lucide-react";
import type { GeoResult } from "./lib/geocode";
import type { TurkeyOverlayFlags } from "./hooks/useTurkeyOverlays";
import { useEffect } from "react";
import type { TurkeyPoiPoint } from "./layers/turkeyOverlayLayers";
import type { IsparkLot } from "./types";

function AppIspark() {
  const { viewState, onViewStateChange, flyTo } = useMapView();
  const ispark = useIsparkLots();
  const search = useGeoSearch();

  const [isparkEnabled, setIsparkEnabled] = useState(true);
  const [selectedLot, setSelectedLot] = useState<IsparkLot | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<TurkeyPoiPoint | null>(null);
  const [selectedBusRouteProps, setSelectedBusRouteProps] = useState<Record<string, unknown> | null>(null);
  const [overlayFlags, setOverlayFlags] = useState<TurkeyOverlayFlags>({
    // Otobüs hatları çok büyük veri olduğu için default kapalı (tıklanınca açıyoruz).
    busRoutes: false,
    railLines: true,
    bikeLanes: true,
    greenAreas: true,
    busStops: true,
    railStations: true,
    evChargingStations: true,
    micromobilityParks: true,
    toilets: true,
    taxiStops: true,
    taxiDolmusStops: true,
    minibusRoutes: true,
    minibusStops: true,
    seaStations: true,
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

  const extraLayers = useMemo(() => [...radiusLayers, ...turkeyOverlayLayers], [radiusLayers, turkeyOverlayLayers]);

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

  const [mapTheme, setMapTheme] = useState<"light" | "dark">("light");
  const mapStyleUrl = mapTheme === "light" ? LIGHT_POSITRON_URL : DARK_MATTER_URL;

  const toggleFlag = (key: keyof TurkeyOverlayFlags) => {
    setOverlayFlags((s) => ({ ...s, [key]: !s[key] }));
  };

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
        dateRange={null}
        themeToggle={
          <button
            type="button"
            onClick={() => setMapTheme((t) => (t === "light" ? "dark" : "light"))}
            className="rounded-2xl bg-gray-950/88 backdrop-blur-md border border-gray-800/60 shadow-[0_12px_36px_rgba(0,0,0,0.28)] p-3 text-gray-200 hover:text-gray-50 transition-colors"
            aria-label="Harita temasını değiştir"
            title={mapTheme === "light" ? "Koyu temaya geç" : "Açık temaya geç"}
          >
            {mapTheme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        }
      />

      <div className="absolute top-32 left-4 z-30 w-80">
        <div className="rounded-2xl bg-gray-950/82 backdrop-blur-md border border-gray-800/50 shadow-[0_10px_28px_rgba(0,0,0,0.22)] overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-800/50 bg-gradient-to-r from-emerald-500/20 via-blue-500/10 to-transparent">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.35)]" />
              <p className="text-[11px] text-gray-200 uppercase tracking-wider font-semibold">Katmanlar</p>
            </div>
          </div>

          <div className="max-h-[calc(100vh-11rem)] overflow-y-auto p-4">
            <div className="space-y-2">
              <label className="flex min-h-9 items-center justify-between gap-2 text-xs text-gray-200 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-gray-800/35 border border-transparent hover:border-gray-800/60 transition-colors cursor-pointer select-none">
                <span className="font-medium">İSPARK otoparklar</span>
                <input
                  type="checkbox"
                  checked={isparkEnabled}
                  onChange={() => setIsparkEnabled((s) => !s)}
                  className="accent-emerald-500 w-4 h-4"
                />
              </label>

              <div className="h-px bg-white/5 my-3" />

              <label className="flex min-h-9 items-center justify-between gap-2 text-xs text-gray-200 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-gray-800/35 border border-transparent hover:border-gray-800/60 transition-colors cursor-pointer select-none">
                <span className="font-medium">Otobüs hatları</span>
                <input
                  type="checkbox"
                  checked={overlayFlags.busRoutes}
                  onChange={() => toggleFlag("busRoutes")}
                  className="accent-blue-500 w-4 h-4"
                />
              </label>

              <label className="flex min-h-9 items-center justify-between gap-2 text-xs text-gray-200 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-gray-800/35 border border-transparent hover:border-gray-800/60 transition-colors cursor-pointer select-none">
                <span className="font-medium">Otobüs durakları</span>
                <input
                  type="checkbox"
                  checked={overlayFlags.busStops}
                  onChange={() => toggleFlag("busStops")}
                  className="accent-blue-500 w-4 h-4"
                />
              </label>

              <label className="flex min-h-9 items-center justify-between gap-2 text-xs text-gray-200 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-gray-800/35 border border-transparent hover:border-gray-800/60 transition-colors cursor-pointer select-none">
                <span className="font-medium">Raylı hatlar</span>
                <input
                  type="checkbox"
                  checked={overlayFlags.railLines}
                  onChange={() => toggleFlag("railLines")}
                  className="accent-violet-500 w-4 h-4"
                />
              </label>

              <label className="flex min-h-9 items-center justify-between gap-2 text-xs text-gray-200 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-gray-800/35 border border-transparent hover:border-gray-800/60 transition-colors cursor-pointer select-none">
                <span className="font-medium">Raylı istasyonlar</span>
                <input
                  type="checkbox"
                  checked={overlayFlags.railStations}
                  onChange={() => toggleFlag("railStations")}
                  className="accent-violet-500 w-4 h-4"
                />
              </label>

              <label className="flex min-h-9 items-center justify-between gap-2 text-xs text-gray-200 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-gray-800/35 border border-transparent hover:border-gray-800/60 transition-colors cursor-pointer select-none">
                <span className="font-medium">Bisiklet yolları</span>
                <input
                  type="checkbox"
                  checked={overlayFlags.bikeLanes}
                  onChange={() => toggleFlag("bikeLanes")}
                  className="accent-teal-500 w-4 h-4"
                />
              </label>

              <label className="flex min-h-9 items-center justify-between gap-2 text-xs text-gray-200 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-gray-800/35 border border-transparent hover:border-gray-800/60 transition-colors cursor-pointer select-none">
                <span className="font-medium">Mikromobilite parkları</span>
                <input
                  type="checkbox"
                  checked={overlayFlags.micromobilityParks}
                  onChange={() => toggleFlag("micromobilityParks")}
                  className="accent-orange-500 w-4 h-4"
                />
              </label>

              <label className="flex min-h-9 items-center justify-between gap-2 text-xs text-gray-200 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-gray-800/35 border border-transparent hover:border-gray-800/60 transition-colors cursor-pointer select-none">
                <span className="font-medium">Şarj istasyonları</span>
                <input
                  type="checkbox"
                  checked={overlayFlags.evChargingStations}
                  onChange={() => toggleFlag("evChargingStations")}
                  className="accent-yellow-500 w-4 h-4"
                />
              </label>

              <label className="flex min-h-9 items-center justify-between gap-2 text-xs text-gray-200 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-gray-800/35 border border-transparent hover:border-gray-800/60 transition-colors cursor-pointer select-none">
                <span className="font-medium">Yeşil alanlar</span>
                <input
                  type="checkbox"
                  checked={overlayFlags.greenAreas}
                  onChange={() => toggleFlag("greenAreas")}
                  className="accent-emerald-500 w-4 h-4"
                />
              </label>

              <label className="flex min-h-9 items-center justify-between gap-2 text-xs text-gray-200 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-gray-800/35 border border-transparent hover:border-gray-800/60 transition-colors cursor-pointer select-none">
                <span className="font-medium">Şehir tuvaletleri</span>
                <input
                  type="checkbox"
                  checked={overlayFlags.toilets}
                  onChange={() => toggleFlag("toilets")}
                  className="accent-rose-500 w-4 h-4"
                />
              </label>

              <label className="flex min-h-9 items-center justify-between gap-2 text-xs text-gray-200 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-gray-800/35 border border-transparent hover:border-gray-800/60 transition-colors cursor-pointer select-none">
                <span className="font-medium">Taksi durakları</span>
                <input
                  type="checkbox"
                  checked={overlayFlags.taxiStops}
                  onChange={() => toggleFlag("taxiStops")}
                  className="accent-fuchsia-500 w-4 h-4"
                />
              </label>

              <label className="flex min-h-9 items-center justify-between gap-2 text-xs text-gray-200 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-gray-800/35 border border-transparent hover:border-gray-800/60 transition-colors cursor-pointer select-none">
                <span className="font-medium">Dolmuş durakları</span>
                <input
                  type="checkbox"
                  checked={overlayFlags.taxiDolmusStops}
                  onChange={() => toggleFlag("taxiDolmusStops")}
                  className="accent-rose-500 w-4 h-4"
                />
              </label>

              <label className="flex min-h-9 items-center justify-between gap-2 text-xs text-gray-200 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-gray-800/35 border border-transparent hover:border-gray-800/60 transition-colors cursor-pointer select-none">
                <span className="font-medium">Minibüs hatları</span>
                <input
                  type="checkbox"
                  checked={overlayFlags.minibusRoutes}
                  onChange={() => toggleFlag("minibusRoutes")}
                  className="accent-emerald-500 w-4 h-4"
                />
              </label>

              <label className="flex min-h-9 items-center justify-between gap-2 text-xs text-gray-200 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-gray-800/35 border border-transparent hover:border-gray-800/60 transition-colors cursor-pointer select-none">
                <span className="font-medium">Minibüs durakları</span>
                <input
                  type="checkbox"
                  checked={overlayFlags.minibusStops}
                  onChange={() => toggleFlag("minibusStops")}
                  className="accent-teal-500 w-4 h-4"
                />
              </label>

              <label className="flex min-h-11 items-center justify-between gap-3 text-sm text-gray-200 px-4 py-3 rounded-xl bg-white/[0.02] hover:bg-gray-800/40 border border-transparent hover:border-gray-800/70 transition-colors cursor-pointer select-none">
                <span className="font-medium">Deniz istasyonları</span>
                <input
                  type="checkbox"
                  checked={overlayFlags.seaStations}
                  onChange={() => toggleFlag("seaStations")}
                  className="accent-sky-500 w-4 h-4"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {selectedLot && (
        <IsparkLotDetailPanel lot={selectedLot} onClose={() => setSelectedLot(null)} />
      )}

      {!selectedLot && selectedBusRouteProps && (
        <BusRouteDetailPanel routeProps={selectedBusRouteProps} onClose={() => setSelectedBusRouteProps(null)} />
      )}

      {!selectedLot && !selectedBusRouteProps && selectedPoi && (
        <PoiDetailPanel poi={selectedPoi} onClose={() => setSelectedPoi(null)} />
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

