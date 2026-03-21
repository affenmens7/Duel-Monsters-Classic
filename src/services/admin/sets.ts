import { env } from '../../config/env';
import { authHeaders, handleResponse } from './helpers';
import type { AdminSet, AdminSetRow, RarityRate, SetCardRow } from './types';

export async function fetchAdminSets(token: string): Promise<AdminSetRow[]> {
  const response = await fetch(`${env.api.baseUrl}/admin/sets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<AdminSetRow[]>(response);
}

export async function fetchSetInfo(token: string, name: string): Promise<AdminSetRow> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(name)}/info`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return handleResponse<AdminSetRow>(response);
}

export async function updateSet(token: string, setName: string, data: Partial<AdminSet>): Promise<void> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(setName)}`,
    { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(data) },
  );
  await handleResponse<{ success: boolean }>(response);
}

export async function fetchSetRates(token: string, setName: string): Promise<RarityRate[]> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(setName)}/rates`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return handleResponse<RarityRate[]>(response);
}

/** Fetches distinct rarities that actually exist in this set's cards. */
export async function fetchSetRarities(token: string, setName: string): Promise<string[]> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(setName)}/rarities`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return handleResponse<string[]>(response);
}

export async function updateSetConfig(token: string, setName: string, data: Record<string, unknown>): Promise<void> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(setName)}/config`,
    { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(data) },
  );
  await handleResponse<Record<string, unknown>>(response);
}

export async function updateSetRates(token: string, setName: string, rates: RarityRate[]): Promise<void> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(setName)}/rates`,
    { method: 'PUT', headers: authHeaders(token), body: JSON.stringify({ rates }) },
  );
  await handleResponse<RarityRate[]>(response);
}

export interface ApiSetResult {
  set_name: string;
  set_code: string;
  num_of_cards: number;
  tcg_date: string | null;
  already_exists: boolean;
}

export async function searchApiSets(
  token: string, search: string, type?: string,
): Promise<ApiSetResult[]> {
  const params = new URLSearchParams({ search });
  if (type) params.set('type', type);
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/search-api?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await handleResponse<{ sets: ApiSetResult[] }>(response);
  return data.sets;
}

export async function createSet(
  token: string,
  data: { name: string; code: string; type: string; wave: number; active?: boolean; og_release_date?: string },
): Promise<AdminSetRow> {
  const response = await fetch(`${env.api.baseUrl}/admin/sets`, {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify(data),
  });
  return handleResponse<AdminSetRow>(response);
}

export interface ImportResult {
  cardsInserted: number;
  cardsSkipped: number;
  artworksInserted: number;
  imagesDownloaded: number;
  setEntriesCreated: number;
  totalCards: number;
}

export async function importSetCards(token: string, setName: string): Promise<ImportResult> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(setName)}/import-cards`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
  );
  return handleResponse<ImportResult>(response);
}

export async function deleteSet(token: string, name: string, deleteCards = false): Promise<void> {
  const query = deleteCards ? '?deleteCards=true' : '';
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(name)}${query}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  );
  await handleResponse<{ success: boolean }>(response);
}

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

export async function assignCardToSet(
  token: string, setName: string, data: { cardId: number; rarity: string; rarityCode: string; quantity?: number; artworkId?: number; isGhost?: boolean; isMisprint?: boolean },
): Promise<void> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(setName)}/cards`,
    { method: 'POST', headers: authHeaders(token), body: JSON.stringify(data) },
  );
  await handleResponse<{ success: boolean }>(response);
}

export async function bulkAssignCards(
  token: string, setName: string, cards: { cardId: number; rarity: string; rarityCode: string }[],
): Promise<{ count: number }> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(setName)}/cards/bulk`,
    { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ cards }) },
  );
  return handleResponse<{ count: number }>(response);
}

export async function removeCardFromSet(token: string, setName: string, cardId: number): Promise<void> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(setName)}/cards/${cardId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  );
  await handleResponse<{ success: boolean }>(response);
}

export async function bulkRemoveCards(token: string, setName: string, cardIds: number[]): Promise<{ count: number }> {
  const response = await fetch(
    `${env.api.baseUrl}/admin/sets/${encodeURIComponent(setName)}/cards/bulk`,
    { method: 'DELETE', headers: authHeaders(token), body: JSON.stringify({ cardIds }) },
  );
  return handleResponse<{ count: number }>(response);
}
