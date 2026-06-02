/**
 * Shared circle icon builder — all map icons use this style:
 * dark circle (#030712) + colored stroke border + white SVG icon inside.
 * Icons are 24×24 viewBox paths, scaled to fit the circle.
 */
/**
 * Compute heading (degrees, clockwise from north) from a path at a given progress (0-1).
 * deck.gl getAngle uses degrees, clockwise from north.
 */
export function computeHeading(progress: number, path: [number, number][]): number {
  if (path.length < 2) return 0;

  // Total length
  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const dx = path[i + 1][0] - path[i][0];
    const dy = path[i + 1][1] - path[i][1];
    const l = Math.sqrt(dx * dx + dy * dy);
    segLens.push(l);
    totalLen += l;
  }

  if (totalLen === 0) return 0;

  // Find the segment at current progress
  let target = Math.max(0, Math.min(1, progress)) * totalLen;
  for (let i = 0; i < segLens.length; i++) {
    if (target <= segLens[i] || i === segLens.length - 1) {
      const dx = path[i + 1][0] - path[i][0]; // longitude diff
      const dy = path[i + 1][1] - path[i][1]; // latitude diff
      // atan2(east, north) = bearing clockwise from north
      const bearing = Math.atan2(dx, dy) * (180 / Math.PI);
      return (bearing + 360) % 360;
    }
    target -= segLens[i];
  }
  return 0;
}

/** Direction arrow icon — small white chevron pointing up (north), rotated by getAngle */
export function buildArrowIcon(colorHex: string): string {
  return "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <polygon points="20,2 30,30 20,24 10,30" fill="${colorHex}" stroke="#030712" stroke-width="2" stroke-linejoin="round"/>
    </svg>`
  );
}

export function buildCircleIcon(svgPath: string, colorHex: string, scale = 2.2): string {
  const offset = 50 - scale * 12; // center 24×24 icon
  return "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" fill="#030712" stroke="${colorHex}" stroke-width="9"/>
      <g transform="translate(${offset},${offset}) scale(${scale})" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        ${svgPath}
      </g>
    </svg>`
  );
}

// ── Static icon paths (24×24 Lucide-style) ────────────────────────────────────

export const ICON_PATHS = {
  // Transport
  bus:        `<rect x="2" y="7" width="20" height="12" rx="2"/><path d="M17 19h2a1 1 0 0 0 1-1v-1H4v1a1 1 0 0 0 1 1h2"/><circle cx="8" cy="19" r="1.5" fill="white"/><circle cx="16" cy="19" r="1.5" fill="white"/><path d="M2 11h20M8 7v4M16 7v4"/>`,
  train:      `<rect x="4" y="3" width="16" height="14" rx="2"/><path d="M4 11h16"/><circle cx="9" cy="20" r="2" fill="white"/><circle cx="15" cy="20" r="2" fill="white"/><path d="M5 9h4M5 13h4M15 9h4M15 13h4M9 20l-2 2M15 20l2 2"/>`,
  marmaray:   `<path d="M2 12 Q6 6 12 5 Q18 6 22 12"/><line x1="7" y1="9" x2="7" y2="13"/><line x1="17" y1="8" x2="17" y2="13"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 13v7M12 13v7M17 13v7"/>`,
  tram:       `<rect x="2" y="9" width="20" height="10" rx="2"/><path d="M7 9V7M17 9V7M5 7h14"/><path d="M12 5v2"/><circle cx="7" cy="21" r="1.5" fill="white"/><circle cx="17" cy="21" r="1.5" fill="white"/><path d="M2 13h20M7 9v10M17 9v10"/>`,
  metro:      `<path d="M3 19V7l4 6 5-7 5 7 4-6v12"/><path d="M3 19h18"/>`,

  // POI
  busStop:    `<rect x="3" y="6" width="14" height="10" rx="2"/><circle cx="6" cy="18" r="2" fill="white"/><circle cx="14" cy="18" r="2" fill="white"/><path d="M3 10h14"/><path d="M17 8h4v6h-4"/>`,
  railStation:`<rect x="5" y="4" width="14" height="12" rx="2"/><path d="M5 10h14"/><circle cx="9" cy="19" r="2" fill="white"/><circle cx="15" cy="19" r="2" fill="white"/><path d="M8 16l-1 3M16 16l1 3"/>`,
  evCharging: `<path d="M13 2 L7 13h7l-1 9 7-11h-7z" fill="white" stroke="none"/>`,
  bike:       `<circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M6 15l4-8h4l2 3"/><path d="M14 7l-1-3h3"/>`,
  toilet:     `<circle cx="8" cy="5" r="2"/><path d="M6 10h4v5H8v5"/><circle cx="16" cy="5" r="2"/><path d="M14 10h4v3h-2v7h-2v-7h-2v-3z"/>`,
  taxi:       `<path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h8l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/><circle cx="8" cy="17" r="2" fill="white"/><circle cx="16" cy="17" r="2" fill="white"/><path d="M9 9h6"/>`,
  minibus:    `<rect x="2" y="7" width="20" height="11" rx="2"/><path d="M16 18h2a1 1 0 0 0 1-1v-1H5v1a1 1 0 0 0 1 1h2"/><circle cx="8.5" cy="18" r="1.5" fill="white"/><circle cx="15.5" cy="18" r="1.5" fill="white"/><path d="M2 11h20M12 7v4"/>`,
  seaStation: `<path d="M3 17h18M3 17c1-2 3-3 5-3h8c2 0 4 1 5 3"/><path d="M12 6v8M9 9l3-3 3 3"/><path d="M5 17l1 3H6M19 17l-1 3H18"/>`,
  fork:       `<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>`,
  heart:      `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`,
  trees:      `<path d="M17 14h.01M12 2l4.5 8H16l1 3H7l1-3h-.5L12 2zM7 17h10v4H7z"/>`,

  // Landmarks
  mosque:     `<path d="M8 17h8M10 21H8a2 2 0 0 1-2-2v-8l-2-1V8l4-2h8l4 2v2l-2 1v8a2 2 0 0 1-2 2h-2"/><path d="M12 2a3 3 0 0 1 3 3v2a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M9 17v4"/>`,
  museum:     `<path d="M2 22h20M2 9l10-7 10 7H2zM6 9v13M10 9v13M14 9v13M18 9v13"/>`,
  castle:     `<path d="M22 20v-9H2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2zM18 11V4H6v7M15 22v-4a3 3 0 0 0-6 0v4M2 11h20M4 4h4v3H4zM16 4h4v3h-4z"/>`,
  monument:   `<path d="M6 21h12M9 21V9l3-6 3 6v12M9 12h6M10 17h4"/>`,
  university: `<path d="M22 10L12 5 2 10l10 5 10-5zM6 12v5c0 2.5 2.7 4 6 4s6-1.5 6-4v-5M2 10v6"/>`,
  theatre:    `<path d="M2 10s3-3 3-8h14c0 5 3 8 3 8M7 15s2 3 5 3 5-3 5-3M12 3v12"/><path d="M8 13c0 0 .5 2 4 2s4-2 4-2"/>`,
  viewpoint:  `<circle cx="12" cy="12" r="3"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>`,
  mall:       `<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>`,
  stadium:    `<ellipse cx="12" cy="11" rx="8" ry="5"/><ellipse cx="12" cy="11" rx="4" ry="2.5"/><path d="M4 11v5c0 3 4 5 8 5s8-2 8-5v-5"/>`,
  library:    `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h8M8 15h6"/>`,
  micromobility: `<circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M12 17V7l-5 3M12 7l4 4"/>`,
};
