/**
 * Adapters for converting Card types to CardDetailData.
 * Replaces 5 inline object-literal conversions across the app.
 */

import type { Card } from '../types/card';
import type { CardDetailData } from '../components/common/CardDetailPopup';

/**
 * Converts a Card (from AppDataContext / collection) to CardDetailData
 * for use with CardDetailPopup. Accepts localized name/desc/type strings.
 */
export function cardToDetailData(
  card: Card,
  localized: { name: string; type: string },
): CardDetailData {
  return {
    id: card.id,
    nameDe: card.name ?? '',
    nameEn: card.name_en ?? '',
    descDe: card.desc ?? '',
    descEn: card.desc_en ?? '',
    type: localized.type,
    frameType: card.frameType,
    atk: card.atk,
    def: card.def,
    level: card.level,
    attribute: card.attribute,
    sets: card.sets,
    banStatus: card.banStatus,
    rarity: card.rarity,
  };
}

/** Admin card row shape (from admin API responses). */
interface AdminCardLike {
  id: number;
  name_de: string;
  name_en: string;
  desc_de?: string;
  desc_en?: string;
  frame_type: string;
  atk?: number | null;
  def?: number | null;
  level?: number | null;
  attribute?: string | null;
  race_de?: string | null;
  race_en?: string | null;
  archetype?: string | null;
  ban_status?: string | null;
  rarity?: string | null;
}

/** Converts an admin card row to CardDetailData. */
export function adminCardToDetailData(
  card: AdminCardLike,
  overrides?: Partial<CardDetailData>,
): CardDetailData {
  return {
    id: card.id,
    nameDe: card.name_de,
    nameEn: card.name_en,
    descDe: card.desc_de ?? '',
    descEn: card.desc_en ?? '',
    frameType: card.frame_type,
    atk: card.atk,
    def: card.def,
    level: card.level,
    attribute: card.attribute,
    race: card.race_de ?? card.race_en,
    archetype: card.archetype,
    rarity: card.rarity,
    banStatus: card.ban_status,
    ...overrides,
  };
}
