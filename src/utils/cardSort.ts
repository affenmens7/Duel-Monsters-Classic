/**
 * Shared card sorting utility.
 * Used by shop detail views, card browser, collection, admin pages.
 */

import { RARITY_ORDER } from './rarity';
import type { Card } from '../types/card';

/** Frame type order: Ritual → Fusion → Effect → Normal → Spell → Trap */
export const FRAME_TYPE_ORDER: Record<string, number> = {
  ritual: 0,
  fusion: 1,
  effect: 2,
  normal: 3,
  spell: 4,
  trap: 5,
};

export type CardSortKey = 'type' | 'name' | 'rarity' | 'atk' | 'level';

/** All available sort options (for SortDropdown). */
export const CARD_SORT_OPTIONS: { key: CardSortKey; labelKey: string }[] = [
  { key: 'type', labelKey: 'sort.type' },
  { key: 'name', labelKey: 'sort.nameAZ' },
  { key: 'rarity', labelKey: 'sort.rarity' },
  { key: 'atk', labelKey: 'sort.atk' },
  { key: 'level', labelKey: 'sort.level' },
];

/**
 * Compare two cards by the given sort key.
 * Works with full Card objects directly.
 */
export function compareCards(a: Card, b: Card, sortKey: CardSortKey): number {
  switch (sortKey) {
    case 'type': {
      const ta = FRAME_TYPE_ORDER[a.frameType] ?? 99;
      const tb = FRAME_TYPE_ORDER[b.frameType] ?? 99;
      if (ta !== tb) return ta - tb;
      return a.name.localeCompare(b.name);
    }
    case 'name':
      return a.name.localeCompare(b.name);
    case 'rarity':
      // Not meaningful for full Card objects without set context — fallback to type
      return compareCards(a, b, 'type');
    case 'atk': {
      // Monsters with ATK first (highest), then spells/traps
      const aAtk = a.atk ?? -1;
      const bAtk = b.atk ?? -1;
      if (aAtk !== bAtk) return bAtk - aAtk;
      return a.name.localeCompare(b.name);
    }
    case 'level': {
      const aLvl = a.level ?? -1;
      const bLvl = b.level ?? -1;
      if (aLvl !== bLvl) return bLvl - aLvl;
      return a.name.localeCompare(b.name);
    }
    default:
      return 0;
  }
}

/**
 * Sort SetCardEntry[] (shop cards) using full Card data for lookups.
 * Builds a cardId → Card map for efficient access.
 */
export function sortSetCards<T extends { cardId: number; rarity?: string }>(
  cards: T[],
  sortKey: CardSortKey,
  allCards: Card[],
): T[] {
  const cardMap = new Map<number, Card>();
  for (const c of allCards) {
    cardMap.set(c.id, c);
  }

  return [...cards].sort((a, b) => {
    const cardA = cardMap.get(a.cardId);
    const cardB = cardMap.get(b.cardId);
    if (!cardA || !cardB) return 0;

    if (sortKey === 'rarity') {
      const ra = RARITY_ORDER[a.rarity ?? ''] ?? 5;
      const rb = RARITY_ORDER[b.rarity ?? ''] ?? 5;
      if (ra !== rb) return ra - rb;
      return cardA.name.localeCompare(cardB.name);
    }

    return compareCards(cardA, cardB, sortKey);
  });
}
