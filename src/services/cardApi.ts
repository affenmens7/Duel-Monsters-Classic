/**
 * Card API service — fetches card data from our own backend.
 * Cards are cached in localStorage to avoid reloading on every page visit.
 */

import { env } from '../config/env';
import type { Card } from '../types/card';

const CACHE_KEY = 'dmc-cards-v3';
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours (invalidated on card count change)

interface DbCard {
  id: number;
  name_de: string;
  name_en: string;
  desc_de: string;
  desc_en: string;
  type_de: string;
  type_en: string;
  frame_type: string;
  atk: number | null;
  def: number | null;
  level: number | null;
  race_de: string;
  race_en: string;
  attribute: string | null;
  archetype: string | null;
  image_path: string;
  available?: boolean;
}

interface CacheEntry {
  timestamp: number;
  count: number;
  cards: Card[];
}

function dbCardToCard(db: DbCard): Card {
  return {
    id: db.id,
    name: db.name_de ?? db.name_en,
    name_en: db.name_en,
    type: db.type_de as Card['type'],
    type_en: db.type_en as Card['type'],
    frameType: db.frame_type,
    desc: db.desc_de ?? db.desc_en,
    desc_en: db.desc_en,
    atk: db.atk ?? undefined,
    def: db.def ?? undefined,
    level: db.level ?? undefined,
    race: db.race_de ?? db.race_en,
    race_en: db.race_en,
    attribute: db.attribute as Card['attribute'],
    archetype: db.archetype ?? undefined,
    available: db.available ?? true,
    card_images: [{
      id: db.id,
      image_url: `/images/cards/${db.id}.jpg`,
      image_url_small: `/images/cards/${db.id}.jpg`,
      image_url_cropped: `/images/cards/${db.id}.jpg`,
    }],
  };
}

function getCache(): Card[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const entry: CacheEntry = JSON.parse(raw);
    const age = Date.now() - entry.timestamp;

    if (age > CACHE_MAX_AGE) return null;

    return entry.cards;
  } catch {
    return null;
  }
}

function setCache(cards: Card[]) {
  try {
    const entry: CacheEntry = { timestamp: Date.now(), count: cards.length, cards };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

/**
 * Fetches all cards — from cache if fresh and count matches, otherwise from backend.
 * Does a quick count check to detect new cards without loading everything.
 */
export async function fetchAllCards(): Promise<Card[]> {
  const cached = getCache();

  if (cached) {
    // Quick count check — if card count changed, invalidate cache
    try {
      const countRes = await fetch(`${env.api.baseUrl}/cards/count`);
      if (countRes.ok) {
        const { count } = await countRes.json();
        if (count !== cached.length) {
          localStorage.removeItem(CACHE_KEY);
        } else {
          return cached;
        }
      } else {
        return cached; // API error, use cache
      }
    } catch {
      return cached; // Network error, use cache
    }
  }

  const response = await fetch(`${env.api.baseUrl}/cards/browse`);

  if (!response.ok) {
    throw new Error('Kartendaten konnten nicht geladen werden.');
  }

  const dbCards: DbCard[] = await response.json();
  const cards = dbCards.map(dbCardToCard);

  setCache(cards);
  return cards;
}

/**
 * Forces a fresh reload from the backend (ignores cache).
 */
export async function refreshCards(): Promise<Card[]> {
  localStorage.removeItem(CACHE_KEY);
  return fetchAllCards();
}

/**
 * Returns the local image URL for a card.
 * When artworkId is provided, returns the URL for that specific artwork instead of the default.
 */
export function getCardImageUrl(cardId: number, _size: 'full' | 'small' | 'cropped' = 'small', artworkId?: number): string {
  const id = artworkId ?? cardId;
  return `/images/cards/${id}.jpg`;
}
