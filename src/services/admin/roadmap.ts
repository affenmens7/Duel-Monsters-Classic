import { env } from '../../config/env';
import { authHeaders, handleResponse } from './helpers';
import type { AdminRoadmap } from './types';

export async function fetchAdminRoadmap(token: string): Promise<AdminRoadmap[]> {
  const response = await fetch(`${env.api.baseUrl}/admin/roadmap`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<AdminRoadmap[]>(response);
}

export async function createRoadmap(token: string, data: Omit<AdminRoadmap, 'id'>): Promise<AdminRoadmap> {
  const response = await fetch(`${env.api.baseUrl}/admin/roadmap`, {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify(data),
  });
  return handleResponse<AdminRoadmap>(response);
}

export async function updateRoadmap(token: string, id: number, data: Partial<AdminRoadmap>): Promise<void> {
  const response = await fetch(`${env.api.baseUrl}/admin/roadmap/${id}`, {
    method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(data),
  });
  await handleResponse<{ success: boolean }>(response);
}

export async function deleteRoadmap(token: string, id: number): Promise<void> {
  const response = await fetch(`${env.api.baseUrl}/admin/roadmap/${id}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  });
  await handleResponse<{ success: boolean }>(response);
}
