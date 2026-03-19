import { env } from '../../config/env';
import { authHeaders, handleResponse } from './helpers';
import type { AdminNews } from './types';

export async function fetchAdminNews(token: string): Promise<AdminNews[]> {
  const response = await fetch(`${env.api.baseUrl}/admin/news`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<AdminNews[]>(response);
}

export async function createNews(token: string, data: Omit<AdminNews, 'id'>): Promise<AdminNews> {
  const response = await fetch(`${env.api.baseUrl}/admin/news`, {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify(data),
  });
  return handleResponse<AdminNews>(response);
}

export async function updateNews(token: string, id: number, data: Partial<AdminNews>): Promise<void> {
  const response = await fetch(`${env.api.baseUrl}/admin/news/${id}`, {
    method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(data),
  });
  await handleResponse<{ success: boolean }>(response);
}

export async function deleteNews(token: string, id: number): Promise<void> {
  const response = await fetch(`${env.api.baseUrl}/admin/news/${id}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  });
  await handleResponse<{ success: boolean }>(response);
}
