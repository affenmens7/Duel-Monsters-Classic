/**
 * Card API service — fetches card data from YGOPRODeck API.
 * All API calls go through this file (single responsibility).
 */

import { env } from '../config/env';
import type { Card, CardApiResponse } from '../types/card';
import { CARD_SETS } from '../config/sets';

/**
 * Allowed card types for DM/GX era (no Synchro, XYZ, Pendulum, Link).
 */
const ALLOWED_FRAME_TYPES = new Set([
  'normal',
  'effect',
  'ritual',
  'fusion',
  'spell',
  'trap',
]);

/**
 * All set names we care about (DM through early GX).
 */
const ALL_SET_NAMES = new Set(CARD_SETS.map((s) => s.name));

/**
 * Fetches all cards from the YGOPRODeck API in both languages.
 * German is the primary language, English names are kept as fallback.
 */
export async function fetchAllCards(): Promise<Card[]> {
  const [deResponse, enResponse] = await Promise.all([
    fetch(`${env.ygoproApi.baseUrl}/cardinfo.php?language=de`),
    fetch(`${env.ygoproApi.baseUrl}/cardinfo.php`),
  ]);

  if (!deResponse.ok || !enResponse.ok) {
    throw new Error('Kartendaten konnten nicht geladen werden.');
  }

  const deJson: CardApiResponse = await deResponse.json();
  const enJson: CardApiResponse = await enResponse.json();

  const enMap = new Map(enJson.data.map((c) => [c.id, c]));

  const merged = deJson.data.map((deCard) => {
    const enCard = enMap.get(deCard.id);
    return {
      ...deCard,
      name_en: enCard?.name ?? deCard.name,
      desc_en: enCard?.desc ?? deCard.desc,
      type_en: enCard?.type ?? deCard.type,
      race_en: enCard?.race ?? deCard.race,
      card_sets: enCard?.card_sets ?? deCard.card_sets,
    };
  });

  return filterDmGxCards(merged);
}

/**
 * Filters cards to only include DM/GX-era cards.
 * A card is included if:
 * 1. Its frameType is one we support (no synchro/xyz/pendulum/link)
 * 2. It appeared in at least one of our defined sets
 */
function filterDmGxCards(cards: Card[]): Card[] {
  return cards.filter((card) => {
    if (!ALLOWED_FRAME_TYPES.has(card.frameType)) {
      return false;
    }

    if (!card.card_sets || card.card_sets.length === 0) {
      return false;
    }

    return card.card_sets.some((set) => ALL_SET_NAMES.has(set.set_name));
  });
}

/**
 * Returns the image URL for a card.
 * Uses the small version for list views, full for detail views.
 */
export function getCardImageUrl(cardId: number, size: 'full' | 'small' | 'cropped' = 'small'): string {
  const base = env.ygoproApi.imageUrl;

  switch (size) {
    case 'small':
      return `${base}_small/${cardId}.jpg`;
    case 'cropped':
      return `${base}_cropped/${cardId}.jpg`;
    default:
      return `${base}/${cardId}.jpg`;
  }
}
