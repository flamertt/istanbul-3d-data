import { useEffect, useState } from "react";
import type { IsparkLot } from "../types";

interface IsparkLotsState {
  loading: boolean;
  error: string | null;
  lots: IsparkLot[];
  lastUpdated: string | null;
}

type IsparkCacheV1 = {
  version: 1;
  expiresAt: number; // epoch ms
  lastUpdated: string;
  lots: IsparkLot[];
};

const CACHE_KEY = "ispark_lots_cache_v1";
// Kullanıcı “her F5 tekrar yükleme olmasın” dediği için makul bir TTL koyuyoruz.
// İstersen bunu 10 dk / 1 saat / 1 gün gibi kolayca değiştirebiliriz.
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 dakika

function readIsparkCache(): IsparkCacheV1 | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<IsparkCacheV1>;
    if (parsed.version !== 1) return null;
    if (!parsed.expiresAt || typeof parsed.expiresAt !== "number") return null;
    if (Date.now() > parsed.expiresAt) return null;
    if (!Array.isArray(parsed.lots)) return null;
    if (typeof parsed.lastUpdated !== "string") return null;
    return parsed as IsparkCacheV1;
  } catch {
    return null;
  }
}

function writeIsparkCache(cache: Omit<IsparkCacheV1, "version">) {
  try {
    const payload: IsparkCacheV1 = { version: 1, ...cache };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage dolu olabilir; uygulama çalışmaya devam etsin.
  }
}

function toNumberOrZero(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v));
  return Number.isFinite(n) ? n : 0;
}

export function useIsparkLots() {
  const [state, setState] = useState<IsparkLotsState>({
    loading: true,
    error: null,
    lots: [],
    lastUpdated: null,
  });

  useEffect(() => {
    let cancelled = false;

    // Önce cache dene (F5'te API çağrısını azaltır).
    const cached = readIsparkCache();
    if (cached && !cancelled) {
      setState({
        loading: false,
        error: null,
        lots: cached.lots,
        lastUpdated: cached.lastUpdated,
      });
      return () => {
        cancelled = true;
      };
    }

    async function load() {
      try {
        setState((s) => ({ ...s, loading: true, error: null }));

        // Vite proxy: /api/ibb/ispark/... -> https://api.ibb.gov.tr/ispark/...
        const url = "/api/ibb/ispark/Park?metot=park";
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`İSPARK API hatası: ${resp.status} ${resp.statusText}`);

        const json = (await resp.json()) as unknown;
        if (!Array.isArray(json)) {
          throw new Error("İSPARK API beklenen JSON dizisini döndürmedi.");
        }

        const lots: IsparkLot[] = json.map((r) => {
          const obj = r as Record<string, unknown>;
          return {
            id: toNumberOrZero(obj["parkID"]),
            name: String(obj["parkName"] ?? ""),
            lat: toNumberOrZero(obj["lat"]),
            lng: toNumberOrZero(obj["lng"]),
            capacity: toNumberOrZero(obj["capacity"]),
            emptyCapacity: toNumberOrZero(obj["emptyCapacity"]),
            isOpen: Number(String(obj["isOpen"] ?? 0)) === 1,
            parkType: String(obj["parkType"] ?? ""),
            district: String(obj["district"] ?? ""),
            freeTimeMinutes: obj["freeTime"] == null ? null : toNumberOrZero(obj["freeTime"]),
            workHours: obj["workHours"] == null ? null : String(obj["workHours"]),
          };
        });

        if (cancelled) return;

        // Cache'e yaz (API ile tekrar yükleme maliyetini azaltır).
        const lastUpdated = new Date().toISOString();
        writeIsparkCache({
          expiresAt: Date.now() + CACHE_TTL_MS,
          lastUpdated,
          lots,
        });
        setState({
          loading: false,
          error: null,
          lots,
          lastUpdated,
        });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

