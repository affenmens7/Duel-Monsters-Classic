/**
 * Inventory API service — fetches the user's card collection with ownership details.
 */

import { env } from '../config/env';
import type { OwnedCard, Card } from '../types/card';

interface DbOwnedCard {
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
  owned: number;
  used_in_decks: number;
  unlocked_artworks: number[];
  preferred_artwork_id: number | null;
}

function dbToOwnedCard(db: DbOwnedCard): OwnedCard {
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
    card_images: [{
      id: db.id,
      image_url: `/images/cards/${db.id}.jpg`,
      image_url_small: `/images/cards/${db.id}.jpg`,
      image_url_cropped: `/images/cards/${db.id}.jpg`,
    }],
    rarity: db.rarity ?? undefined,
    rarityCode: db.rarity_code ?? undefined,
    owned: db.owned,
    used_in_decks: db.used_in_decks,
    unlockedArtworks: db.unlocked_artworks ?? [],
    artwork_variants: db.artwork_variants ?? [],
    preferredArtworkId: db.preferred_artwork_id ?? null,
    preferred_effect: db.preferred_effect ?? null,
  };
}

/**
 * Fetch full card details for the user's collection, with ownership quantities.
 */
export async function fetchCollectionDetails(
  token: string,
  excludeDeckId?: number,
): Promise<OwnedCard[]> {
  const params = excludeDeckId != null
    ? `?excludeDeck=${excludeDeckId}`
    : '';

  const response = await fetch(`${env.api.baseUrl}/user/collection/details${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Sammlung konnte nicht geladen werden');
  }

  const dbCards: DbOwnedCard[] = await response.json();
  return dbCards.map(dbToOwnedCard);
}
