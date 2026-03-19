import { env } from '../../config/env';
import { handleResponse } from './helpers';
import type { AdminCardPage } from './types';

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
