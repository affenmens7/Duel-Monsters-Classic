/**
 * Version API service — checks the backend data version for cache invalidation.
 */

import { env } from '../config/env';

/**
 * Fetches the current data version from the backend.
 * Returns null on network error (allows offline cache usage).
 */
export async function fetchDataVersion(): Promise<string | null> {
  try {
    const response = await fetch(`${env.api.baseUrl}/data-version`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.version ?? null;
  } catch {
    return null;
  }
}
