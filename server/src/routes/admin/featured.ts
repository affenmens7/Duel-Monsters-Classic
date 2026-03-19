/**
 * Admin featured carousel management — CRUD for shop_featured entries.
 */

import { Router } from 'express';
import { pool } from '../../config/db.js';

export const featuredRouter = Router();

/** GET /api/admin/featured — list all featured items (active + inactive) */
featuredRouter.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT sf.*, cs.code AS set_code
       FROM shop_featured sf
       LEFT JOIN card_sets cs ON cs.name = sf.product_id
       ORDER BY sf.sort_order, sf.id`
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Featured-Eintraege konnten nicht geladen werden' });
  }
});

/** POST /api/admin/featured — create a new featured item */
featuredRouter.post('/', async (req, res) => {
  try {
    const { product_type, product_id, title_de, title_en, subtitle_de, subtitle_en, image_path, active, sort_order } = req.body;

    if (!product_type || !product_id || !title_de) {
      res.status(400).json({ error: 'product_type, product_id und title_de sind erforderlich' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO shop_featured (product_type, product_id, title_de, title_en, subtitle_de, subtitle_en, image_path, active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [product_type, product_id, title_de, title_en ?? null, subtitle_de ?? null, subtitle_en ?? null, image_path ?? null, active ?? true, sort_order ?? 0]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Featured-Eintrag konnte nicht erstellt werden' });
  }
});

/** PUT /api/admin/featured/:id — update a featured item */
featuredRouter.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: 'Ungueltige ID' });
      return;
    }

    const { product_type, product_id, title_de, title_en, subtitle_de, subtitle_en, image_path, active, sort_order } = req.body;

    const result = await pool.query(
      `UPDATE shop_featured
       SET product_type = COALESCE($1, product_type),
           product_id = COALESCE($2, product_id),
           title_de = COALESCE($3, title_de),
           title_en = COALESCE($4, title_en),
           subtitle_de = COALESCE($5, subtitle_de),
           subtitle_en = COALESCE($6, subtitle_en),
           image_path = COALESCE($7, image_path),
           active = COALESCE($8, active),
           sort_order = COALESCE($9, sort_order)
       WHERE id = $10
       RETURNING *`,
      [product_type, product_id, title_de, title_en, subtitle_de, subtitle_en, image_path, active, sort_order, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Eintrag nicht gefunden' });
      return;
    }
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Featured-Eintrag konnte nicht aktualisiert werden' });
  }
});

/** DELETE /api/admin/featured/:id — delete a featured item */
featuredRouter.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: 'Ungueltige ID' });
      return;
    }

    const result = await pool.query('DELETE FROM shop_featured WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Eintrag nicht gefunden' });
      return;
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Featured-Eintrag konnte nicht geloescht werden' });
  }
});
