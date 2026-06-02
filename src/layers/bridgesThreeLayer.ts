import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Map as MapLibreMap } from "maplibre-gl";
import * as maplibregl from "maplibre-gl";

interface BridgeDef {
  id: string;
  name: string;
  lat: number;
  lng: number;
  alt: number;
  /** Kuzeyden saat yönünde derece */
  heading: number;
  /** Gerçek uzunluk (metre) */
  lengthM: number;
}

const MODEL_NATIVE_Z = 120; // bridge.gltf Z eksenindeki birim sayısı

const ISTANBUL_BRIDGES: BridgeDef[] = [
  { id: "b1",  name: "15 Temmuz Şehitler Köprüsü", lat: 41.0463, lng: 29.0338, alt: 64, heading: 62,  lengthM: 1560 },
  { id: "b2",  name: "Fatih Sultan Mehmet Köprüsü", lat: 41.0877, lng: 29.0563, alt: 64, heading: 68,  lengthM: 1090 },
  { id: "b3",  name: "Yavuz Sultan Selim Köprüsü",  lat: 41.2059, lng: 29.0888, alt: 73, heading: 50,  lengthM: 1408 },
  { id: "h1",  name: "Galata Köprüsü",              lat: 41.0169, lng: 28.9741, alt:  8, heading: 170, lengthM: 490  },
  { id: "h2",  name: "Atatürk Köprüsü",             lat: 41.0254, lng: 28.9645, alt:  8, heading: 172, lengthM: 436  },
  { id: "h3",  name: "Haliç Köprüsü",               lat: 41.0489, lng: 28.9437, alt: 10, heading: 168, lengthM: 995  },
];

export function addBridgeLayer(map: MapLibreMap): void {
  if (map.getLayer("bridges-3d")) return;

  const camera = new THREE.Camera();
  const scene = new THREE.Scene();
  let renderer: THREE.WebGLRenderer | null = null;

  // Işıklandırma
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(0.5, -0.7, 1).normalize();
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  // Kırmızı malzeme — texture override
  const redMaterial = new THREE.MeshStandardMaterial({ color: 0xdc2626 });

  const loader = new GLTFLoader();
  loader.load("/models/bridge.gltf", (gltf) => {
    // Her köprü için model klonu oluştur
    ISTANBUL_BRIDGES.forEach((b) => {
      const coord = maplibregl.MercatorCoordinate.fromLngLat(
        { lng: b.lng, lat: b.lat },
        b.alt,
      );
      const metersPerUnit = coord.meterInMercatorCoordinateUnits();
      const modelScale = (b.lengthM / MODEL_NATIVE_Z) * metersPerUnit;

      const group = new THREE.Group();

      // Modeli klonla ve malzemeyi kırmızıya boya
      const modelClone = gltf.scene.clone(true);
      modelClone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).material = redMaterial;
        }
      });
      group.add(modelClone);

      // Konum: Mercator koordinatları
      group.position.set(coord.x, coord.y, coord.z ?? 0);

      // Ölçek: metreden Mercator birimine çevir (Y eksenini ters çevir — Mercator Y ters)
      group.scale.set(modelScale, -modelScale, modelScale);

      // Rotasyon:
      // 1) X'te 90° — model Z (uzunluk) yatay düzleme iner
      // 2) Z'de -heading rad — köprü doğru yöne döner (Mercator'da saat yönü ters)
      group.rotation.order = "ZXY";
      group.rotation.x = Math.PI / 2;
      group.rotation.z = -(b.heading * Math.PI) / 180;

      scene.add(group);
    });

    map.triggerRepaint();
  });

  const customLayer: maplibregl.CustomLayerInterface = {
    id: "bridges-3d",
    type: "custom",
    renderingMode: "3d",

    onAdd(_map: MapLibreMap, gl: WebGLRenderingContext) {
      renderer = new THREE.WebGLRenderer({
        canvas: _map.getCanvas(),
        context: gl,
        antialias: true,
      });
      renderer.autoClear = false;
      renderer.shadowMap.enabled = false;
    },

    render(_gl: WebGLRenderingContext, args: maplibregl.CustomRenderMethodInput) {
      if (!renderer) return;
      const matrix = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
      camera.projectionMatrix = matrix;
      renderer.resetState();
      renderer.render(scene, camera);
      map.triggerRepaint();
    },
  };

  map.addLayer(customLayer);
}

export function removeBridgeLayer(map: MapLibreMap): void {
  if (map.getLayer("bridges-3d")) map.removeLayer("bridges-3d");
}
