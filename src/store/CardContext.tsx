/**
 * CardContext — loads all cards ONCE at app start.
 * Cards are cached in localStorage and available everywhere via useCards().
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Card } from '../types/card';
import { fetchAllCards } from '../services/cardApi';

interface CardContextValue {
  cards: Card[];
  loading: boolean;
  error: string | null;
}

const CardContext = createContext<CardContextValue>({
  cards: [],
  loading: true,
  error: null,
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

  return (
    <CardContext.Provider value={{ cards, loading, error }}>
      {children}
    </CardContext.Provider>
  );
}

export function useCards(): CardContextValue {
  return useContext(CardContext);
}
