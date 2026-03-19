import { env } from '../../config/env';
import { authHeaders, handleResponse } from './helpers';
import type { AdminCosmetic } from './types';

export async function fetchAdminCosmetics(token: string): Promise<AdminCosmetic[]> {
  const response = await fetch(`${env.api.baseUrl}/admin/cosmetics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<AdminCosmetic[]>(response);
}

export async function createCosmetic(token: string, data: Omit<AdminCosmetic, 'id'>): Promise<AdminCosmetic> {
  const response = await fetch(`${env.api.baseUrl}/admin/cosmetics`, {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify(data),
  });
  return handleResponse<AdminCosmetic>(response);
}

export async function updateCosmetic(token: string, id: number, data: Partial<AdminCosmetic>): Promise<void> {
  const response = await fetch(`${env.api.baseUrl}/admin/cosmetics/${id}`, {
    method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(data),
  });
  await handleResponse<{ success: boolean }>(response);
}

export async function deleteCosmetic(token: string, id: number): Promise<void> {
  const response = await fetch(`${env.api.baseUrl}/admin/cosmetics/${id}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  });
  await handleResponse<{ success: boolean }>(response);
}
