/**
 * Card routes — serves card data from our own database.
 * Availability = card is assigned to at least one set.
 * Badge color (active) = set is purchasable via shop_active or in an active display.
 */

import { Router } from 'express';
import { pool } from '../config/db.js';
export const cardsRouter = Router();

/**
 * GET /api/cards/count
 * Returns total card count — used by frontend to check if cache is stale.
 */
cardsRouter.get('/count', async (_req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*)::int AS count FROM cards');
    res.json({ count: result.rows[0].count });
  } catch {
    res.status(500).json({ count: 0 });
  }
});

/**
 * GET /api/cards/browse
 * Returns ALL cards in the database — for the public card browser.
 * available = card is obtainable via a purchasable product (shop_active).
 * Badge active = set has shop_active OR is in an active display.
 */
cardsRouter.get('/browse', async (_req, res) => {
  try {
    const result = await pool.query(`
      WITH purchasable_sets AS (
        SELECT sc.set_name FROM shop_set_config sc WHERE sc.shop_active = TRUE
        UNION
        SELECT sdc.booster_set_name FROM shop_display_contents sdc
        JOIN shop_displays sd ON sd.id = sdc.display_id WHERE sd.shop_active = TRUE
      )
      SELECT c.*,
        EXISTS(
          SELECT 1 FROM card_set_entries cse
          WHERE cse.card_id = c.id
            AND cse.set_name IN (SELECT set_name FROM purchasable_sets)
        ) AS available,
        COALESCE(
          (SELECT ARRAY_AGG(ca.artwork_id ORDER BY ca.is_default DESC, ca.artwork_id)
           FROM card_artworks ca WHERE ca.card_id = c.id),
          ARRAY[]::int[]
        ) AS artwork_ids,
        COALESCE(
          (SELECT JSON_AGG(JSON_BUILD_OBJECT(
             'name', cs.name, 'code', cs.code,
             'active', (cse.set_name IN (SELECT set_name FROM purchasable_sets)),
             'artworkId', cse.artwork_id
           ) ORDER BY (cse.set_name IN (SELECT set_name FROM purchasable_sets)) DESC, cs.wave, cs.name)
           FROM card_set_entries cse
           JOIN card_sets cs ON cs.name = cse.set_name
           WHERE cse.card_id = c.id),
          '[]'::json
        ) AS sets
      FROM cards c
      ORDER BY c.name_en
    `);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Kartendaten konnten nicht geladen werden' });
  }
});

/**
 * GET /api/cards/sets/all
 * Returns all sets with card count, wave, and purchasable status.
 */
cardsRouter.get('/sets/all', async (_req, res) => {
  try {
    const result = await pool.query(`
      WITH purchasable_sets AS (
        SELECT sc.set_name FROM shop_set_config sc WHERE sc.shop_active = TRUE
        UNION
        SELECT sdc.booster_set_name FROM shop_display_contents sdc
        JOIN shop_displays sd ON sd.id = sdc.display_id WHERE sd.shop_active = TRUE
      )
      SELECT cs.name, cs.code, cs.type, cs.wave,
             (cs.name IN (SELECT set_name FROM purchasable_sets)) AS active,
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
      SELECT c.*, cse.set_code
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
      'SELECT set_name, set_code FROM card_set_entries WHERE card_id = $1',
      [id]
    );

    const artworksResult = await pool.query(
      `SELECT ca.artwork_id AS "artworkId", ca.label, ca.image_path AS "imagePath", ca.is_default AS "isDefault",
        (SELECT string_agg(cse.set_name, ', ')
         FROM card_set_entries cse
         WHERE cse.card_id = ca.card_id AND cse.artwork_id = ca.artwork_id
        ) AS "availableIn"
       FROM card_artworks ca
       WHERE ca.card_id = $1
       ORDER BY ca.is_default DESC, ca.artwork_id`,
      [id]
    );

    res.json({ ...cardResult.rows[0], sets: setsResult.rows, artworks: artworksResult.rows });
  } catch {
    res.status(500).json({ error: 'Karte konnte nicht geladen werden' });
  }
});
