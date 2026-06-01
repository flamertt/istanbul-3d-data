import { IconLayer } from "@deck.gl/layers";
import type { Layer } from "deck.gl";
import type { Landmark } from "../types";

// Category to SVG Path mapping (Lucide-like simplified paths)
const CATEGORY_PATHS: Record<string, string> = {
  mosque: '<path d="M12 2v2M7 4V2M17 4V2M5 8v12h14V8M12 8v12" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2a4 4 0 0 1 4 4v2H8V6a4 4 0 0 1 4-4z"/>',
  palace: '<path d="M21 20v-8a2 2 0 0 0-2-2h-1V4l-3 3V4l-3 3V4l-3 3V4L6 7V4L3 7v13h18zM12 20v-4" fill="none" stroke="currentColor" stroke-width="2"/>',
  market: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0" fill="none" stroke="currentColor" stroke-width="2"/>',
  museum: '<path d="M2 22h20M5 8v10M9 8v10M13 8v10M17 8v10M2 11h20M2 7l10-5 10 5" fill="none" stroke="currentColor" stroke-width="2"/>',
  tower: '<path d="M12 2v20M2 22h20M8 12h8M10 8h4L12 2l-2 6z" fill="none" stroke="currentColor" stroke-width="2"/>',
  street: '<path d="M12 2v20M5 22l14-20M19 22 5 2" fill="none" stroke="currentColor" stroke-width="2"/>',
  square: '<rect width="18" height="18" x="3" y="3" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  castle: '<path d="M3 21h18v-7l-2-2V8l2-2V3h-3l-1 1-1-1-1 1-1-1-1 1-1-1h-2l-1 1-1-1-1 1-1-1-1 1-1-1H3v3l2 2v4l-2 2v7z" fill="none" stroke="currentColor" stroke-width="2"/>',
  island: '<path d="M12 2c3 0 6 3 6 10H6c0-7 3-10 6-10zM4 22h16c0-2-8-2-8-2s-8 0-8 2z" fill="none" stroke="currentColor" stroke-width="2"/>',
  university: '<path d="m22 10-10-5L2 10l10 5 10-5Z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" fill="none" stroke="currentColor" stroke-width="2"/>',
  viewpoint: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="m15 15 5 5M12 10l-4 4" fill="none" stroke="currentColor" stroke-width="2"/>',
  stadium: '<path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z"/><path d="M12 8c2.209 0 4 1.791 4 4s-1.791 4-4 4-4-1.791-4-4 1.791-4 4-4z" fill="none" stroke="currentColor" stroke-width="2"/>',
  mall: '<path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4M12 12v9" fill="none" stroke="currentColor" stroke-width="2"/>',
  other: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="none" stroke="currentColor" stroke-width="2"/>'
};

const CATEGORY_COLORS: Record<string, [number, number, number]> = {
  mosque: [30, 64, 175],      // Blue
  palace: [190, 24, 93],      // Rose
  market: [180, 83, 9],       // Amber
  museum: [126, 34, 206],     // Purple
  tower: [55, 65, 81],        // Gray/Slate
  street: [5, 150, 105],      // Emerald
  square: [37, 99, 235],      // Royal Blue
  castle: [153, 27, 27],      // Red
  island: [14, 165, 233],     // Sky
  university: [79, 70, 229],  // Indigo
  viewpoint: [217, 70, 239],  // Fuchsia
  stadium: [22, 163, 74],      // Green
  mall: [219, 39, 119],       // Pink
  theatre: [249, 115, 22],    // Orange
  monument: [107, 114, 128],  // Gray
  library: [101, 163, 13],    // Lime
  other: [107, 114, 128]
};

function createSvgIcon(category: string) {
  const path = CATEGORY_PATHS[category] || CATEGORY_PATHS.other;
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  const rgb = `rgb(${color[0]},${color[1]},${color[2]})`;
  
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <!-- Outer Circle with Dark Background and Colored Border -->
      <circle cx="50" cy="50" r="46" fill="#030712" stroke="${rgb}" stroke-width="8" />
      <!-- Inner Icon Group in White -->
      <g transform="translate(25, 25) scale(2.1)" color="white">
        ${path}
      </g>
    </svg>`
  )}`;
}

export function createLandmarkLayer(
  landmarks: Landmark[],
  zoom: number,
  onClick?: (landmark: Landmark) => void
): Layer | null {
  if (!landmarks.length || zoom < 10) return null;

  return new IconLayer<Landmark>({
    id: "landmark-layer",
    data: landmarks,
    pickable: true,
    sizeUnits: "pixels",
    getPosition: (d) => [d.coordinates[0], d.coordinates[1]],
    getIcon: (d) => {
      return {
        url: createSvgIcon(d.category),
        width: 100,
        height: 100,
        anchorY: 50, // Point icons are now centered circles
      };
    },
    getSize: (d) => (zoom >= 14 ? 40 : 30),
    getColor: [255, 255, 255],
    onClick: (info) => {
      if (info.object && onClick) {
        onClick(info.object);
      }
    },
  });
}
