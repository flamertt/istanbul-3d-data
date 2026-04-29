import { Search, X, Loader2 } from "lucide-react";
import type { GeoResult } from "../lib/geocode";
import { RADIUS_OPTIONS, type RadiusOption } from "../hooks/useSearch";

interface SearchBarProps {
  query: string;
  results: GeoResult[];
  isSearching: boolean;
  radius: RadiusOption;
  hasSelection: boolean;
  onQueryChange: (q: string) => void;
  onSelectResult: (r: GeoResult) => void;
  onClear: () => void;
  onRadiusChange: (r: RadiusOption) => void;
}

export function SearchBar({
  query,
  results,
  isSearching,
  radius,
  hasSelection,
  onQueryChange,
  onSelectResult,
  onClear,
  onRadiusChange,
}: SearchBarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-80">
      {/* Search input */}
      <div className="flex items-center rounded-2xl border border-gray-800/50 bg-gray-950/82 backdrop-blur-md shadow-[0_10px_26px_rgba(0,0,0,0.20)]">
        <div className="flex h-full items-center justify-center px-5 text-gray-500">
          <Search size={15} className="pointer-events-none shrink-0" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="İstanbul adresi ara..."
          className="min-w-0 flex-1 py-3 pl-3 pr-3 bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-0"
        />
        {(query || hasSelection) && (
          <button
            onClick={onClear}
            className="mr-3 flex h-7 w-7 items-center justify-center rounded-md hover:bg-gray-800/70 transition-colors"
          >
            {isSearching ? (
              <Loader2 size={14} className="text-gray-400 animate-spin" />
            ) : (
              <X size={14} className="text-gray-400" />
            )}
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {results.length > 0 && !hasSelection && (
        <div className="mt-2 rounded-2xl border border-gray-800/50 bg-gray-950/90 backdrop-blur-md overflow-hidden shadow-[0_10px_26px_rgba(0,0,0,0.22)]">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => onSelectResult(r)}
              className="w-full text-left px-4 py-3 text-sm hover:bg-gray-800/60 transition-colors border-b border-gray-800/30 last:border-0"
            >
              <span className="text-white">{r.name}</span>
              <span className="text-[10px] text-gray-500 ml-2">{r.type}</span>
            </button>
          ))}
        </div>
      )}

      {/* Radius selector (shown when a result is selected) */}
      {hasSelection && (
        <div className="mt-2 flex items-center justify-center gap-2 rounded-2xl border border-gray-800/50 bg-gray-950/82 backdrop-blur-md px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
          <span className="text-[11px] text-gray-400 mr-1 uppercase tracking-wide">Yarıçap</span>
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => onRadiusChange(r)}
              className={`text-[11px] px-2.5 py-1 transition-colors ${
                radius === r
                  ? "bg-blue-500/90 text-white"
                  : "bg-gray-800/60 text-gray-400 hover:bg-gray-700/60"
              }`}
            >
              {r}m
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
