/**
 * User routes — /api/user/me (protected)
 */

import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

export const userRouter = Router();

userRouter.get('/me', requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT u.id, u.username, u.tag, u.role, u.dp, u.created_at,
            s.duels_played, s.duels_won, s.story_chapter
     FROM users u
     LEFT JOIN user_stats s ON s.user_id = u.id
     WHERE u.id = $1`,
    [req.user!.userId]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'User nicht gefunden' });
    return;
  }

  res.json(result.rows[0]);
});
