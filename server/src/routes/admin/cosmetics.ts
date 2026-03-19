/**
 * Admin Cosmetics routes — CRUD for cosmetic products.
 */

import { Router } from 'express';
import { pool } from '../../config/db.js';
import { bumpDataVersion } from '../../services/versionService.js';

export const cosmeticsRouter = Router();

/** GET / — list all cosmetic products. */
cosmeticsRouter.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM shop_cosmetics ORDER BY item_type, sort_order'
    );
    console.log(`[ADMIN] user=${req.user!.userId} action=list_cosmetics`);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin list cosmetics failed:', err);
    res.status(500).json({ error: 'Kosmetik-Produkte konnten nicht geladen werden' });
  }
});

/** POST / — create a cosmetic product. */
cosmeticsRouter.post('/', async (req, res) => {
  try {
    const {
      item_type, item_id, name_de, name_en,
      desc_de, desc_en, price, preview_data,
      available, sort_order,
    } = req.body;

    if (!item_type || !item_id || !name_de || !name_en || price === undefined) {
      res.status(400).json({ error: 'Pflichtfelder: item_type, item_id, name_de, name_en, price' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO shop_cosmetics
        (item_type, item_id, name_de, name_en, desc_de, desc_en, price, preview_data, available, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        item_type, item_id, name_de, name_en,
        desc_de ?? null, desc_en ?? null, Number(price),
        preview_data ?? null, available ?? true, sort_order ?? 0,
      ]
    );

    console.log(`[ADMIN] user=${req.user!.userId} action=create_cosmetic target=${item_id}`);
    await bumpDataVersion();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Admin create cosmetic failed:', err);
    res.status(500).json({ error: 'Kosmetik-Produkt konnte nicht erstellt werden' });
  }
});

/** PUT /:id — update a cosmetic product by ID. */
cosmeticsRouter.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungueltige Kosmetik-ID' });
      return;
    }

    const {
      item_type, item_id, name_de, name_en,
      desc_de, desc_en, price, preview_data,
      available, sort_order,
    } = req.body;

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (item_type !== undefined) { updates.push(`item_type = $${idx++}`); params.push(item_type); }
    if (item_id !== undefined) { updates.push(`item_id = $${idx++}`); params.push(item_id); }
    if (name_de !== undefined) { updates.push(`name_de = $${idx++}`); params.push(name_de); }
    if (name_en !== undefined) { updates.push(`name_en = $${idx++}`); params.push(name_en); }
    if (desc_de !== undefined) { updates.push(`desc_de = $${idx++}`); params.push(desc_de); }
    if (desc_en !== undefined) { updates.push(`desc_en = $${idx++}`); params.push(desc_en); }
    if (price !== undefined) { updates.push(`price = $${idx++}`); params.push(Number(price)); }
    if (preview_data !== undefined) { updates.push(`preview_data = $${idx++}`); params.push(preview_data); }
    if (available !== undefined) { updates.push(`available = $${idx++}`); params.push(Boolean(available)); }
    if (sort_order !== undefined) { updates.push(`sort_order = $${idx++}`); params.push(Number(sort_order)); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Keine Felder zum Aktualisieren angegeben' });
      return;
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE shop_cosmetics SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Kosmetik-Produkt nicht gefunden' });
      return;
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=update_cosmetic target=${id}`);
    await bumpDataVersion();
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin update cosmetic failed:', err);
    res.status(500).json({ error: 'Kosmetik-Produkt konnte nicht aktualisiert werden' });
  }
});

/** DELETE /:id — delete a cosmetic product by ID. */
cosmeticsRouter.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungueltige Kosmetik-ID' });
      return;
    }

    const result = await pool.query(
      'DELETE FROM shop_cosmetics WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Kosmetik-Produkt nicht gefunden' });
      return;
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=delete_cosmetic target=${id}`);
    await bumpDataVersion();
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete cosmetic failed:', err);
    res.status(500).json({ error: 'Kosmetik-Produkt konnte nicht geloescht werden' });
  }
});
