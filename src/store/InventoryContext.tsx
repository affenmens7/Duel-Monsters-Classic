/**
 * InventoryContext — provides the user's card collection.
 * Does NOT auto-fetch on mount — consumers call refresh() with the correct excludeDeckId.
 */

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { OwnedCard } from '../types/card';
import { fetchCollectionDetails } from '../services/inventoryApi';
import { useAuth } from './AuthContext';

interface InventoryContextValue {
  collection: OwnedCard[];
  loading: boolean;
  error: string | null;
  refresh: (excludeDeckId?: number) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [collection, setCollection] = useState<OwnedCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (excludeDeckId?: number) => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchCollectionDetails(token, excludeDeckId);
      setCollection(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Sammlung');
    } finally {
      setLoading(false);
    }
  }, [token]);

  return (
    <InventoryContext.Provider value={{ collection, loading, error, refresh }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory(): InventoryContextValue {
  const ctx = useContext(InventoryContext);
  if (!ctx) {
    throw new Error('useInventory must be used within InventoryProvider');
  }
  return ctx;
}
