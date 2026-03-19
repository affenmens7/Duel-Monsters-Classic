/**
 * Card search/filter hook.
 * Supports: text search, type filter, availability filter.
 * Available cards always sorted first.
 */

import { useMemo } from 'react';
import type { Card } from '../types/card';

interface UseCardSearchResult {
  filteredCards: Card[];
}

interface CardFilters {
  query: string;
  typeFilter: string;
  attributeFilter?: string;
  availabilityFilter: string;
  setFilter?: string;
  banFilter?: string;
}

export function useCardSearch(cards: Card[], filters: CardFilters): UseCardSearchResult {
  const filteredCards = useMemo(() => {
    let result = cards;

    // Text search
    if (filters.query.trim().length >= 2) {
      const lowerQuery = filters.query.toLowerCase();
      result = result.filter(
        (card) =>
          card.name.toLowerCase().includes(lowerQuery) ||
          card.desc.toLowerCase().includes(lowerQuery) ||
          (card.name_en?.toLowerCase().includes(lowerQuery) ?? false) ||
          (card.desc_en?.toLowerCase().includes(lowerQuery) ?? false)
      );
    }

    // Type filter
    if (filters.typeFilter && filters.typeFilter !== 'all') {
      result = result.filter((card) => card.frameType === filters.typeFilter);
    }

    // Attribute / race filter (format: "attr:DARK" or "race:Quick-Play")
    if (filters.attributeFilter && filters.attributeFilter !== 'all') {
      const [kind, value] = filters.attributeFilter.split(':');
      if (kind === 'attr') {
        result = result.filter((card) => card.attribute === value);
      } else if (kind === 'race') {
        result = result.filter((card) => card.race === value || card.race_en === value);
      }
    }

    // Set filter
    if (filters.setFilter && filters.setFilter !== 'all') {
      result = result.filter((card) =>
        card.sets?.some((s) => s.name === filters.setFilter)
      );
    }

    // Ban status filter
    if (filters.banFilter && filters.banFilter !== 'all') {
      if (filters.banFilter === 'Unlimited') {
        result = result.filter((card) => !card.banStatus);
      } else {
        result = result.filter((card) => card.banStatus === filters.banFilter);
      }
    }

    // Availability filter
    if (filters.availabilityFilter === 'available') {
      result = result.filter((card) => card.available);
    } else if (filters.availabilityFilter === 'locked') {
      result = result.filter((card) => !card.available);
    }

    // Sort: available first, then by name
    result = [...result].sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [cards, filters.query, filters.typeFilter, filters.attributeFilter, filters.availabilityFilter, filters.setFilter, filters.banFilter]);

  return { filteredCards };
}
