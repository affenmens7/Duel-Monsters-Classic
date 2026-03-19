/**
 * Admin Users routes — list and update users.
 */

import { Router } from 'express';
import { pool } from '../../config/db.js';

export const usersRouter = Router();

/** GET / — list users with stats. Supports pagination and search. */
usersRouter.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
    const search = (req.query.search as string)?.trim() || null;
    const offset = (page - 1) * limit;

    const params: unknown[] = [limit, offset];
    let whereClause = '';

    if (search) {
      whereClause = `WHERE u.username ILIKE $3 OR u.email ILIKE $3`;
      params.push(`%${search}%`);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM users u ${whereClause}`,
      search ? [params[2]] : []
    );

    const result = await pool.query(
      `SELECT
        u.id, u.username, u.tag, u.email, u.email_verified,
        u.role, u.dp, u.created_at, u.updated_at,
        s.duels_played, s.duels_won, s.story_chapter, s.starter_chosen
       FROM users u
       LEFT JOIN user_stats s ON s.user_id = u.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    console.log(`[ADMIN] user=${req.user!.userId} action=list_users page=${page}`);

    res.json({
      users: result.rows,
      total: countResult.rows[0].total,
      page,
      limit,
    });
  } catch (err) {
    console.error('Admin list users failed:', err);
    res.status(500).json({ error: 'Benutzer konnten nicht geladen werden' });
  }
});

/** PUT /:id — update user: dp and/or role only. */
usersRouter.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungueltige User-ID' });
      return;
    }

    const { dp, role } = req.body;

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (dp !== undefined) {
      const dpValue = Number(dp);
      if (isNaN(dpValue) || dpValue < 0) {
        res.status(400).json({ error: 'DP muss eine positive Zahl sein' });
        return;
      }
      updates.push(`dp = $${idx++}`);
      params.push(dpValue);
    }

    if (role !== undefined) {
      const validRoles = ['user', 'admin', 'moderator'];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: 'Ungueltige Rolle. Erlaubt: user, admin, moderator' });
        return;
      }
      updates.push(`role = $${idx++}`);
      params.push(role);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Keine Felder zum Aktualisieren angegeben' });
      return;
    }

    updates.push(`updated_at = NOW()`);

    params.push(id);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, username, tag, role, dp`,
      params
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Benutzer nicht gefunden' });
      return;
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=update_user target=${id}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin update user failed:', err);
    res.status(500).json({ error: 'Benutzer konnte nicht aktualisiert werden' });
  }
});
