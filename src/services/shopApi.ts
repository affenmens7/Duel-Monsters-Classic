/**
 * Shop API service — storefront data, set details, purchases.
 * All endpoints read from the database-driven shop configuration.
 */

import { env } from '../config/env';

// ============================================================
// Types
// ============================================================

export interface ShopSetProduct {
  setName: string;
  code: string;
  wave: number;
  active: boolean;
  productType?: string;
  pricePack: number;
  packSize: number;
  descDe: string;
  descEn: string;
  featured: boolean;
  cardCount: number;
  showcaseCardIds: number[];
  showcaseAnimated: boolean;
  igReleaseDate?: string | null;
  isEvent?: boolean;
}

export interface ShopDisplayProduct {
  id: number;
  name: string;
  price: number;
  descDe: string;
  descEn: string;
  showcaseCardIds: number[];
  showcaseAnimated: boolean;
  igReleaseDate: string | null;
  isEvent?: boolean;
  active: boolean;
  wave: number;
  sortOrder: number;
  totalPacks: number;
  cardCount: number;
  contents: { boosterSetName: string; packCount: number }[];
}

export interface ShopData {
  boosters: ShopSetProduct[];
  starters: ShopSetProduct[];
  displays: ShopDisplayProduct[];
}

export interface RarityRate {
  rarity: string;
  ratePct: string;
}

export interface SetCardEntry {
  cardId: number;
  rarity: string;
  rarityCode: string;
  artworkId: number | null;
  owned: number;
  setName?: string;
  isGhost?: boolean;
  isMisprint?: boolean;
}

export interface SetDetail {
  set: ShopSetProduct;
  rarityRates: RarityRate[];
  cards: SetCardEntry[];
}

export interface DisplayDetail {
  display: ShopDisplayProduct;
  rarityRates: RarityRate[];
  cards: SetCardEntry[];
}

export interface PulledCard {
  cardId: number;
  artworkId: number;
  rarity: string;
  isGhost: boolean;
  isMisprint: boolean;
  misprintData: Record<string, unknown> | null;
}

export interface BuyResult {
  success: boolean;
  type: string;
  cards?: number[];
  pulledCards?: PulledCard[];
  productId?: string;
  itemId?: string;
  dpRemaining: number;
}

export interface ShopFeaturedItem {
  id: number;
  product_type: string;
  product_id: string;
  title_de: string;
  title_en: string | null;
  subtitle_de: string | null;
  subtitle_en: string | null;
  image_path: string | null;
  sort_order: number;
  set_code: string | null;
}

// ============================================================
// API Functions
// ============================================================

/** Fetches active featured carousel items. Public endpoint. */
export async function fetchShopFeatured(): Promise<ShopFeaturedItem[]> {
  const response = await fetch(`${env.api.baseUrl}/shop/featured`);
  if (!response.ok) return [];
  return response.json();
}

/**
 * Fetches all shop products (boosters, starters, cosmetics).
 * Public endpoint — no auth required.
 */
export async function fetchShopProducts(): Promise<ShopData> {
  const response = await fetch(`${env.api.baseUrl}/shop/products`);

  if (!response.ok) {
    throw new Error('Shop-Daten konnten nicht geladen werden');
  }

  return response.json();
}

/**
 * Fetches detailed info for a single set — cards, rarity rates, ownership.
 * Requires authentication.
 */
export async function fetchSetDetail(setName: string, token: string): Promise<SetDetail> {
  const response = await fetch(
    `${env.api.baseUrl}/shop/products/${encodeURIComponent(setName)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error ?? 'Set-Details konnten nicht geladen werden');
  }

  return response.json();
}

/**
 * Buys a single booster pack from a set.
 */
export async function buyPack(setName: string, token: string, quantity: number = 1): Promise<BuyResult> {
  const response = await fetch(`${env.api.baseUrl}/shop/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId: setName, productType: 'booster', quantity }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? 'Kauf fehlgeschlagen');
  }

  return data;
}

/**
 * Buys a full display by its numeric ID.
 */
export async function buyDisplay(displayId: number, token: string): Promise<BuyResult> {
  const response = await fetch(`${env.api.baseUrl}/shop/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId: String(displayId), productType: 'display' }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? 'Kauf fehlgeschlagen');
  }

  return data;
}

/**
 * Fetches detailed info for a display — cards, rarity rates, ownership.
 * Requires authentication.
 */
export async function fetchDisplayDetail(displayId: number, token: string): Promise<DisplayDetail> {
  const response = await fetch(
    `${env.api.baseUrl}/shop/displays/${displayId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error ?? 'Display-Details konnten nicht geladen werden');
  }

  return response.json();
}

/**
 * Buys a starter deck.
 */
export async function buyStarter(setName: string, token: string): Promise<BuyResult> {
  const response = await fetch(`${env.api.baseUrl}/shop/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId: setName, productType: 'starter' }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? 'Kauf fehlgeschlagen');
  }

  return data;
}

