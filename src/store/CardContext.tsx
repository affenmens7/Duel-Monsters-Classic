/**
 * CardContext — loads all cards ONCE at app start.
 * Cards are cached in localStorage and available everywhere via useCards().
 */

import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Card } from '../types/card';
import { fetchAllCards, refreshCards } from '../services/cardApi';

interface CardContextValue {
  cards: Card[];
  loading: boolean;
  error: string | null;
  /** Clear cache and re-fetch cards from the backend. */
  refresh: () => Promise<void>;
}

const CardContext = createContext<CardContextValue>({
  cards: [],
  loading: true,
  error: null,
  refresh: async () => {},
});

export function CardProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllCards()
      .then(setCards)
      .catch((err) => setError(err instanceof Error ? err.message : 'Fehler beim Laden'))
      .finally(() => setLoading(false));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fresh = await refreshCards();
      setCards(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <CardContext.Provider value={{ cards, loading, error, refresh }}>
      {children}
    </CardContext.Provider>
  );
}

export function useCards(): CardContextValue {
  return useContext(CardContext);
}
