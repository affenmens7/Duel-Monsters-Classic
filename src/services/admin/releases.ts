/**
 * Admin Release Windows API — CRUD for product release scheduling.
 */

import { env } from '../../config/env';
import { authHeaders, handleResponse } from './helpers';
import type { ReleaseWindow } from './types';

export async function fetchReleaseWindows(
  token: string,
  productType: string,
  productId: string,
): Promise<ReleaseWindow[]> {
  const params = new URLSearchParams({ product_type: productType, product_id: productId });
  const response = await fetch(
    `${env.api.baseUrl}/admin/releases?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return handleResponse<ReleaseWindow[]>(response);
}

export async function createReleaseWindow(
  token: string,
  data: { product_type: string; product_id: string; start_date: string; end_date?: string },
): Promise<ReleaseWindow> {
  const response = await fetch(`${env.api.baseUrl}/admin/releases`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<ReleaseWindow>(response);
}

export async function updateReleaseWindow(
  token: string,
  id: number,
  data: { start_date?: string; end_date?: string | null },
): Promise<ReleaseWindow> {
  const response = await fetch(`${env.api.baseUrl}/admin/releases/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<ReleaseWindow>(response);
}

export async function deleteReleaseWindow(
  token: string,
  id: number,
): Promise<{ success: boolean }> {
  const response = await fetch(`${env.api.baseUrl}/admin/releases/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<{ success: boolean }>(response);
}

export async function deactivateProduct(
  token: string,
  productType: string,
  productId: string,
): Promise<{ success: boolean }> {
  const response = await fetch(`${env.api.baseUrl}/admin/releases/deactivate`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ product_type: productType, product_id: productId }),
  });
  return handleResponse<{ success: boolean }>(response);
}
