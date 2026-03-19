/**
 * InventoryContext — thin wrapper around SessionContext for backwards compatibility.
 * Converts the SessionContext inventory Map to OwnedCard[] for existing consumers.
 */

import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';
import type { OwnedCard } from '../types/card';
import { useSession } from './SessionContext';
import { useAppData } from './AppDataContext';

interface InventoryContextValue {
  collection: OwnedCard[];
  loading: boolean;
  error: string | null;
  refresh: (excludeDeckId?: number) => Promise<void>;
  setPreferredArtwork: (cardId: number, artworkId: number) => void;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { inventory, inventoryLoading, refreshInventory, setPreferredArtwork } = useSession();
  const { cards } = useAppData();

  // Build OwnedCard[] by combining inventory Map with card data from AppDataContext
  const collection = useMemo(() => {
    const result: OwnedCard[] = [];
    for (const [cardId, entry] of inventory) {
      const card = cards.find((c) => c.id === cardId);
      if (card) {
        result.push({
          ...card,
          owned: entry.quantity,
          used_in_decks: entry.usedInDecks,
          unlockedArtworks: entry.unlockedArtworks,
          preferredArtworkId: entry.preferredArtworkId,
        });
      }
    }
    return result.sort((a, b) => (a.name_en ?? a.name).localeCompare(b.name_en ?? b.name));
  }, [inventory, cards]);

  const refresh = useCallback(async (excludeDeckId?: number) => {
    await refreshInventory(excludeDeckId);
  }, [refreshInventory]);

  return (
    <InventoryContext.Provider value={{ collection, loading: inventoryLoading, error: null, refresh, setPreferredArtwork }}>
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
