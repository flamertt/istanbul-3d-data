import { useEffect, useState } from "react";

export interface RailStop {
  name: string;
  elapsed_secs: number; // t0'dan itibaren
}

export interface RailRoute {
  name: string;
  headsign: string;
  color: [number, number, number];
  kind: "metro" | "marmaray" | "tram" | "funicular" | "ferry";
  path: [number, number][];
  duration_secs: number;
  stops?: RailStop[];
}

export interface RailTrip {
  rk: string;   // route key (e.g. "M2|0")
  t0: number;   // start time seconds from midnight
}

export interface RailSimData {
  routes: Record<string, RailRoute>;
  trips: RailTrip[];
}

export function useRailSim() {
  const [data, setData] = useState<RailSimData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/data/rail_sim.json")
      .then((r) => r.json())
      .then((d: RailSimData) => { setData(d); setLoading(false); })
      .catch((e) => { setError(String(e)); setLoading(false); });
  }, []);

  return { data, loading, error };
}
