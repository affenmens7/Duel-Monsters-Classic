/**
 * Shared rarity classification — single source of truth.
 * Used by CardDetailPopup, ShopPage, AdminSetDetailPage, CardTable.
 */

export type RarityTier =
  | 'SecretRare'
  | 'UltraRare'
  | 'SuperRare'
  | 'Rare'
  | 'ShortPrint'
  | 'Common';

/** Maps a rarity string (e.g. "Ultra Rare") to a canonical tier. */
export function getRarityTier(rarity: string): RarityTier {
  const lower = rarity.toLowerCase();
  if (lower.includes('secret')) return 'SecretRare';
  if (lower.includes('ultra')) return 'UltraRare';
  if (lower.includes('super')) return 'SuperRare';
  if (lower.includes('rare')) return 'Rare';
  if (lower.includes('short')) return 'ShortPrint';
  return 'Common';
}

/** Sort order: rarest first. */
export const RARITY_ORDER: Record<string, number> = {
  'Secret Rare': 0,
  'Ultra Rare': 1,
  'Super Rare': 2,
  'Rare': 3,
  'Short Print': 4,
  'Common': 5,
};

/** Short code for compact display (e.g. "UR", "SR"). */
export const RARITY_SHORT: Record<string, string> = {
  Common: 'C',
  Rare: 'R',
  'Super Rare': 'SR',
  'Ultra Rare': 'UR',
  'Secret Rare': 'ScR',
};

/** Visual effect tier for a given rarity. */
export type EffectTier = 'none' | 'holo' | 'rainbow';

/** Maps rarity to its visual CSS effect tier. */
export function getEffectTier(rarity?: string): EffectTier {
  if (!rarity) return 'none';
  const tier = getRarityTier(rarity);
  if (tier === 'SuperRare' || tier === 'UltraRare') return 'holo';
  if (tier === 'SecretRare') return 'rainbow';
  return 'none';
}
