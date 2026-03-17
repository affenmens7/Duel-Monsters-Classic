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
  priceDisplay: number | null;
  packSize: number;
  displaySize: number | null;
  descDe: string;
  descEn: string;
  featured: boolean;
  imagePath: string | null;
  cardCount: number;
}

export interface ShopCosmetic {
  itemType: string;
  itemId: string;
  nameDe: string;
  nameEn: string;
  descDe: string;
  descEn: string;
  price: number;
  previewData: string | null;
  available: boolean;
}

export interface ShopData {
  boosters: ShopSetProduct[];
  starters: ShopSetProduct[];
  cosmetics: ShopCosmetic[];
}

export interface RarityRate {
  rarity: string;
  ratePct: string;
}

export interface SetCardEntry {
  cardId: number;
  rarity: string;
  rarityCode: string;
  owned: number;
}

export interface SetDetail {
  set: ShopSetProduct;
  rarityRates: RarityRate[];
  cards: SetCardEntry[];
}

export interface BuyResult {
  success: boolean;
  type: string;
  cards?: number[];
  productId?: string;
  itemId?: string;
  dpRemaining: number;
}

// ============================================================
// API Functions
// ============================================================

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
    throw new Error('Set-Details konnten nicht geladen werden');
  }

  return response.json();
}

/**
 * Buys a single booster pack from a set.
 */
export async function buyPack(setName: string, token: string): Promise<BuyResult> {
  const response = await fetch(`${env.api.baseUrl}/shop/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId: setName, productType: 'booster' }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? 'Kauf fehlgeschlagen');
  }

  return data;
}

/**
 * Buys a full display (24 packs) from a set.
 */
export async function buyDisplay(setName: string, token: string): Promise<BuyResult> {
  const response = await fetch(`${env.api.baseUrl}/shop/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId: setName, productType: 'display' }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? 'Kauf fehlgeschlagen');
  }

  return data;
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

/**
 * Buys a cosmetic item (theme, sleeve, playmat).
 */
export async function buyCosmetic(itemId: string, token: string): Promise<BuyResult> {
  const response = await fetch(`${env.api.baseUrl}/shop/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId: itemId, productType: 'cosmetic' }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? 'Kauf fehlgeschlagen');
  }

  return data;
}
