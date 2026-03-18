/**
 * CardContext — thin wrapper around AppDataContext for backwards compatibility.
 * All existing consumers of useCards() continue to work unchanged.
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { Card } from '../types/card';
import { useAppData } from './AppDataContext';

interface CardContextValue {
  cards: Card[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const CardContext = createContext<CardContextValue>({
  cards: [],
  loading: true,
  error: null,
  refresh: async () => {},
});

export function CardProvider({ children }: { children: ReactNode }) {
  const { cards, loading, error, refresh } = useAppData();

  return (
    <CardContext.Provider value={{ cards, loading, error, refresh }}>
      {children}
    </CardContext.Provider>
  );
}

export function useCards(): CardContextValue {
  return useContext(CardContext);
}
