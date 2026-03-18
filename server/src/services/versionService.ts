/**
 * Version service — manages data version counter for client-side cache invalidation.
 * The version is bumped whenever catalog data changes (cards, sets, shop config).
 */

import { pool } from '../config/db.js';

/**
 * Returns a version string combining the counter and card count.
 * Format: "v{counter}-{cardCount}"
 */
export async function getDataVersion(): Promise<string> {
  const result = await pool.query(`
    SELECT
      (SELECT version FROM data_version WHERE id = 1) AS ver,
      (SELECT COUNT(*)::int FROM cards) AS card_count
  `);
  const { ver, card_count } = result.rows[0];
  return `v${ver}-${card_count}`;
}

/**
 * Increments the version counter. Call after any catalog mutation
 * (card import, set toggle, shop config change, etc.).
 */
export async function bumpDataVersion(): Promise<void> {
  await pool.query(
    'UPDATE data_version SET version = version + 1, updated_at = NOW() WHERE id = 1'
  );
}
