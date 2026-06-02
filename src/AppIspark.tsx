import { useMemo, useState, useCallback } from "react";
import { PathLayer } from "@deck.gl/layers";
import type { Layer } from "deck.gl";
import { useMapView } from "./hooks/useMapView";
import { useIsparkLots } from "./hooks/useIsparkLots";
import { useGeoSearch } from "./hooks/useGeoSearch";
import { useTurkeyOverlays } from "./hooks/useTurkeyOverlays";
import { useRoute } from "./hooks/useRoute";
import { useLandmarks } from "./hooks/useLandmarks";
import { createTurkeyOverlayLayers } from "./layers/turkeyOverlayLayers";
import { createLandmarkLayer } from "./layers/landmarkLayer";
import { createRadiusOverlayLayer } from "./layers/radiusOverlayLayer";
import { IsparkMap } from "./components/IsparkMap";
import { CameraControlDropdown } from "./components/CameraControlDropdown";
import { SearchBar } from "./components/SearchBar";
import { Header } from "./components/Header";
import { IsparkLotDetailPanel } from "./components/IsparkLotDetailPanel";
import { PoiDetailPanel } from "./components/PoiDetailPanel";
import { BusRouteDetailPanel } from "./components/BusRouteDetailPanel";
import { 
  Sun, Moon, LocateFixed, ParkingSquare, Bus, Train, TrainFront, Bike, Zap, 
  Trees, PersonStanding, Car, Navigation, Ship, MapPin, Waypoints, 
  ChevronDown, ChevronUp, Landmark, GraduationCap, School, 
  Binoculars, Castle, Building2, Trophy, Library as LibraryIcon, 
  Theater, Map as MapIcon
} from "lucide-react";
import type { GeoResult } from "./lib/geocode";
import { MapControls } from "./components/ui/map-ui";
import { LayerControl } from "./components/LayerControl";
import { IstanbulClock } from "./components/IstanbulClock";
import { useBusSim } from "./hooks/useBusSim";
import { createBusSimLayers } from "./layers/busSimLayer";
import { BusDetailPanel } from "./components/BusDetailPanel";
import type { ActiveBus } from "./layers/busSimLayer";
import type { TurkeyOverlayFlags } from "./hooks/useTurkeyOverlays";
import { useEffect } from "react";
import type { TurkeyPoiPoint } from "./layers/turkeyOverlayLayers";
import type { IsparkLot } from "./types";

function AppIspark() {
  const { viewState, onViewStateChange: _onViewStateChange, flyTo } = useMapView();
  const ispark = useIsparkLots();
  const search = useGeoSearch();
  const { route, getDirections, clearRoute } = useRoute();
  const landmarks = useLandmarks();

  const [isparkEnabled, setIsparkEnabled] = useState(true);
  const [layersCollapsed, setLayersCollapsed] = useState(false);
  const [bearingLocked, setBearingLocked] = useState(false);
  const [lockedBearing, setLockedBearing] = useState(0);
  const [cameraLocked, setCameraLocked] = useState(false);

  const onViewStateChange = useCallback((vs: typeof viewState) => {
    if (cameraLocked) return;
    if (bearingLocked) _onViewStateChange({ ...vs, bearing: lockedBearing });
    else _onViewStateChange(vs);
  }, [cameraLocked, bearingLocked, lockedBearing, _onViewStateChange]);
  const [selectedLot, setSelectedLot] = useState<IsparkLot | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<TurkeyPoiPoint | null>(null);
  const [selectedBusRouteProps, setSelectedBusRouteProps] = useState<Record<string, unknown> | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [landmarkFlags, setLandmarkFlags] = useState<Record<string, boolean>>({
    university: false,
    museum: true,
    theatre: false,
    monument: false,
    viewpoint: false,
    castle: false,
    mall: false,
    stadium: false,
    library: false,
    mosque: false
  });

  const [overlayFlags, setOverlayFlags] = useState<TurkeyOverlayFlags>({
    busRoutes: true,
    railLines: false,
    bikeLanes: false,
    greenAreas: false,
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

  const [busSimEnabled, setBusSimEnabled] = useState(true);
  const busSim = useBusSim();

  const toggleBusSim = useCallback((val: boolean | ((s: boolean) => boolean)) => {
    setBusSimEnabled((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      // Bus sim açılınca otobus hatları overlay'i de aç
      if (next) setOverlayFlags((f) => ({ ...f, busRoutes: true }));
      return next;
    });
  }, []);

  // Simülasyon saati: 07:00'dan başla, gerçek saat 06-23 arasındaysa onu kullan
  const getInitialBusSec = () => (Math.floor(Date.now() / 1000) + 3 * 3600) % 86400;
  const [busTimeSec, setBusTimeSec] = useState(getInitialBusSec);
  const [busPlaying, setBusPlaying] = useState(true);
  const [busSpeed, setBusSpeed] = useState(1); // 1x/5x/15x/30x
  const [selectedBus, setSelectedBus] = useState<ActiveBus | null>(null);

  // Smooth animation: 50ms tick — daha akıcı hareket
  useEffect(() => {
    if (!busSimEnabled || !busPlaying) return;
    const id = setInterval(() => {
      setBusTimeSec((t) => {
        const next = t + busSpeed * 0.05; // 50ms * speed = sim seconds per tick
        return next > 24 * 3600 ? 5 * 3600 : next;
      });
    }, 50);
    return () => clearInterval(id);
  }, [busSimEnabled, busPlaying, busSpeed]);

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

  const handlePoiClick = useCallback(
    (poi: TurkeyPoiPoint) => {
      
      // If it's a line/path, store its ID for highlighting
      if (poi.properties && (poi.properties["ID"] || poi.properties["id"] || poi.properties["OBJECTID"])) {
        const id = String(poi.properties["ID"] || poi.properties["id"] || poi.properties["OBJECTID"]);
        setSelectedLineId(id);
      } else {
        setSelectedLineId(null);
      }

      setSelectedLot(null);
      setSelectedPoi(poi);

      if (poi.position) {
        // Eğer bir hat (line) seçildiyse biraz daha geniş açıdan (zoom 14) bak ki hattın devamı görünsün
        const isLine = poi.subtitle?.includes("Hattı") || poi.subtitle?.includes("Güzergahı") || poi.kind === "bus_stop";
        flyTo(poi.position[0], poi.position[1], isLine ? 14.5 : 16.5);
      }
    },
    [flyTo],
  );

  // Sayfa her açılışta İstanbul merkezli başlasın (URL state/hmr kalıntıları olmasın diye).
  useEffect(() => {
    flyTo(28.9784, 41.0082, 13.2);
  }, [flyTo]);

  const turkeyOverlays = useTurkeyOverlays(overlayFlags, viewState.zoom);
  
  const filteredLandmarks = useMemo(() => {
    return landmarks.filter(l => landmarkFlags[l.category] !== false);
  }, [landmarks, landmarkFlags]);

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
      {
        selectedBusRouteProps: selectedBusRouteProps,
        selectedId: selectedLineId || undefined,
        onPoiClick: handlePoiClick,
      },
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
    selectedLineId,
    viewState.zoom,
    handlePoiClick,
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

  const landmarkLayer = useMemo(
    () => {
      const filtered = landmarks.filter(l => landmarkFlags[l.category]);
      if (filtered.length === 0) return null;
      return createLandmarkLayer(filtered, viewState.zoom, (l) => {
        setSelectedLot(null);
        setSelectedPoi({
          kind: "rail_station", // Mock kind to trigger the panel (since it uses specific kinds)
          position: l.coordinates,
          title: l.name,
          subtitle: l.category,
          extra: "Tarihi Simge Yapı",
          footprint: [],
        });
        flyTo(l.coordinates[0], l.coordinates[1], 16);
      });
    },
    [landmarks, landmarkFlags, viewState.zoom, flyTo],
  );

  const busSimLayers = useMemo(() => {
    if (!busSimEnabled || !busSim.data) return [];
    return createBusSimLayers(
      busSim.data.trips,
      busTimeSec,
      busRoutes ?? undefined,
      (bus) => {

        setSelectedBus(bus);
        setSelectedLot(null);
        setSelectedPoi(null);
        setSelectedBusRouteProps({ HAT_KODU: bus.route });
        flyTo(bus.position[0], bus.position[1], 15);
      },
      viewState.zoom,
    );
  }, [busSimEnabled, busSim.data, busTimeSec, busRoutes, viewState.zoom]);

  const extraLayers = useMemo(
    () => {
      // Icons ("…-icons", "…-3d") her zaman line/polygon katmanlarının üstünde olmalı
      const lineLayers = turkeyOverlayLayers.filter(
        (l) => !l.id.endsWith("-icons") && !l.id.endsWith("-3d"),
      );
      const iconLayers = turkeyOverlayLayers.filter(
        (l) => l.id.endsWith("-icons") || l.id.endsWith("-3d"),
      );
      return [
        ...radiusLayers,
        ...lineLayers,
        ...routeLayers,
        ...iconLayers,
        ...(landmarkLayer ? [landmarkLayer] : []),
        ...busSimLayers,
      ];
    },
    [radiusLayers, turkeyOverlayLayers, routeLayers, landmarkLayer, busSimLayers],
  );

  const lots = isparkEnabled ? ispark.lots : [];

  const DARK_MATTER_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
  const LIGHT_ALIDADE_URL = "https://tiles.stadiamaps.com/styles/alidade_smooth.json";

  const [mapTheme, setMapTheme] = useState<"light" | "dark">("dark");
  const mapStyleUrl = mapTheme === "light" ? LIGHT_ALIDADE_URL : DARK_MATTER_URL;

  const toggleFlag = (key: keyof TurkeyOverlayFlags) => {
    setOverlayFlags((s) => ({ ...s, [key]: !s[key] }));
  };

  const toggleLandmark = (category: string) => {
    setLandmarkFlags((s) => ({ ...s, [category]: !s[category] }));
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

      {/* Sol sütun: Logo + LayerControl aynı genişlikte */}
      <div className="absolute top-6 left-6 z-20 flex flex-col gap-3 pointer-events-none">
        <div className="pointer-events-auto">
          <Header generated={ispark.lastUpdated} />
        </div>
        <div className="pointer-events-auto">
        <LayerControl
          isparkEnabled={isparkEnabled}
          setIsparkEnabled={setIsparkEnabled}
          overlayFlags={overlayFlags}
          toggleFlag={toggleFlag}
          landmarkFlags={landmarkFlags}
          toggleLandmark={toggleLandmark}
          busSimEnabled={busSimEnabled}
          setBusSimEnabled={toggleBusSim}
          busSimLoading={busSim.loading}
        />
        </div>
      </div>

      {/* Üst orta: SearchBar + Clock + Kamera + Tema — aynı h-10, aynı glass */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 pointer-events-auto">
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
        <IstanbulClock />
        <CameraControlDropdown
          bearingLocked={bearingLocked}
          cameraLocked={cameraLocked}
          onToggleBearingLock={() => {
            if (!bearingLocked) setLockedBearing(viewState.bearing ?? 0);
            setBearingLocked((s) => !s);
          }}
          onToggleCameraLock={() => setCameraLocked((s) => !s)}
          onResetNorth={() => _onViewStateChange({ ...viewState, bearing: 0 })}
        />
        <button
          type="button"
          onClick={() => setMapTheme((t) => (t === "light" ? "dark" : "light"))}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-md border border-border/40 shadow-lg text-muted-foreground hover:text-foreground transition-all hover:scale-105 active:scale-95"
          aria-label="Harita temasını değiştir"
        >
          {mapTheme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>

      <MapControls 
        onZoomIn={() => _onViewStateChange({ ...viewState, zoom: (viewState.zoom || 0) + 1 })}
        onZoomOut={() => _onViewStateChange({ ...viewState, zoom: (viewState.zoom || 0) - 1 })}
        onLocate={handleLocateMe}
        onResetBearing={() => _onViewStateChange({ ...viewState, bearing: 0, pitch: 0 })}
        onFullscreen={() => {
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen();
        }}
        className="bottom-24 right-4"
      />

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

      {selectedBus && (
        <BusDetailPanel
          bus={selectedBus}
          currentTimeSec={busTimeSec}
          onClose={() => { setSelectedBus(null); setSelectedBusRouteProps(null); }}
        />
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

    </div>
  );
}

export default AppIspark;

