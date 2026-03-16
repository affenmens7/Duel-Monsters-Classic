/**
 * Shop product definitions.
 * Each product has a type, price, and what it contains.
 */

export type ProductType = 'starter-deck' | 'booster' | 'display' | 'cosmetic';

export interface ShopProduct {
  id: string;
  nameKey: string;
  descKey: string;
  type: ProductType;
  price: number;
  setName?: string;
  cardCount?: number;
  available: boolean;
}

export const SHOP_PRODUCTS: ShopProduct[] = [
  // === Starter Decks ===
  {
    id: 'starter-yugi',
    nameKey: 'shop.starterYugi',
    descKey: 'shop.starterYugiDesc',
    type: 'starter-deck',
    price: 600,
    setName: 'Starter Deck: Yugi',
    cardCount: 40,
    available: true,
  },
  {
    id: 'starter-kaiba',
    nameKey: 'shop.starterKaiba',
    descKey: 'shop.starterKaibaDesc',
    type: 'starter-deck',
    price: 600,
    setName: 'Starter Deck: Kaiba',
    cardCount: 40,
    available: true,
  },
  {
    id: 'starter-joey',
    nameKey: 'shop.starterJoey',
    descKey: 'shop.starterJoeyDesc',
    type: 'starter-deck',
    price: 600,
    setName: 'Starter Deck: Joey',
    cardCount: 40,
    available: false,
  },

  // === Booster Packs ===
  {
    id: 'booster-lob',
    nameKey: 'shop.boosterLOB',
    descKey: 'shop.boosterLOBDesc',
    type: 'booster',
    price: 120,
    setName: 'Legend of Blue Eyes White Dragon',
    cardCount: 5,
    available: true,
  },
  {
    id: 'booster-mrd',
    nameKey: 'shop.boosterMRD',
    descKey: 'shop.boosterMRDDesc',
    type: 'booster',
    price: 120,
    setName: 'Metal Raiders',
    cardCount: 5,
    available: true,
  },
  {
    id: 'booster-srl',
    nameKey: 'shop.boosterSRL',
    descKey: 'shop.boosterSRLDesc',
    type: 'booster',
    price: 130,
    setName: 'Spell Ruler',
    cardCount: 5,
    available: false,
  },
  {
    id: 'booster-psv',
    nameKey: 'shop.boosterPSV',
    descKey: 'shop.boosterPSVDesc',
    type: 'booster',
    price: 130,
    setName: 'Pharaoh\'s Servant',
    cardCount: 5,
    available: false,
  },

  // === Displays (24 Booster) ===
  {
    id: 'display-lob',
    nameKey: 'shop.displayLOB',
    descKey: 'shop.displayLOBDesc',
    type: 'display',
    price: 2400,
    setName: 'Legend of Blue Eyes White Dragon',
    cardCount: 120,
    available: true,
  },
  {
    id: 'display-mrd',
    nameKey: 'shop.displayMRD',
    descKey: 'shop.displayMRDDesc',
    type: 'display',
    price: 2400,
    setName: 'Metal Raiders',
    cardCount: 120,
    available: true,
  },

  // === Cosmetics ===
  {
    id: 'theme-shadow-realm',
    nameKey: 'themes.shadowRealm',
    descKey: 'shop.themeShadowRealmDesc',
    type: 'cosmetic',
    price: 500,
    available: true,
  },
  {
    id: 'theme-master-duel',
    nameKey: 'themes.masterDuel',
    descKey: 'shop.themeMasterDuelDesc',
    type: 'cosmetic',
    price: 750,
    available: true,
  },
  {
    id: 'theme-egyptian-gold',
    nameKey: 'themes.egyptianGold',
    descKey: 'shop.themeEgyptianGoldDesc',
    type: 'cosmetic',
    price: 500,
    available: true,
  },
  {
    id: 'theme-duel-links',
    nameKey: 'themes.duelLinks',
    descKey: 'shop.themeDuelLinksDesc',
    type: 'cosmetic',
    price: 750,
    available: true,
  },
];

export function getProductsByType(type: ProductType): ShopProduct[] {
  return SHOP_PRODUCTS.filter((p) => p.type === type);
}

export function getProductById(id: string): ShopProduct | undefined {
  return SHOP_PRODUCTS.find((p) => p.id === id);
}
