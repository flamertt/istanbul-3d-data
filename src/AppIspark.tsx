import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { PathLayer } from "@deck.gl/layers";
import { PathStyleExtension } from "@deck.gl/extensions";
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
  LocateFixed, ParkingSquare, Bus, Train, TrainFront, Bike, Zap,
  Trees, PersonStanding, Car, Navigation, Ship, MapPin, Waypoints,
  ChevronDown, ChevronUp, Landmark, GraduationCap, School,
  Binoculars, Castle, Building2, Trophy, Library as LibraryIcon,
  Theater, Map as MapIcon, Menu, X
} from "lucide-react";
import type { GeoResult } from "./lib/geocode";
import { MapControls } from "./components/ui/map-ui";
import { LayerControl } from "./components/LayerControl";
import { IstanbulClock } from "./components/IstanbulClock";
import { useBusSim } from "./hooks/useBusSim";
import { createBusSimLayers } from "./layers/busSimLayer";
import { useBusSimWorker } from "./hooks/useBusSimWorker";
import { BusDetailPanel } from "./components/BusDetailPanel";
import { RailDetailPanel } from "./components/RailDetailPanel";
import { BusListPanel } from "./components/BusListPanel";
import type { ActiveBus } from "./layers/busSimLayer";
import { useRailSim } from "./hooks/useRailSim";
import { createRailSimLayers, createFerryRouteLayers, createRailSelectedRouteLayers, getActiveVehicles } from "./layers/railSimLayer";
import { createBridgeScenegraphLayers } from "./layers/scenegraphBridges";
import { computeTreePoints } from "./layers/greenAreaTreesLayer";
import { LoadingScreen } from "./components/LoadingScreen";
import type { ActiveVehicle } from "./layers/railSimLayer";
import type { TurkeyOverlayFlags } from "./hooks/useTurkeyOverlays";
import { getViewportBounds, type Bounds } from "./lib/viewportBounds";
import type { TurkeyPoiPoint } from "./layers/turkeyOverlayLayers";
import type { IsparkLot } from "./types";

function AppIspark() {
  const { viewState, onViewStateChange: _onViewStateChange, flyTo, panTo } = useMapView();
  const ispark = useIsparkLots();
  const search = useGeoSearch();
  const { route, getDirections, clearRoute } = useRoute();
  const landmarks = useLandmarks();

  const [isparkEnabled, setIsparkEnabled] = useState(true);
  const [layersCollapsed, setLayersCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    busRoutes: false,
    railLines: true,
    bikeLanes: false,
    greenAreas: true,
    busStops: false,
    railStations: false,
    evChargingStations: false,
    micromobilityParks: false,
    toilets: false,
    taxiStops: false,
    taxiDolmusStops: false,
    minibusRoutes: false,
    minibusStops: false,
    seaStations: true,
    kentLokantasi: false,
    sosyalTesisler: false,
  });

  const [buildingRings, setBuildingRings] = useState<[number, number][][]>([]);
  const [appReady, setAppReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const [busSimEnabled, setBusSimEnabled] = useState(true);
  const [metroSimEnabled, setMetroSimEnabled] = useState(true);
  const [marmaraySimEnabled, setMarmaraySimEnabled] = useState(true);
  const [tramSimEnabled, setTramSimEnabled] = useState(false);
  const [ferrySimEnabled, setFerrySimEnabled] = useState(true);
  const busSim = useBusSim();
  const railSim = useRailSim();

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
  const [selectedVehicle, setSelectedVehicle] = useState<ActiveVehicle | null>(null);
  // Hangi route'u takip ettiğimizi tut: { type: 'bus' | 'rail', key: string }
  const trackingRef = useRef<{ type: 'bus' | 'rail'; key: string } | null>(null);

  // Smooth animation: 50ms tick — daha akıcı hareket
  useEffect(() => {
    if (!busSimEnabled || !busPlaying) return;
    const id = setInterval(() => {
      setBusTimeSec((t) => {
        const next = t + busSpeed * 0.05; // 50ms * speed = sim seconds per tick
        return next >= 86400 ? next - 86400 : next; // gece yarısı doğal wraparound
      });
    }, 50);
    return () => clearInterval(id);
  }, [busSimEnabled, busPlaying, busSpeed]);

  // Throttle: layer updates at 2fps (500ms), list updates at 0.5fps (2000ms)
  const busTimeRef = useRef(busTimeSec);
  useEffect(() => { busTimeRef.current = busTimeSec; }, [busTimeSec]);

  const [layerTimeSec, setLayerTimeSec] = useState(getInitialBusSec);
  const zoomRef = useRef(viewState.zoom);
  useEffect(() => { zoomRef.current = viewState.zoom; }, [viewState.zoom]);
  useEffect(() => {
    // zoom < 10'da hareket fark edilmez, güncellemeyi durdur
    const id = setInterval(() => {
      if (zoomRef.current >= 10) setLayerTimeSec(busTimeRef.current);
    }, 500);
    return () => clearInterval(id);
  }, []);

  const [listTimeSec, setListTimeSec] = useState(getInitialBusSec);
  useEffect(() => {
    const id = setInterval(() => setListTimeSec(busTimeRef.current), 2000);
    return () => clearInterval(id);
  }, []);

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
    busRoutesGeom,
    greenAreasData,
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
    kentLokantasi,
    sosyalTesisler,
  } = turkeyOverlays;

  const treePoints = useMemo(
    () => computeTreePoints(overlayFlags.greenAreas ? (greenAreasData ?? null) : null, buildingRings),
    [greenAreasData, buildingRings, overlayFlags.greenAreas],
  );

  // Tüm kritik veriler ve harita hazır olunca loading screen'i kapat
  useEffect(() => {
    if (appReady) return;
    const dataReady = !ispark.loading && !busSim.loading && !railSim.loading && greenAreasData !== null;
    if (mapReady && dataReady) setAppReady(true);
  }, [appReady, mapReady, ispark.loading, busSim.loading, railSim.loading, greenAreasData]);

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
        kentLokantasi,
        sosyalTesisler,
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
    kentLokantasi,
    sosyalTesisler,
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

  const handleBusClick = useCallback((bus: ActiveBus) => {
    setSelectedBus(bus);
    setSelectedVehicle(null);
    setSelectedLot(null);
    setSelectedPoi(null);
    setSelectedBusRouteProps({ HAT_KODU: bus.route });
    trackingRef.current = { type: 'bus', key: bus.route };
    flyTo(bus.position[0], bus.position[1], 16.5);
  }, [flyTo]);

  const handleRailClick = useCallback((vehicle: ActiveVehicle) => {
    setSelectedVehicle(vehicle);
    setSelectedBus(null);
    setSelectedLot(null);
    setSelectedPoi(null);
    setSelectedBusRouteProps(null);
    trackingRef.current = { type: 'rail', key: vehicle.routeKey };
    flyTo(vehicle.position[0], vehicle.position[1], 15);
  }, [flyTo]);

  // Viewport bounds — 20% margin, güncelleme throttle'landı
  const bounds = useMemo<Bounds>(
    () => getViewportBounds(viewState, 0.25),
    // Sadece zoom veya merkez önemli ölçüde değişince yeniden hesapla
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.round(viewState.zoom * 4) / 4,
     Math.round(viewState.longitude * 100) / 100,
     Math.round(viewState.latitude * 100) / 100]
  );

  // Seçili otobüsün hattını çiz — busRoutes kapalı olsa bile göster
  const selectedBusRouteLayers = useMemo((): Layer[] => {
    if (!selectedBus || !busRoutesGeom) return [];
    const hatKodu = selectedBus.route;
    const features = busRoutesGeom.features.filter(
      (f) => {
        const k = f.properties?.HAT_KODU as string | undefined;
        return k && k.trim() === hatKodu;
      }
    );
    if (!features.length) return [];
    const paths = features.flatMap((f) => {
      const g = f.geometry;
      if (g.type === "LineString") return [g.coordinates as [number,number][]];
      if (g.type === "MultiLineString") return g.coordinates as [number,number][][];
      return [];
    });
    return [
      new PathLayer({
        id: "selected-bus-route-line",
        data: paths,
        getPath: (d) => d,
        getColor: [37, 99, 235, 200],  // mavi
        getWidth: 3,
        widthUnits: "pixels",
        widthMinPixels: 2,
        getDashArray: [10, 4],
        dashJustified: true,
        extensions: [new PathStyleExtension({ dash: true })],
        updateTriggers: { data: hatKodu },
      }),
    ];
  }, [selectedBus, busRoutesGeom]);

  const busSimLayers = useMemo(() => {
    if (!busSimEnabled || !busSim.data) return [];
    return createBusSimLayers(
      busSim.data.trips,
      layerTimeSec,
      busRoutesGeom ?? undefined,
      handleBusClick,
      viewState.zoom,
      selectedBus,
      bounds,
    );
  }, [busSimEnabled, busSim.data, layerTimeSec, busRoutesGeom, viewState.zoom, handleBusClick, selectedBus, bounds]);

  // Geom entries for worker — busRoutesGeom her zaman yüklü, toggle bağımsız
  const geomEntries = useMemo(() => {
    if (!busRoutesGeom) return [];
    const map: [string, [number, number][]][] = [];
    for (const f of busRoutesGeom.features) {
      const key = (f.properties?.HAT_KODU as string | undefined)?.trim();
      if (!key) continue;
      const g = f.geometry;
      if (g.type === "LineString") map.push([key, g.coordinates as [number, number][]]);
      else if (g.type === "MultiLineString") {
        const segs = g.coordinates as [number, number][][];
        const longest = segs.reduce((a, b) => a.length >= b.length ? a : b);
        map.push([key, longest]);
      }
    }
    return map;
  }, [busRoutesGeom]);

  // Worker computes active buses off the main thread
  const activeBuses = useBusSimWorker(
    busSimEnabled ? busSim.data : null,
    listTimeSec,
    geomEntries,
    busSimEnabled,
  );

  // Araç takip loop — activeBuses veya layerTimeSec her güncellendiğinde kamerayı kaydır
  useEffect(() => {
    const t = trackingRef.current;
    if (!t) return;

    if (t.type === 'bus') {
      const bus = activeBuses.find(b => b.route === t.key);
      if (bus) panTo(bus.position[0], bus.position[1]);
    } else if (t.type === 'rail' && railSim.data) {
      const vehicles = getActiveVehicles(railSim.data, layerTimeSec, () => true);
      const v = vehicles.find(v => v.routeKey === t.key);
      if (v) panTo(v.position[0], v.position[1]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBuses, layerTimeSec]);

  const railFilter = useCallback((kind: string) => {
    if (kind === "metro" || kind === "funicular") return metroSimEnabled;
    if (kind === "marmaray") return marmaraySimEnabled;
    if (kind === "tram") return tramSimEnabled;
    if (kind === "ferry") return ferrySimEnabled;
    return false;
  }, [metroSimEnabled, marmaraySimEnabled, tramSimEnabled, ferrySimEnabled]);

  const activeRailVehicles = useMemo((): ActiveVehicle[] => {
    if (!railSim.data) return [];
    return getActiveVehicles(railSim.data, listTimeSec, railFilter);
  }, [railSim.data, listTimeSec, railFilter]);

  const railSimLayers = useMemo(() => {
    if (!railSim.data) return [];
    const anyEnabled = metroSimEnabled || marmaraySimEnabled || tramSimEnabled || ferrySimEnabled;
    if (!anyEnabled) return [];
    return [
      ...createFerryRouteLayers(railSim.data, ferrySimEnabled, selectedVehicle, layerTimeSec),
      ...createRailSelectedRouteLayers(railSim.data, selectedVehicle),
      ...createRailSimLayers(
        railSim.data,
        layerTimeSec,
        railFilter,
        handleRailClick,
        viewState.zoom,
        selectedVehicle,
        bounds,
      ),
    ];
  }, [railSim.data, layerTimeSec, railFilter, handleRailClick, viewState.zoom, selectedVehicle, bounds, metroSimEnabled, marmaraySimEnabled, tramSimEnabled, ferrySimEnabled]);

  const extraLayers = useMemo(
    () => {
      // Rail lines her zaman otobüs hatlarının üstünde render edilir
      const isRailLine = (l: { id: string }) => l.id === "turkey-rail-lines";
      const busLineLayers = turkeyOverlayLayers.filter(
        (l) => !l.id.endsWith("-icons") && !l.id.endsWith("-3d") && !isRailLine(l),
      );
      const railLineLayers = turkeyOverlayLayers.filter(isRailLine);
      const iconLayers = turkeyOverlayLayers.filter(
        (l) => l.id.endsWith("-icons") || l.id.endsWith("-3d"),
      );
      return [
        ...radiusLayers,
        ...busLineLayers,   // otobüs hatları altta
        ...railLineLayers,  // raylı hatlar üstte (bus hatlarını örter)
        ...routeLayers,
        ...iconLayers,
        ...(landmarkLayer ? [landmarkLayer] : []),
        ...createBridgeScenegraphLayers(true),
        ...selectedBusRouteLayers,
        ...busSimLayers,
        ...railSimLayers,
      ];
    },
    [radiusLayers, turkeyOverlayLayers, routeLayers, landmarkLayer, selectedBusRouteLayers, busSimLayers, railSimLayers],
  );

  const lots = isparkEnabled ? ispark.lots : [];

  const mapStyleUrl = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

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
      <LoadingScreen visible={!appReady} />
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

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile hamburger button */}
      <button
        type="button"
        className="md:hidden absolute top-4 left-4 z-50 h-10 w-10 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-md border border-border/40 shadow-lg text-muted-foreground hover:text-foreground transition-all"
        onClick={() => setMobileMenuOpen((v) => !v)}
        aria-label="Menü"
      >
        {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Sol sütun: Logo + LayerControl */}
      <div
        className={`absolute flex flex-col gap-3 pointer-events-none z-50 ${mobileMenuOpen ? "top-0 left-0 bottom-0 w-72 pt-16 pb-3" : "hidden md:flex md:top-6 md:left-6 md:z-20"}`}
        style={{ maxHeight: mobileMenuOpen ? "100dvh" : "calc(100vh - 8rem)" }}
      >
        <div className="pointer-events-auto">
          <Header />
        </div>
        <div className="pointer-events-auto flex-1 min-h-0 flex flex-col overflow-hidden">
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
          metroSimEnabled={metroSimEnabled}
          setMetroSimEnabled={setMetroSimEnabled}
          marmaraySimEnabled={marmaraySimEnabled}
          setMarmaraySimEnabled={setMarmaraySimEnabled}
          tramSimEnabled={tramSimEnabled}
          setTramSimEnabled={setTramSimEnabled}
          ferrySimEnabled={ferrySimEnabled}
          setFerrySimEnabled={setFerrySimEnabled}
          railSimLoading={railSim.loading}
        />
        </div>
      </div>

      {/* Üst bar: mobilde sadece SearchBar + tema, masaüstünde tam */}
      <div className="absolute top-4 md:top-6 left-16 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-30 flex items-center gap-2 pointer-events-auto">
        {/* Son güncelleme — sadece masaüstü */}
        {ispark.lastUpdated && (
          <div className="hidden md:flex h-10 items-center gap-1.5 px-3 rounded-xl border border-border/40 bg-background/80 backdrop-blur-md shadow-lg">
            <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide whitespace-nowrap">Güncelleme</span>
            <span className="text-sm font-mono font-bold text-foreground tabular-nums whitespace-nowrap">
              {new Date(ispark.lastUpdated).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
            </span>
          </div>
        )}
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
          className="flex-1 md:flex-none md:w-72"
        />
        {/* Saat — sadece masaüstü */}
        <div className="hidden md:block">
          <IstanbulClock />
        </div>
        {/* Kamera kontrolleri — sadece masaüstü */}
        <div className="hidden md:block">
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
        </div>
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
        className="bottom-20 right-4 md:bottom-24"
      />

      {selectedLot && (
        <IsparkLotDetailPanel
          lot={selectedLot}
          onClose={() => { setSelectedLot(null); clearRoute(); }}
          onGetDirections={getDirections}
          route={route}
        />
      )}

      {(busSimEnabled || metroSimEnabled || marmaraySimEnabled) && (
        <BusListPanel
          buses={activeBuses}
          railVehicles={activeRailVehicles}
          selectedBus={selectedBus}
          selectedVehicle={selectedVehicle}
          onBusClick={handleBusClick}
          onRailClick={handleRailClick}
        />
      )}

      {!selectedLot && selectedBusRouteProps && (
        <BusRouteDetailPanel routeProps={selectedBusRouteProps} onClose={() => setSelectedBusRouteProps(null)} />
      )}

      {selectedBus && (
        <BusDetailPanel
          bus={selectedBus}
          currentTimeSec={busTimeSec}
          stops={busSim.data?.stopsByRoute?.[selectedBus.route]}
          onClose={() => { setSelectedBus(null); setSelectedBusRouteProps(null); trackingRef.current = null; }}
        />
      )}

      {selectedVehicle && !selectedBus && (
        <RailDetailPanel
          vehicle={selectedVehicle}
          route={railSim.data?.routes[selectedVehicle.routeKey]}
          currentTimeSec={busTimeSec}
          onClose={() => { setSelectedVehicle(null); trackingRef.current = null; }}
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
        greenAreasData={overlayFlags.greenAreas ? greenAreasData : null}
        onBuildingRings={setBuildingRings}
        treePoints={overlayFlags.greenAreas ? treePoints : []}
        onMapReady={() => setMapReady(true)}
        />

    </div>
  );
}

export default AppIspark;

