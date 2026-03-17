/**
 * Card routes — serves card data from our own database.
 * By default only returns cards from active sets.
 */

import { Router } from 'express';
import { pool } from '../config/db.js';

export const cardsRouter = Router();

/**
 * GET /api/cards
 * Returns cards from active sets only (unless ?all=true for admin).
 * Optional: ?set=SetName&type=normal
 */
cardsRouter.get('/', async (req, res) => {
  try {
    const { set, type, all } = req.query;

    // Subquery to check if a card belongs to any active set
    let query = `SELECT DISTINCT c.*,
      EXISTS(
        SELECT 1 FROM card_set_entries cse2
        JOIN card_sets cs2 ON cs2.name = cse2.set_name
        WHERE cse2.card_id = c.id AND cs2.active = TRUE
      ) as available
      FROM cards c
      JOIN card_set_entries cse ON cse.card_id = c.id
      JOIN card_sets cs ON cs.name = cse.set_name`;

    const params: string[] = [];
    const conditions: string[] = [];

    // Only active sets unless ?all=true
    if (all !== 'true') {
      conditions.push('cs.active = TRUE');
    }

    if (type && typeof type === 'string') {
      conditions.push(`c.frame_type = $${params.length + 1}`);
      params.push(type);
    }

    if (set && typeof set === 'string') {
      conditions.push(`cse.set_name = $${params.length + 1}`);
      params.push(set);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY c.name_en';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Kartendaten konnten nicht geladen werden' });
  }
});

/**
 * GET /api/cards/browse
 * Returns ALL cards with availability flag — for the card browser.
 * Available cards first, then unavailable. Includes set info.
 */
cardsRouter.get('/browse', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT c.*,
        EXISTS(
          SELECT 1 FROM card_set_entries cse2
          JOIN card_sets cs2 ON cs2.name = cse2.set_name
          WHERE cse2.card_id = c.id AND cs2.active = TRUE
        ) as available
      FROM cards c
      ORDER BY available DESC, c.name_en
    `);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Kartendaten konnten nicht geladen werden' });
  }
});

/**
 * GET /api/cards/sets/all
 * Returns all sets with card count, wave, active status and image.
 */
cardsRouter.get('/sets/all', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT cs.name, cs.code, cs.type, cs.wave, cs.active, cs.image_path,
             COUNT(cse.card_id) as card_count
      FROM card_sets cs
      LEFT JOIN card_set_entries cse ON cse.set_name = cs.name
      GROUP BY cs.id
      ORDER BY cs.wave, cs.type DESC, cs.name
    `);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Sets konnten nicht geladen werden' });
  }
});

/**
 * GET /api/cards/sets/:name
 * Returns all cards in a specific set.
 */
cardsRouter.get('/sets/:name', async (req, res) => {
  try {
    const setName = req.params.name;
    const result = await pool.query(`
      SELECT c.*, cse.set_code, cse.rarity, cse.rarity_code
      FROM cards c
      JOIN card_set_entries cse ON cse.card_id = c.id
      WHERE cse.set_name = $1
      ORDER BY c.name_en
    `, [setName]);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Set-Karten konnten nicht geladen werden' });
  }
});

/**
 * GET /api/cards/:id
 * Returns a single card with its set info.
 */
cardsRouter.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungueltige Karten-ID' });
      return;
    }

    const cardResult = await pool.query('SELECT * FROM cards WHERE id = $1', [id]);
    if (cardResult.rows.length === 0) {
      res.status(404).json({ error: 'Karte nicht gefunden' });
      return;
    }

    const setsResult = await pool.query(
      'SELECT set_name, set_code, rarity, rarity_code FROM card_set_entries WHERE card_id = $1',
      [id]
    );

    res.json({ ...cardResult.rows[0], sets: setsResult.rows });
  } catch {
    res.status(500).json({ error: 'Karte konnte nicht geladen werden' });
  }
});
