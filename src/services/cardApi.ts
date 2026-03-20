/**
 * Card API service — pure data fetchers for cards and sets.
 * Caching is handled by AppDataContext, not here.
 */

import { env } from '../config/env';
import type { Card } from '../types/card';

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
  artwork_ids?: number[];
  sets?: { name: string; code: string; active?: boolean; artworkId?: number | null }[];
  ban_status?: string | null;
}

export function dbCardToCard(db: DbCard): Card {
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
    artworkIds: db.artwork_ids ?? [],
    sets: db.sets ?? [],
    banStatus: db.ban_status ?? null,
    card_images: [{
      id: db.id,
      image_url: `/images/cards/${db.id}.jpg`,
      image_url_small: `/images/cards/${db.id}.jpg`,
      image_url_cropped: `/images/cards/${db.id}.jpg`,
    }],
  };
}

/**
 * Fetches all cards from the browse endpoint (no caching).
 */
export async function fetchAllCards(): Promise<Card[]> {
  const response = await fetch(`${env.api.baseUrl}/cards/browse`);

  if (!response.ok) {
    throw new Error('Kartendaten konnten nicht geladen werden.');
  }

  const dbCards: DbCard[] = await response.json();
  return dbCards.map(dbCardToCard);
}

export interface CachedSet {
  name: string;
  code: string;
  type: string;
  wave: number;
  active: boolean;
  image_path: string | null;
  card_count: number;
}

/**
 * Fetches all sets with card counts.
 */
export async function fetchAllSets(): Promise<CachedSet[]> {
  const response = await fetch(`${env.api.baseUrl}/cards/sets/all`);

  if (!response.ok) {
    throw new Error('Sets konnten nicht geladen werden.');
  }

  return response.json();
}

/**
 * Returns the local image URL for a card.
 * When artworkId is provided, returns the URL for that specific artwork instead of the default.
 */
export function getCardImageUrl(cardId: number, _size: 'full' | 'small' | 'cropped' = 'small', artworkId?: number): string {
  const id = artworkId ?? cardId;
  return `/images/cards/${id}.jpg`;
}
