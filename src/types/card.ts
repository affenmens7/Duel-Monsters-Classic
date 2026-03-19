/**
 * TypeScript type definitions for YuGiOh cards.
 * These match the data structure from the YGOPRODeck API.
 */

export type CardType =
  | 'Normal Monster'
  | 'Effect Monster'
  | 'Ritual Monster'
  | 'Ritual Effect Monster'
  | 'Fusion Monster'
  | 'Spell Card'
  | 'Trap Card';

export type SpellType =
  | 'Normal'
  | 'Continuous'
  | 'Equip'
  | 'Field'
  | 'Quick-Play'
  | 'Ritual';

export type TrapType =
  | 'Normal'
  | 'Continuous'
  | 'Counter';

export type MonsterAttribute =
  | 'DARK'
  | 'LIGHT'
  | 'EARTH'
  | 'WATER'
  | 'FIRE'
  | 'WIND'
  | 'DIVINE';

export type MonsterRace =
  | 'Aqua'
  | 'Beast'
  | 'Beast-Warrior'
  | 'Dinosaur'
  | 'Dragon'
  | 'Fairy'
  | 'Fiend'
  | 'Fish'
  | 'Insect'
  | 'Machine'
  | 'Plant'
  | 'Pyro'
  | 'Reptile'
  | 'Rock'
  | 'Sea Serpent'
  | 'Spellcaster'
  | 'Thunder'
  | 'Warrior'
  | 'Winged Beast'
  | 'Zombie'
  | 'Divine-Beast';

export interface CardImage {
  id: number;
  image_url: string;
  image_url_small: string;
  image_url_cropped: string;
}

export interface CardSet {
  set_name: string;
  set_code: string;
  set_rarity: string;
  set_rarity_code: string;
  set_price: string;
}

export interface CardSetBadge {
  name: string;
  code: string;
  active?: boolean;
  artworkId?: number | null;
}

export interface Card {
  id: number;
  name: string;
  name_en?: string;
  type: CardType;
  type_en?: CardType;
  humanReadableCardType?: string;
  frameType: string;
  desc: string;
  desc_en?: string;
  atk?: number;
  def?: number;
  level?: number;
  race: string;
  race_en?: string;
  attribute?: MonsterAttribute;
  archetype?: string;
  card_sets?: CardSet[];
  card_images: CardImage[];
  available?: boolean;
  artworkIds?: number[];
  sets?: CardSetBadge[];
  banStatus?: string | null;
}

export interface OwnedCard extends Card {
  owned: number;
  used_in_decks: number;
  unlockedArtworks: number[];
  preferredArtworkId: number | null;
}

export interface CardApiResponse {
  data: Card[];
}
