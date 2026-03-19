import { env } from '../../config/env';
import { handleResponse } from './helpers';
import type { AdminStats } from './types';

export async function fetchAdminStats(token: string): Promise<AdminStats> {
  const response = await fetch(`${env.api.baseUrl}/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<AdminStats>(response);
}
