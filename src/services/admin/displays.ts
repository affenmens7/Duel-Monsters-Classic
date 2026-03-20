/**
 * Admin Displays API — CRUD for display products.
 */

import { env } from '../../config/env';
import { authHeaders, handleResponse } from './helpers';
import type { AdminDisplayRow } from './types';

export async function fetchAdminDisplays(token: string): Promise<AdminDisplayRow[]> {
  const response = await fetch(`${env.api.baseUrl}/admin/displays`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<AdminDisplayRow[]>(response);
}

export async function fetchAdminDisplay(token: string, id: number | string): Promise<AdminDisplayRow> {
  const response = await fetch(`${env.api.baseUrl}/admin/displays/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<AdminDisplayRow>(response);
}

export async function createDisplay(
  token: string,
  data: {
    name: string;
    price?: number;
    desc_de?: string;
    desc_en?: string;
    wave?: number;
    sort_order?: number;
    active?: boolean;
    shop_visible?: boolean;
    contents?: { boosterSetName: string; packCount: number }[];
  },
): Promise<AdminDisplayRow> {
  const response = await fetch(`${env.api.baseUrl}/admin/displays`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<AdminDisplayRow>(response);
}

export async function updateDisplay(
  token: string,
  id: number,
  data: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(`${env.api.baseUrl}/admin/displays/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  await handleResponse<Record<string, unknown>>(response);
}

export async function deleteDisplay(token: string, id: number): Promise<void> {
  const response = await fetch(`${env.api.baseUrl}/admin/displays/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  await handleResponse<{ success: boolean }>(response);
}

export async function searchBoosters(
  token: string,
  search: string,
): Promise<{ name: string; code: string; og_release_date?: string }[]> {
  const params = new URLSearchParams({ search });
  const response = await fetch(
    `${env.api.baseUrl}/admin/displays/search-boosters?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return handleResponse<{ name: string; code: string; og_release_date?: string }[]>(response);
}
