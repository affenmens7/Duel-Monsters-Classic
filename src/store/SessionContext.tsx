/**
 * SessionContext — Tier 2 cache for user-specific session data.
 * Loads inventory, DP, and deck list on login. Clears on logout.
 * Provides optimistic update helpers for purchases and deck edits.
 *
 * NEVER stored in localStorage (security: inventory/DP must come from server).
 */

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { fetchCollectionDetails } from '../services/inventoryApi';
import { fetchDecks, type DeckSummary } from '../services/deckApi';

export interface InventoryArtworkVariant {
  artworkId: number;
  isGhost: boolean;
  isMisprint: boolean;
  misprintData?: Record<string, unknown> | null;
}

export interface InventoryEntry {
  quantity: number;
  usedInDecks: number;
  unlockedArtworks: number[];
  artworkVariants: InventoryArtworkVariant[];
  preferredArtworkId: number | null;
  preferredEffect: string | null;
}

interface SessionContextValue {
  // Inventory
  inventory: Map<number, InventoryEntry>;
  inventoryLoading: boolean;
  refreshInventory: (excludeDeckId?: number) => Promise<void>;

  // Deck list
  deckList: DeckSummary[];
  deckListLoading: boolean;
  refreshDeckList: () => Promise<void>;

  // DP (session-managed, reconciled from server responses)
  dp: number;
  updateDp: (newDp: number) => void;

  // Optimistic mutation helpers
  addCardsToInventory: (cardIds: number[]) => void;
  removeCardFromInventory: (cardId: number, count: number) => void;
  incrementDeckUsage: (cardId: number, delta: number) => void;
  setPreferredArtwork: (cardId: number, artworkId: number) => void;
  setPreferredEffect: (cardId: number, effect: string | null) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [inventory, setInventory] = useState<Map<number, InventoryEntry>>(new Map());
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [deckList, setDeckList] = useState<DeckSummary[]>([]);
  const [deckListLoading, setDeckListLoading] = useState(false);
  const [dp, setDp] = useState(0);

  // Track whether initial load has happened for this login session
  const loadedForUser = useRef<number | null>(null);

  // Sync DP from auth user on login
  useEffect(() => {
    if (user) {
      setDp(user.dp);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load inventory and deck list on login
  useEffect(() => {
    if (!user || !token) {
      // Logged out — clear session data
      setInventory(new Map());
      setDeckList([]);
      setDp(0);
      loadedForUser.current = null;
      return;
    }

    // Only auto-load once per user session
    if (loadedForUser.current === user.id) return;
    loadedForUser.current = user.id;

    // Load inventory
    setInventoryLoading(true);
    fetchCollectionDetails(token)
      .then((owned) => {
        const map = new Map<number, InventoryEntry>();
        for (const card of owned) {
          map.set(card.id, { quantity: card.owned, usedInDecks: card.used_in_decks, unlockedArtworks: card.unlockedArtworks ?? [], artworkVariants: card.artwork_variants ?? [], preferredArtworkId: card.preferredArtworkId ?? null, preferredEffect: card.preferred_effect ?? null });
        }
        setInventory(map);
      })
      .catch(() => {})
      .finally(() => setInventoryLoading(false));

    // Load deck list
    setDeckListLoading(true);
    fetchDecks()
      .then(setDeckList)
      .catch(() => {})
      .finally(() => setDeckListLoading(false));
  }, [user, token]);

  const refreshInventory = useCallback(async (excludeDeckId?: number) => {
    if (!token) return;
    setInventoryLoading(true);
    try {
      const owned = await fetchCollectionDetails(token, excludeDeckId);
      const map = new Map<number, InventoryEntry>();
      for (const card of owned) {
        map.set(card.id, { quantity: card.owned, usedInDecks: card.used_in_decks, unlockedArtworks: card.unlockedArtworks ?? [], artworkVariants: card.artwork_variants ?? [], preferredArtworkId: card.preferredArtworkId ?? null, preferredEffect: card.preferred_effect ?? null });
      }
      setInventory(map);
    } catch {
      // keep existing inventory on error
    } finally {
      setInventoryLoading(false);
    }
  }, [token]);

  const refreshDeckList = useCallback(async () => {
    if (!token) return;
    setDeckListLoading(true);
    try {
      const decks = await fetchDecks();
      setDeckList(decks);
    } catch {
      // keep existing list on error
    } finally {
      setDeckListLoading(false);
    }
  }, [token]);

  const updateDp = useCallback((newDp: number) => {
    setDp(newDp);
  }, []);

  const addCardsToInventory = useCallback((cardIds: number[]) => {
    setInventory((prev) => {
      const next = new Map(prev);
      for (const cardId of cardIds) {
        const entry = next.get(cardId);
        if (entry) {
          next.set(cardId, { ...entry, quantity: entry.quantity + 1 });
        } else {
          next.set(cardId, { quantity: 1, usedInDecks: 0, unlockedArtworks: [], artworkVariants: [], preferredArtworkId: null, preferredEffect: null });
        }
      }
      return next;
    });
  }, []);

  const removeCardFromInventory = useCallback((cardId: number, count: number) => {
    setInventory((prev) => {
      const next = new Map(prev);
      const entry = next.get(cardId);
      if (entry) {
        const newQty = Math.max(0, entry.quantity - count);
        if (newQty === 0) {
          next.delete(cardId);
        } else {
          next.set(cardId, { ...entry, quantity: newQty });
        }
      }
      return next;
    });
  }, []);

  const incrementDeckUsage = useCallback((cardId: number, delta: number) => {
    setInventory((prev) => {
      const next = new Map(prev);
      const entry = next.get(cardId);
      if (entry) {
        next.set(cardId, {
          ...entry,
          usedInDecks: Math.max(0, entry.usedInDecks + delta),
        });
      }
      return next;
    });
  }, []);

  const setPreferredArtwork = useCallback((cardId: number, artworkId: number) => {
    setInventory((prev) => {
      const next = new Map(prev);
      const entry = next.get(cardId);
      if (entry) {
        next.set(cardId, { ...entry, preferredArtworkId: artworkId });
      }
      return next;
    });
  }, []);

  const setPreferredEffect = useCallback((cardId: number, effect: string | null) => {
    setInventory((prev) => {
      const next = new Map(prev);
      const entry = next.get(cardId);
      if (entry) {
        next.set(cardId, { ...entry, preferredEffect: effect });
      }
      return next;
    });
  }, []);

  return (
    <SessionContext.Provider
      value={{
        inventory,
        inventoryLoading,
        refreshInventory,
        deckList,
        deckListLoading,
        refreshDeckList,
        dp,
        updateDp,
        addCardsToInventory,
        removeCardFromInventory,
        incrementDeckUsage,
        setPreferredArtwork,
        setPreferredEffect,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return ctx;
}
