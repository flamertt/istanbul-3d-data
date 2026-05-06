function buildPoiIconDataUrl(iconMarkup: string, fill: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 112 112">
    <rect x="8" y="8" width="96" height="96" rx="24" fill="${fill}" stroke="#e2e8f0" stroke-width="6"/>
    ${iconMarkup}
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

export const POI_ICON_URLS = {
  busStop: buildPoiIconDataUrl(
    `<rect x="30" y="30" width="52" height="36" rx="8" fill="#ffffff"/>
     <circle cx="42" cy="70" r="5" fill="#ffffff"/>
     <circle cx="70" cy="70" r="5" fill="#ffffff"/>`,
    "#2563eb",
  ),
  railStation: buildPoiIconDataUrl(
    `<rect x="34" y="26" width="44" height="32" rx="8" fill="#ffffff"/>
     <path d="M36 74h40l-8-10H44z" fill="#ffffff"/>
     <rect x="52" y="58" width="8" height="16" rx="2" fill="#ffffff"/>`,
    "#7c3aed",
  ),
  evCharging: buildPoiIconDataUrl(
    `<rect x="36" y="24" width="30" height="48" rx="7" fill="#ffffff"/>
     <path d="M72 36h8v20h-8l6 10" stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
     <path d="M48 34l-8 16h8l-6 14 16-20h-9l7-10z" fill="#ca8a04"/>`,
    "#ca8a04",
  ),
  micromobility: buildPoiIconDataUrl(
    `<circle cx="38" cy="70" r="8" fill="#ffffff"/>
     <circle cx="72" cy="70" r="8" fill="#ffffff"/>
     <path d="M38 70h20l8-22h8" stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    "#ea580c",
  ),
  toilet: buildPoiIconDataUrl(
    `<circle cx="44" cy="34" r="8" fill="#ffffff"/>
     <rect x="38" y="44" width="12" height="30" rx="5" fill="#ffffff"/>
     <circle cx="68" cy="34" r="8" fill="#ffffff"/>
     <path d="M60 44h16v8H70v22h-8z" fill="#ffffff"/>`,
    "#e11d48",
  ),
  taxi: buildPoiIconDataUrl(
    `<rect x="28" y="40" width="56" height="24" rx="8" fill="#ffffff"/>
     <rect x="40" y="32" width="32" height="10" rx="4" fill="#ffffff"/>
     <circle cx="42" cy="68" r="5" fill="#ffffff"/>
     <circle cx="70" cy="68" r="5" fill="#ffffff"/>`,
    "#c026d3",
  ),
  taxiDolmus: buildPoiIconDataUrl(
    `<rect x="26" y="34" width="60" height="34" rx="8" fill="#ffffff"/>
     <rect x="34" y="42" width="16" height="10" rx="2" fill="#e11d48"/>
     <rect x="54" y="42" width="16" height="10" rx="2" fill="#e11d48"/>
     <circle cx="42" cy="72" r="5" fill="#ffffff"/>
     <circle cx="70" cy="72" r="5" fill="#ffffff"/>`,
    "#e11d48",
  ),
  minibus: buildPoiIconDataUrl(
    `<rect x="24" y="34" width="64" height="34" rx="8" fill="#ffffff"/>
     <rect x="32" y="42" width="18" height="11" rx="2" fill="#059669"/>
     <rect x="54" y="42" width="18" height="11" rx="2" fill="#059669"/>
     <circle cx="40" cy="72" r="5" fill="#ffffff"/>
     <circle cx="72" cy="72" r="5" fill="#ffffff"/>`,
    "#059669",
  ),
  seaStation: buildPoiIconDataUrl(
    `<path d="M32 58h48l-6 16H38z" fill="#ffffff"/>
     <rect x="50" y="30" width="10" height="28" rx="3" fill="#ffffff"/>
     <path d="M32 78c6 4 12 4 18 0s12-4 18 0 12 4 18 0" stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    "#1d4ed8",
  ),
} as const;
