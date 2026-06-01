import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { SphereGeometry, CylinderGeometry, CubeGeometry, ConeGeometry, Geometry } from "@luma.gl/engine";
import type { Layer } from "deck.gl";
import type { TurkeyPoiPoint } from "./turkeyOverlayLayers";

// Enhanced Lightning Bolt Mesh (3D / Extruded)
// We use 12 vertices: 0-5 front, 6-11 back.
const LIGHTNING_MESH_DATA = new Geometry({
  attributes: {
    positions: {
      value: new Float32Array([
        // Front face (Y = 0.2) -> Verticality in Z
        0.0,  0.2,  2.0, // 0: Top
       -0.5,  0.2,  0.5, // 1: Notch left
        0.5,  0.2,  1.0, // 2: Notch right
       -0.2,  0.2, -0.5, // 3: Lower notch left
        0.8,  0.2, -0.2, // 4: Lower notch right
        0.0,  0.2, -2.0, // 5: Bottom tip

        // Back face (Y = -0.2)
        0.0, -0.2,  2.0, // 6
       -0.5, -0.2,  0.5, // 7
        0.5, -0.2,  1.0, // 8
       -0.2, -0.2, -0.5, // 9
        0.8, -0.2, -0.2, // 10
        0.0, -0.2, -2.0  // 11
      ]),
      size: 3
    },
    normals: {
      value: new Float32Array([
        // Front face normals (facing +Y) - these will be "forward" in model space
        0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
        // Back face normals (facing -Y)
        0,-1, 0,  0,-1, 0,  0,-1, 0,  0,-1, 0,  0,-1, 0,  0,-1, 0
      ]),
      size: 3
    }
  },
  indices: {
    value: new Uint16Array([
      // Front face triangles
      0, 1, 2,  
      2, 1, 3,  
      2, 3, 4,  
      4, 3, 5,

      // Back face triangles (reversed winding)
      6, 8, 7,  
      8, 9, 7,  
      8, 10, 9,  
      10, 11, 9,

      // Side faces (connecting front and back)
      0, 6, 1, 1, 6, 7, // Top-left edge
      1, 7, 3, 3, 7, 9, // Mid-left edge
      3, 9, 5, 5, 9, 11,// Bottom-left edge
      5, 11, 4, 4, 11, 10,// Bottom-right edge
      4, 10, 2, 2, 10, 8, // Mid-right edge
      2, 8, 0, 0, 8, 6    // Top-right edge
    ]),
    size: 1
  }
});

export function createCustom3DPoiLayer(
  id: string,
  data: TurkeyPoiPoint[],
  kind: string,
  onClick?: (poi: TurkeyPoiPoint) => void,
): Layer {
  let mesh: any = new SphereGeometry({ nlat: 16, nlong: 16 });
  let color: [number, number, number] = [255, 255, 255];
  let sizeScale = 1;
  let elevationOffset = 25;

  switch (kind) {
    case "ev_charging_station":
      mesh = LIGHTNING_MESH_DATA;
      color = [255, 215, 0]; // Gold/Yellow
      sizeScale = 15;
      elevationOffset = 30;
      break;
    case "bus_stop":
      mesh = new CubeGeometry();
      color = [59, 130, 246]; // Blue
      sizeScale = 8;
      break;
    case "rail_station":
      mesh = new CylinderGeometry({ radius: 1, height: 3 });
      color = [168, 85, 247]; // Purple
      sizeScale = 10;
      break;
    case "taxi_stop":
      mesh = new ConeGeometry({ radius: 1, height: 3 });
      color = [252, 211, 77]; // Yellow
      sizeScale = 12;
      break;
    case "sea_station":
      mesh = new SphereGeometry({ nlat: 12, nlong: 12 });
      color = [14, 165, 233]; // Sky blue
      sizeScale = 15;
      break;
    case "toilet":
      mesh = new SphereGeometry({ nlat: 8, nlong: 8 });
      color = [244, 63, 94]; // Rose
      sizeScale = 6;
      break;
    default:
      mesh = new SphereGeometry({ nlat: 16, nlong: 16 });
      color = [255, 255, 255];
      sizeScale = 8;
  }

  return new SimpleMeshLayer<TurkeyPoiPoint>({
    id: `${id}-3d-mesh`,
    data,
    mesh,
    sizeScale,
    sizeUnits: "meters",
    getOrientation: [0, 0, 0], // Replaced random rotation with fixed [0, 0, 0]
    getPosition: (d) => [d.position[0], d.position[1], elevationOffset],
    getColor: color,
    pickable: true,
    onClick: (info) => {
      if (info.object && onClick) {
        onClick(info.object);
      }
      return true;
    },
  });
}
