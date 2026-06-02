import { ScenegraphLayer } from "@deck.gl/mesh-layers";
import type { Layer } from "deck.gl";

interface BridgeDef {
  id: string;
  name: string;
  /** Köprünün merkez koordinatı (başlangıç+bitiş ortası) */
  lat: number;
  lng: number;
  /** OSM'den hesaplanan gerçek açı */
  heading: number;
  /** OSM'den ölçülen gerçek uzunluk (metre) */
  lengthM: number;
  /** Köprü yüksekliği (metre) */
  alt: number;
}

// Tüm koordinatlar OSM Overpass API'den çekildi ve doğrulandı
// heading = OSM başlangıç→bitiş noktası bearing (derece, kuzeyden saat yönünde)
const ISTANBUL_BRIDGES: BridgeDef[] = [
  // ── Boğaz Köprüleri ───────────────────────────────────────────────────────
  {
    id: "b1",
    name: "15 Temmuz Şehitler Köprüsü",
    // OSM: start=[29.04017,41.04003] → end=[29.02872,41.05102]
    lat: 41.04552, lng: 29.03445,
    heading: 321.8,   // KKB yönünde (Anadolu→Avrupa)
    lengthM: 1554,
    alt: 64,
  },
  {
    id: "b2",
    name: "Fatih Sultan Mehmet Köprüsü",
    // OSM: start=[29.05428,41.09091] → end=[29.06807,41.09155]
    lat: 41.09123, lng: 29.06117,
    heading: 86.5,    // Neredeyse tam doğu
    lengthM: 1158,
    alt: 64,
  },
  {
    id: "b3",
    name: "Yavuz Sultan Selim Köprüsü",
    // OSM: start=[29.10156,41.20756] → end=[29.12177,41.19838]
    lat: 41.20297, lng: 29.11167,
    heading: 121.1,   // GDB yönünde
    lengthM: 1975,
    alt: 73,
  },
  // ── Haliç Köprüleri ───────────────────────────────────────────────────────
  {
    id: "h1",
    name: "Galata Köprüsü",
    lat: 41.01996, lng: 28.97321,
    heading: 208.0,
    lengthM: 530,
    alt: 8,
  },
  {
    id: "h2",
    name: "Atatürk (Unkapanı) Köprüsü",
    lat: 41.02404, lng: 28.96502,
    heading: 59.2,
    lengthM: 643,
    alt: 8,
  },
  {
    id: "h3",
    name: "Haliç Köprüsü",
    lat: 41.04323, lng: 28.94165,
    heading: 32.1,
    lengthM: 556,
    alt: 10,
  },
];

// bridge.gltf: Z ekseni = 120 birim (uzunluk)
const NATIVE_Z = 120;

export function createBridgeScenegraphLayers(enabled: boolean): Layer[] {
  if (!enabled) return [];

  return ISTANBUL_BRIDGES.map(b =>
    new ScenegraphLayer<BridgeDef>({
      id: `bridge-${b.id}`,
      data: [b],
      scenegraph: "/models/bridge.glb",
      pickable: true,
      getPosition: (d) => [d.lng, d.lat, d.alt],
      // V8: doğru varyasyon
      getOrientation: (d) => [0, 180 - d.heading, -90] as [number, number, number],
      sizeScale: b.lengthM / NATIVE_Z,
      getScale: [1, 1, 1],
      getColor: [255, 60, 60, 255], // parlak açık kırmızı
      _lighting: "pbr",
    })
  );
}
