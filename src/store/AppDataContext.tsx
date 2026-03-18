/**
 * AppDataContext — Tier 1 cache for static catalog data.
 * Stores cards (with artworks + set badges), sets, and shop products
 * in localStorage with version-based invalidation.
 *
 * On app start: checks data version -> uses cache or reloads everything.
 * Version changes when admin imports cards, toggles sets, or modifies shop config.
 */

import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Card } from '../types/card';
import type { ShopData } from '../services/shopApi';
import type { CachedSet } from '../services/cardApi';
import { fetchAllCards, fetchAllSets } from '../services/cardApi';
import { fetchShopProducts } from '../services/shopApi';
import { fetchDataVersion } from '../services/versionApi';

const CACHE_KEY = 'dmc-app-data-v1';
const OLD_CACHE_KEY = 'dmc-cards-v3';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days safety net

interface AppDataCache {
  version: string;
  timestamp: number;
  cards: Card[];
  sets: CachedSet[];
  shopProducts: ShopData;
}

interface AppDataContextValue {
  cards: Card[];
  sets: CachedSet[];
  shopProducts: ShopData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Silent background version check — reloads if data changed, no loading spinner. */
  revalidate: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue>({
  cards: [],
  sets: [],
  shopProducts: null,
  loading: true,
  error: null,
  refresh: async () => {},
  revalidate: async () => {},
});

function readCache(): AppDataCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const cache: AppDataCache = JSON.parse(raw);
    const age = Date.now() - cache.timestamp;

    // Enforce max TTL as safety net
    if (age > MAX_AGE_MS) return null;

    return cache;
  } catch {
    return null;
  }
}

function writeCache(cache: AppDataCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

function clearOldCaches() {
  try {
    localStorage.removeItem(OLD_CACHE_KEY);
  } catch {
    // ignore
  }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [sets, setSets] = useState<CachedSet[]>([]);
  const [shopProducts, setShopProducts] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    clearOldCaches();

    try {
      const cached = readCache();
      const serverVersion = await fetchDataVersion();

      // Use cache if version matches and cache exists
      if (cached && serverVersion && cached.version === serverVersion) {
        setCards(cached.cards);
        setSets(cached.sets);
        setShopProducts(cached.shopProducts);
        setLoading(false);
        return;
      }

      // Use cache if server is unreachable but cache exists
      if (cached && !serverVersion) {
        setCards(cached.cards);
        setSets(cached.sets);
        setShopProducts(cached.shopProducts);
        setLoading(false);
        return;
      }

      // Fetch all data in parallel
      const [freshCards, freshSets, freshShop] = await Promise.all([
        fetchAllCards(),
        fetchAllSets(),
        fetchShopProducts(),
      ]);

      setCards(freshCards);
      setSets(freshSets);
      setShopProducts(freshShop);

      // Write to cache with new version
      if (serverVersion) {
        writeCache({
          version: serverVersion,
          timestamp: Date.now(),
          cards: freshCards,
          sets: freshSets,
          shopProducts: freshShop,
        });
      }
    } catch (err) {
      // Try to use stale cache on error
      const staleCache = readCache();
      if (staleCache) {
        setCards(staleCache.cards);
        setSets(staleCache.sets);
        setShopProducts(staleCache.shopProducts);
      } else {
        setError(err instanceof Error ? err.message : 'Daten konnten nicht geladen werden');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Silent revalidation — checks version, reloads in background if changed (no spinner)
  const revalidatingRef = useRef(false);
  const revalidate = useCallback(async () => {
    if (revalidatingRef.current) return;
    revalidatingRef.current = true;

    try {
      const cached = readCache();
      const serverVersion = await fetchDataVersion();
      if (!serverVersion) return;

      // Version matches cache — data is fresh
      if (cached && cached.version === serverVersion) return;

      // Version changed — silently reload everything
      const [freshCards, freshSets, freshShop] = await Promise.all([
        fetchAllCards(),
        fetchAllSets(),
        fetchShopProducts(),
      ]);

      setCards(freshCards);
      setSets(freshSets);
      setShopProducts(freshShop);

      writeCache({
        version: serverVersion,
        timestamp: Date.now(),
        cards: freshCards,
        sets: freshSets,
        shopProducts: freshShop,
      });
    } catch {
      // Silent — don't show errors for background revalidation
    } finally {
      revalidatingRef.current = false;
    }
  }, []);

  const refresh = useCallback(async () => {
    // Force re-fetch by clearing cache first
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // ignore
    }
    await loadData();
  }, [loadData]);

  return (
    <AppDataContext.Provider value={{ cards, sets, shopProducts, loading, error, refresh, revalidate }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  return useContext(AppDataContext);
}
