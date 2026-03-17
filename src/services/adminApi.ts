/**
 * Admin API service — endpoints for admin dashboard, set management,
 * news, roadmap, users, and cosmetics.
 * All endpoints require Bearer token auth with admin role.
 */

import { env } from '../config/env';

// ============================================================
// Types
// ============================================================

export interface AdminStats {
  totalUsers: number;
  totalCards: number;
  activeSets: number;
  totalDp: number;
  recentUsers7d: number;
}

export interface AdminSet {
  setName: string;
  code: string;
  wave: number;
  active: boolean;
  cardCount: number;
  productType: string;
  pricePack: number;
  priceDisplay: number | null;
  packSize: number;
  displaySize: number | null;
  descDe: string;
  descEn: string;
  featured: boolean;
  imagePath: string | null;
}

export interface AdminSetRow {
  name: string;
  code: string;
  type: string;
  wave: number;
  active: boolean;
  release_date: string | null;
  image_path: string | null;
  product_type: string;
  price_pack: number;
  price_display: number | null;
  pack_size: number;
  display_size: number | null;
  desc_de: string;
  desc_en: string;
  featured: boolean;
  sort_order: number;
  card_count: number;
}

export interface RarityRate {
  rarity: string;
  ratePct: number;
}

export interface AdminNews {
  id: number;
  slug: string;
  dateLabel: string;
  titleDe: string;
  titleEn: string;
  summaryDe: string;
  summaryEn: string;
  contentDe: string;
  contentEn: string;
  imagePath: string | null;
  published: boolean;
}

export interface AdminRoadmap {
  id: number;
  slug: string;
  phaseLabel: string;
  titleDe: string;
  titleEn: string;
  descDe: string;
  descEn: string;
  status: string;
  sortOrder: number;
}

export interface AdminUser {
  id: number;
  username: string;
  tag: string;
  email: string;
  role: string;
  dp: number;
  emailVerified: boolean;
  createdAt: string;
  lastLogin: string | null;
}

export interface AdminCosmetic {
  id: number;
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

// ============================================================
// Helpers
// ============================================================

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? 'Admin request failed');
  }

  return data;
}

// ============================================================
// Dashboard
// ============================================================

/**
 * Fetches aggregate stats for the admin dashboard.
 */
export async function fetchAdminStats(token: string): Promise<AdminStats> {
  const response = await fetch(`${env.api.baseUrl}/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return handleResponse<AdminStats>(response);
}

// ============================================================
// Cards (Admin Card Database Browser)
// ============================================================

export interface AdminCardRow {
  id: number;
  name_de: string;
  name_en: string;
  desc_de: string;
  desc_en: string;
  frame_type: string;
  atk: number | null;
  def: number | null;
  level: number | null;
  attribute: string | null;
  race_de: string;
  race_en: string;
  archetype: string | null;
  image_path: string;
}

export interface AdminCardPage {
  cards: AdminCardRow[];
  total: number;
  page: number;
  limit: number;
}

export interface SetCardRow {
  id: number;
  name_de: string;
  name_en: string;
  desc_de: string;
  desc_en: string;
  frame_type: string;
  rarity: string;
  rarity_code: string;
  artwork_id: number | null;
  atk: number | null;
  def: number | null;
  level: number | null;
  attribute: string | null;
  race_de: string | null;
  race_en: string | null;
  archetype: string | null;
  image_path: string | null;
}

/**
 * Fetches paginated cards for the admin card database browser.
 */
export async function fetchAdminCards(
  token: string,
  params: {
    page?: number;
    limit?: number;
    search?: string;
    frameType?: string;
    attribute?: string;
    sortBy?: string;
    sortDir?: string;
  },
): Promise<AdminCardPage> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.frameType) query.set('frameType', params.frameType);
  if (params.attribute) query.set('attribute', params.attribute);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortDir) query.set('sortDir', params.sortDir);

  const response = await fetch(
    `${env.api.baseUrl}/admin/cards?${query.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return handleResponse<AdminCardPage>(response);
}

// ============================================================
// Sets
// ============================================================

/**
 * Fetches all card sets with admin-level detail (snake_case response).
 */
export async function fetchAdminSets(token: string): Promise<AdminSetRow[]> {
  const response = await fetch(`${env.api.baseUrl}/admin/sets`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return handleResponse<AdminSetRow[]>(response);
}

/**
 * Fetches a single card set by name (lightweight — does not load all sets).
 */
export async function fetchSetInfo(token: string, name: string): Promise<AdminSetRow> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(name)}/info`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return handleResponse<AdminSetRow>(response);
}

/**
 * Updates a card set by name.
 */
export async function updateSet(
  token: string,
  setName: string,
  data: Partial<AdminSet>,
): Promise<void> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(setName)}`,
    {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(data),
    },
  );

  await handleResponse<{ success: boolean }>(response);
}

/**
 * Fetches rarity rates for a specific set.
 */
export async function fetchSetRates(token: string, setName: string): Promise<RarityRate[]> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(setName)}/rates`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  return handleResponse<RarityRate[]>(response);
}

/**
 * Updates shop config fields for a specific set.
 */
export async function updateSetConfig(
  token: string,
  setName: string,
  data: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(setName)}/config`,
    {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(data),
    },
  );

  await handleResponse<Record<string, unknown>>(response);
}

/**
 * Replaces all rarity rates for a specific set.
 */
export async function updateSetRates(
  token: string,
  setName: string,
  rates: RarityRate[],
): Promise<void> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(setName)}/rates`,
    {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ rates }),
    },
  );

  await handleResponse<RarityRate[]>(response);
}

/**
 * Creates a new card set.
 */
export async function createSet(
  token: string,
  data: { name: string; code: string; type: string; wave: number; active?: boolean },
): Promise<AdminSetRow> {
  const response = await fetch(`${env.api.baseUrl}/admin/sets`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });

  return handleResponse<AdminSetRow>(response);
}

/**
 * Deletes a card set by name.
 */
export async function deleteSet(token: string, name: string): Promise<void> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(name)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  await handleResponse<{ success: boolean }>(response);
}

/**
 * Fetches paginated cards assigned to a specific set.
 */
export async function fetchSetCards(
  token: string,
  name: string,
  params?: { page?: number; limit?: number; search?: string },
): Promise<{ cards: SetCardRow[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.set('page', String(params.page));
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);

  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(name)}/cards?${query.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return handleResponse<{ cards: SetCardRow[]; total: number }>(response);
}

/**
 * Assigns a single card to a set.
 */
export async function assignCardToSet(
  token: string,
  setName: string,
  data: { cardId: number; rarity: string; rarityCode: string },
): Promise<void> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(setName)}/cards`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(data),
    },
  );

  await handleResponse<{ success: boolean }>(response);
}

/**
 * Bulk-assigns multiple cards to a set.
 */
export async function bulkAssignCards(
  token: string,
  setName: string,
  cards: { cardId: number; rarity: string; rarityCode: string }[],
): Promise<{ count: number }> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(setName)}/cards/bulk`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ cards }),
    },
  );

  return handleResponse<{ count: number }>(response);
}

/**
 * Removes a single card from a set.
 */
export async function removeCardFromSet(
  token: string,
  setName: string,
  cardId: number,
): Promise<void> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(setName)}/cards/${cardId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  await handleResponse<{ success: boolean }>(response);
}

/**
 * Bulk-removes multiple cards from a set.
 */
export async function bulkRemoveCards(
  token: string,
  setName: string,
  cardIds: number[],
): Promise<{ count: number }> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(setName)}/cards/bulk`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
      body: JSON.stringify({ cardIds }),
    },
  );

  return handleResponse<{ count: number }>(response);
}

// ============================================================
// News
// ============================================================

/**
 * Fetches all news entries for admin management.
 */
export async function fetchAdminNews(token: string): Promise<AdminNews[]> {
  const response = await fetch(`${env.api.baseUrl}/admin/news`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return handleResponse<AdminNews[]>(response);
}

/**
 * Creates a new news entry.
 */
export async function createNews(
  token: string,
  data: Omit<AdminNews, 'id'>,
): Promise<AdminNews> {
  const response = await fetch(`${env.api.baseUrl}/admin/news`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });

  return handleResponse<AdminNews>(response);
}

/**
 * Updates an existing news entry by ID.
 */
export async function updateNews(
  token: string,
  id: number,
  data: Partial<AdminNews>,
): Promise<void> {
  const response = await fetch(`${env.api.baseUrl}/admin/news/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });

  await handleResponse<{ success: boolean }>(response);
}

/**
 * Deletes a news entry by ID.
 */
export async function deleteNews(token: string, id: number): Promise<void> {
  const response = await fetch(`${env.api.baseUrl}/admin/news/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleResponse<{ success: boolean }>(response);
}

// ============================================================
// Roadmap
// ============================================================

/**
 * Fetches all roadmap entries for admin management.
 */
export async function fetchAdminRoadmap(token: string): Promise<AdminRoadmap[]> {
  const response = await fetch(`${env.api.baseUrl}/admin/roadmap`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return handleResponse<AdminRoadmap[]>(response);
}

/**
 * Creates a new roadmap entry.
 */
export async function createRoadmap(
  token: string,
  data: Omit<AdminRoadmap, 'id'>,
): Promise<AdminRoadmap> {
  const response = await fetch(`${env.api.baseUrl}/admin/roadmap`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });

  return handleResponse<AdminRoadmap>(response);
}

/**
 * Updates an existing roadmap entry by ID.
 */
export async function updateRoadmap(
  token: string,
  id: number,
  data: Partial<AdminRoadmap>,
): Promise<void> {
  const response = await fetch(`${env.api.baseUrl}/admin/roadmap/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });

  await handleResponse<{ success: boolean }>(response);
}

/**
 * Deletes a roadmap entry by ID.
 */
export async function deleteRoadmap(token: string, id: number): Promise<void> {
  const response = await fetch(`${env.api.baseUrl}/admin/roadmap/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleResponse<{ success: boolean }>(response);
}

// ============================================================
// Users
// ============================================================

/**
 * Fetches all users for admin management.
 */
export async function fetchAdminUsers(token: string): Promise<AdminUser[]> {
  const response = await fetch(`${env.api.baseUrl}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return handleResponse<AdminUser[]>(response);
}

/**
 * Updates a user by ID (role, dp, etc.).
 */
export async function updateUser(
  token: string,
  id: number,
  data: Partial<AdminUser>,
): Promise<void> {
  const response = await fetch(`${env.api.baseUrl}/admin/users/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });

  await handleResponse<{ success: boolean }>(response);
}

// ============================================================
// Cosmetics
// ============================================================

/**
 * Fetches all cosmetic items for admin management.
 */
export async function fetchAdminCosmetics(token: string): Promise<AdminCosmetic[]> {
  const response = await fetch(`${env.api.baseUrl}/admin/cosmetics`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return handleResponse<AdminCosmetic[]>(response);
}

/**
 * Creates a new cosmetic item.
 */
export async function createCosmetic(
  token: string,
  data: Omit<AdminCosmetic, 'id'>,
): Promise<AdminCosmetic> {
  const response = await fetch(`${env.api.baseUrl}/admin/cosmetics`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });

  return handleResponse<AdminCosmetic>(response);
}

/**
 * Updates an existing cosmetic item by ID.
 */
export async function updateCosmetic(
  token: string,
  id: number,
  data: Partial<AdminCosmetic>,
): Promise<void> {
  const response = await fetch(`${env.api.baseUrl}/admin/cosmetics/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });

  await handleResponse<{ success: boolean }>(response);
}

/**
 * Deletes a cosmetic item by ID.
 */
export async function deleteCosmetic(token: string, id: number): Promise<void> {
  const response = await fetch(`${env.api.baseUrl}/admin/cosmetics/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  await handleResponse<{ success: boolean }>(response);
}
