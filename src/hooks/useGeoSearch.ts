import { useState, useCallback, useRef, useEffect } from "react";
import { geocode, type GeoResult } from "../lib/geocode";

const RADIUS_OPTIONS = [200, 400, 600, 800] as const;
export type RadiusOption = (typeof RADIUS_OPTIONS)[number];
export { RADIUS_OPTIONS };

interface GeoSearchState {
  query: string;
  results: GeoResult[];
  selectedResult: GeoResult | null;
  radius: RadiusOption;
  isSearching: boolean;
}

export function useGeoSearch() {
  const [state, setState] = useState<GeoSearchState>({
    query: "",
    results: [],
    selectedResult: null,
    radius: 400,
    isSearching: false,
  });

  const debounceRef = useRef<number | null>(null);

  const setQuery = useCallback((q: string) => {
    setState((s) => ({ ...s, query: q }));

    if (debounceRef.current != null) clearTimeout(debounceRef.current);

    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setState((s) => ({ ...s, results: [], isSearching: false }));
      return;
    }

    setState((s) => ({ ...s, isSearching: true }));
    debounceRef.current = window.setTimeout(async () => {
      const r = await geocode(trimmed);
      setState((s) => ({ ...s, results: r, isSearching: false, selectedResult: null }));
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current != null) clearTimeout(debounceRef.current);
    };
  }, []);

  const selectResult = useCallback((r: GeoResult) => {
    setState((s) => ({
      ...s,
      selectedResult: r,
      results: [],
      query: r.name,
    }));
  }, []);

  const clearSearch = useCallback(() => {
    setState((s) => ({
      ...s,
      query: "",
      results: [],
      selectedResult: null,
    }));
  }, []);

  const setRadius = useCallback((r: RadiusOption) => {
    setState((s) => ({ ...s, radius: r }));
  }, []);

  return {
    ...state,
    setQuery,
    selectResult,
    clearSearch,
    setRadius,
  };
}

