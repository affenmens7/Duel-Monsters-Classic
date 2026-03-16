/**
 * Card routes — serves card data from our own database.
 */

import { Router } from 'express';
import { pool } from '../config/db.js';

export const cardsRouter = Router();

cardsRouter.get('/', async (req, res) => {
  try {
    const { set, type } = req.query;

    let query = 'SELECT * FROM cards';
    const params: string[] = [];
    const conditions: string[] = [];

    if (type && typeof type === 'string') {
      conditions.push(`frame_type = $${params.length + 1}`);
      params.push(type);
    }

    if (set && typeof set === 'string') {
      conditions.push(`id IN (SELECT card_id FROM card_set_entries WHERE set_name = $${params.length + 1})`);
      params.push(set);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY name_en';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Kartendaten konnten nicht geladen werden' });
  }
});

cardsRouter.get('/sets/all', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT cs.name, cs.type, cs.image_path,
             COUNT(cse.card_id) as card_count
      FROM card_sets cs
      LEFT JOIN card_set_entries cse ON cse.set_name = cs.name
      GROUP BY cs.id
      ORDER BY cs.id
    `);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Sets konnten nicht geladen werden' });
  }
});

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
