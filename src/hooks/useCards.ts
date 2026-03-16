/**
 * Custom React hook for loading and filtering cards.
 * Keeps the component code clean by extracting data logic.
 */

import { useState, useEffect, useMemo } from 'react';
import type { Card } from '../types/card';
import { fetchAllCards } from '../services/cardApi';

interface UseCardsResult {
  cards: Card[];
  loading: boolean;
  error: string | null;
}

export function useCards(): UseCardsResult {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCards() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchAllCards();

        if (!cancelled) {
          setCards(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load cards');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCards();

    return () => {
      cancelled = true;
    };
  }, []);

  return { cards, loading, error };
}

interface UseCardSearchResult {
  filteredCards: Card[];
}

export function useCardSearch(cards: Card[], query: string, typeFilter: string): UseCardSearchResult {
  const filteredCards = useMemo(() => {
    let result = cards;

    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(
        (card) =>
          card.name.toLowerCase().includes(lowerQuery) ||
          card.desc.toLowerCase().includes(lowerQuery) ||
          (card.name_en?.toLowerCase().includes(lowerQuery) ?? false) ||
          (card.desc_en?.toLowerCase().includes(lowerQuery) ?? false)
      );
    }

    if (typeFilter && typeFilter !== 'all') {
      result = result.filter((card) => card.frameType === typeFilter);
    }

    return result;
  }, [cards, query, typeFilter]);

  return { filteredCards };
}
