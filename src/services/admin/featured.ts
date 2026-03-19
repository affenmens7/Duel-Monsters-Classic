/**
 * Admin Featured API — CRUD for shop carousel items.
 */

import { env } from '../../config/env';
import { authHeaders, handleResponse } from './helpers';

export interface FeaturedItem {
  id: number;
  product_type: string;
  product_id: string;
  title_de: string;
  title_en: string | null;
  subtitle_de: string | null;
  subtitle_en: string | null;
  image_path: string | null;
  active: boolean;
  sort_order: number;
  set_code: string | null;
  created_at: string;
}

export type FeaturedInput = Omit<FeaturedItem, 'id' | 'created_at' | 'set_code'>;

export async function fetchFeaturedItems(token: string): Promise<FeaturedItem[]> {
  const res = await fetch(`${env.api.baseUrl}/admin/featured`, { headers: authHeaders(token) });
  return handleResponse(res);
}

export async function createFeaturedItem(token: string, data: Partial<FeaturedInput>): Promise<FeaturedItem> {
  const res = await fetch(`${env.api.baseUrl}/admin/featured`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateFeaturedItem(token: string, id: number, data: Partial<FeaturedInput>): Promise<FeaturedItem> {
  const res = await fetch(`${env.api.baseUrl}/admin/featured/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteFeaturedItem(token: string, id: number): Promise<void> {
  const res = await fetch(`${env.api.baseUrl}/admin/featured/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  await handleResponse(res);
}
