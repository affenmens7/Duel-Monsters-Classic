/**
 * Admin Dashboard — platform statistics.
 */

import { Router } from 'express';
import { pool } from '../../config/db.js';

export const dashboardRouter = Router();

/**
 * GET /stats
 * Returns high-level platform statistics.
 */
dashboardRouter.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS "totalUsers",
        (SELECT COUNT(*)::int FROM cards) AS "totalCards",
        (SELECT COUNT(*)::int FROM card_sets WHERE active = TRUE) AS "activeSets",
        (SELECT COALESCE(SUM(dp), 0)::bigint FROM users) AS "totalDp",
        (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '7 days') AS "recentUsers7d"
    `);

    console.log(`[ADMIN] user=${req.user!.userId} action=view_stats`);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin stats failed:', err);
    res.status(500).json({ error: 'Statistiken konnten nicht geladen werden' });
  }
});
