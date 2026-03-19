import { env } from '../../config/env';
import { authHeaders, handleResponse } from './helpers';
import type { AdminUser } from './types';

export async function fetchAdminUsers(token: string): Promise<AdminUser[]> {
  const response = await fetch(`${env.api.baseUrl}/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<AdminUser[]>(response);
}

export async function updateUser(token: string, id: number, data: Partial<AdminUser>): Promise<void> {
  const response = await fetch(`${env.api.baseUrl}/admin/users/${id}`, {
    method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(data),
  });
  await handleResponse<{ success: boolean }>(response);
}
