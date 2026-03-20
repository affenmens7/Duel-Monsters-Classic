/**
 * Admin Release Window routes — CRUD for product release scheduling.
 * Release windows define when products become active/inactive in the shop.
 * Generic: works with any product_type via PRODUCT_TABLE_MAP.
 */

import { Router } from 'express';
import { pool } from '../../config/db.js';
import { bumpDataVersion } from '../../services/versionService.js';
import { reschedule } from '../../services/releaseScheduler.js';

export const releasesRouter = Router();

/** Known product types and their backing tables (shop_active column). */
const PRODUCT_TABLE_MAP: Record<string, { table: string; idColumn: string; idType: 'text' | 'int' }> = {
  booster: { table: 'shop_set_config', idColumn: 'set_name', idType: 'text' },
  starter: { table: 'shop_set_config', idColumn: 'set_name', idType: 'text' },
  display: { table: 'shop_displays', idColumn: 'id', idType: 'int' },
};

// -------------------------------------------------------------------------
// GET /api/admin/releases — list release windows for a product
// Query params: product_type, product_id
// -------------------------------------------------------------------------
releasesRouter.get('/', async (req, res) => {
  const { product_type, product_id } = req.query;

  if (!product_type || !product_id) {
    res.status(400).json({ error: 'product_type and product_id required' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT id, product_type, product_id, start_date, end_date, created_at
       FROM shop_release_windows
       WHERE product_type = $1 AND product_id = $2
       ORDER BY start_date DESC`,
      [product_type, product_id],
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch release windows:', err);
    res.status(500).json({ error: 'Release-Windows konnten nicht geladen werden' });
  }
});

// -------------------------------------------------------------------------
// POST /api/admin/releases — create a release window
// Body: { product_type, product_id, start_date, end_date? }
// -------------------------------------------------------------------------
releasesRouter.post('/', async (req, res) => {
  const { product_type, product_id, start_date, end_date } = req.body;

  if (!product_type || !product_id || !start_date) {
    res.status(400).json({ error: 'product_type, product_id, and start_date required' });
    return;
  }

  if (!PRODUCT_TABLE_MAP[product_type]) {
    res.status(400).json({ error: `Unknown product_type: ${product_type}` });
    return;
  }

  // Validate date format
  if (isNaN(Date.parse(start_date))) {
    res.status(400).json({ error: 'Invalid start_date' });
    return;
  }

  if (end_date && isNaN(Date.parse(end_date))) {
    res.status(400).json({ error: 'Invalid end_date' });
    return;
  }

  if (end_date && new Date(end_date) <= new Date(start_date)) {
    res.status(400).json({ error: 'end_date must be after start_date' });
    return;
  }

  try {
    // Insert the release window
    const insertResult = await pool.query(
      `INSERT INTO shop_release_windows (product_type, product_id, start_date, end_date)
       VALUES ($1, $2, $3, $4)
       RETURNING id, product_type, product_id, start_date, end_date, created_at`,
      [product_type, product_id, start_date, end_date ?? null],
    );

    const window = insertResult.rows[0];

    // If this is the first-ever window, set ig_release_date on the product
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM shop_release_windows
       WHERE product_type = $1 AND product_id = $2`,
      [product_type, product_id],
    );

    if (countResult.rows[0].cnt === 1) {
      // First window — set ig_release_date if not already set
      if (product_type === 'booster' || product_type === 'starter') {
        await pool.query(
          `UPDATE shop_set_config SET ig_release_date = $1
           WHERE set_name = $2 AND ig_release_date IS NULL`,
          [start_date, product_id],
        );
      } else if (product_type === 'display') {
        await pool.query(
          `UPDATE shop_displays SET ig_release_date = $1
           WHERE id = $2::int AND ig_release_date IS NULL`,
          [start_date, product_id],
        );
      }
    }

    // If start_date <= today, activate the product immediately
    const today = new Date().toISOString().slice(0, 10);
    if (start_date <= today) {
      const mapping = PRODUCT_TABLE_MAP[product_type];
      const idValue = mapping.idType === 'int' ? parseInt(product_id, 10) : product_id;
      await pool.query(
        `UPDATE ${mapping.table} SET shop_active = TRUE WHERE ${mapping.idColumn} = $1`,
        [idValue],
      );
    }

    await bumpDataVersion();
    await reschedule();

    res.status(201).json(window);
  } catch (err) {
    console.error('Failed to create release window:', err);
    res.status(500).json({ error: 'Release-Window konnte nicht erstellt werden' });
  }
});

// -------------------------------------------------------------------------
// PUT /api/admin/releases/:id — update a release window
// Body: { start_date?, end_date? }
// -------------------------------------------------------------------------
releasesRouter.put('/:id', async (req, res) => {
  const windowId = parseInt(req.params.id, 10);
  if (isNaN(windowId)) {
    res.status(400).json({ error: 'Invalid window ID' });
    return;
  }

  const { start_date, end_date } = req.body;

  if (!start_date && end_date === undefined) {
    res.status(400).json({ error: 'At least one of start_date or end_date required' });
    return;
  }

  if (start_date && isNaN(Date.parse(start_date))) {
    res.status(400).json({ error: 'Invalid start_date' });
    return;
  }

  if (end_date !== undefined && end_date !== null && isNaN(Date.parse(end_date))) {
    res.status(400).json({ error: 'Invalid end_date' });
    return;
  }

  try {
    // Build dynamic update
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (start_date) {
      updates.push(`start_date = $${paramIndex++}`);
      values.push(start_date);
    }

    if (end_date !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      values.push(end_date); // null clears the end date
    }

    values.push(windowId);

    const result = await pool.query(
      `UPDATE shop_release_windows
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, product_type, product_id, start_date, end_date, created_at`,
      values,
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Release-Window nicht gefunden' });
      return;
    }

    await bumpDataVersion();
    await reschedule();

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to update release window:', err);
    res.status(500).json({ error: 'Release-Window konnte nicht aktualisiert werden' });
  }
});

// -------------------------------------------------------------------------
// DELETE /api/admin/releases/:id — delete a future release window
// Only allows deleting windows whose start_date > today.
// -------------------------------------------------------------------------
releasesRouter.delete('/:id', async (req, res) => {
  const windowId = parseInt(req.params.id, 10);
  if (isNaN(windowId)) {
    res.status(400).json({ error: 'Invalid window ID' });
    return;
  }

  try {
    const result = await pool.query(
      `DELETE FROM shop_release_windows
       WHERE id = $1 AND start_date > CURRENT_DATE
       RETURNING id`,
      [windowId],
    );

    if (result.rows.length === 0) {
      // Either not found or start_date is not in the future
      const exists = await pool.query(
        'SELECT id FROM shop_release_windows WHERE id = $1',
        [windowId],
      );
      if (exists.rows.length === 0) {
        res.status(404).json({ error: 'Release-Window nicht gefunden' });
      } else {
        res.status(400).json({ error: 'Nur zukuenftige Release-Windows koennen geloescht werden' });
      }
      return;
    }

    await bumpDataVersion();
    await reschedule();

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete release window:', err);
    res.status(500).json({ error: 'Release-Window konnte nicht geloescht werden' });
  }
});

// -------------------------------------------------------------------------
// POST /api/admin/releases/activate — activate a normal product with ig_release_date
// Body: { product_type, product_id, ig_release_date }
// -------------------------------------------------------------------------
releasesRouter.post('/activate', async (req, res) => {
  const { product_type, product_id, ig_release_date } = req.body;

  if (!product_type || !product_id || !ig_release_date) {
    res.status(400).json({ error: 'product_type, product_id, and ig_release_date required' });
    return;
  }

  const mapping = PRODUCT_TABLE_MAP[product_type];
  if (!mapping) {
    res.status(400).json({ error: `Unknown product_type: ${product_type}` });
    return;
  }

  if (isNaN(Date.parse(ig_release_date))) {
    res.status(400).json({ error: 'Invalid ig_release_date' });
    return;
  }

  try {
    const idValue = mapping.idType === 'int' ? parseInt(product_id, 10) : product_id;
    const today = new Date().toISOString().slice(0, 10);
    const shouldActivateNow = ig_release_date <= today;

    // Set ig_release_date and shop_active on the product config table
    if (product_type === 'booster' || product_type === 'starter') {
      await pool.query(
        `UPDATE shop_set_config SET ig_release_date = $1 WHERE set_name = $2`,
        [ig_release_date, product_id],
      );
      if (shouldActivateNow) {
        await pool.query(`UPDATE shop_set_config SET shop_active = TRUE WHERE set_name = $1`, [product_id]);
      }
    } else if (product_type === 'display') {
      await pool.query(
        `UPDATE shop_displays SET ig_release_date = $1 WHERE id = $2`,
        [ig_release_date, idValue],
      );
      if (shouldActivateNow) {
        await pool.query(`UPDATE shop_displays SET shop_active = TRUE WHERE id = $1`, [idValue]);
      }
    }

    // Remove any existing future windows for this product (overwrite, not duplicate)
    await pool.query(
      `DELETE FROM shop_release_windows
       WHERE product_type = $1 AND product_id = $2 AND start_date > CURRENT_DATE`,
      [product_type, product_id],
    );

    // Create release window entry
    await pool.query(
      `INSERT INTO shop_release_windows (product_type, product_id, start_date)
       VALUES ($1, $2, $3)`,
      [product_type, product_id, ig_release_date],
    );

    await bumpDataVersion();
    await reschedule();

    res.json({ success: true, activatedNow: shouldActivateNow });
  } catch (err) {
    console.error('Failed to activate product:', err);
    res.status(500).json({ error: 'Produkt konnte nicht aktiviert werden' });
  }
});

// -------------------------------------------------------------------------
// POST /api/admin/releases/reactivate — reactivate a previously released normal product
// Body: { product_type, product_id }
// -------------------------------------------------------------------------
releasesRouter.post('/reactivate', async (req, res) => {
  const { product_type, product_id } = req.body;

  if (!product_type || !product_id) {
    res.status(400).json({ error: 'product_type and product_id required' });
    return;
  }

  const mapping = PRODUCT_TABLE_MAP[product_type];
  if (!mapping) {
    res.status(400).json({ error: `Unknown product_type: ${product_type}` });
    return;
  }

  try {
    const idValue = mapping.idType === 'int' ? parseInt(product_id, 10) : product_id;
    const today = new Date().toISOString().slice(0, 10);

    // Reactivate the product in the shop
    await pool.query(
      `UPDATE ${mapping.table} SET shop_active = TRUE WHERE ${mapping.idColumn} = $1`,
      [idValue],
    );

    // Create new history entry (no end_date = permanent)
    await pool.query(
      `INSERT INTO shop_release_windows (product_type, product_id, start_date)
       VALUES ($1, $2, $3)`,
      [product_type, product_id, today],
    );

    await bumpDataVersion();
    await reschedule();

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to reactivate product:', err);
    res.status(500).json({ error: 'Produkt konnte nicht reaktiviert werden' });
  }
});

// -------------------------------------------------------------------------
// POST /api/admin/releases/deactivate — manually deactivate a product now
// Body: { product_type, product_id }
// -------------------------------------------------------------------------
releasesRouter.post('/deactivate', async (req, res) => {
  const { product_type, product_id } = req.body;

  if (!product_type || !product_id) {
    res.status(400).json({ error: 'product_type and product_id required' });
    return;
  }

  const mapping = PRODUCT_TABLE_MAP[product_type];
  if (!mapping) {
    res.status(400).json({ error: `Unknown product_type: ${product_type}` });
    return;
  }

  try {
    // Deactivate the product in the shop
    const idValue = mapping.idType === 'int' ? parseInt(product_id, 10) : product_id;
    await pool.query(
      `UPDATE ${mapping.table} SET shop_active = FALSE WHERE ${mapping.idColumn} = $1`,
      [idValue],
    );

    // Close any active release window by setting end_date = today
    const today = new Date().toISOString().slice(0, 10);
    await pool.query(
      `UPDATE shop_release_windows
       SET end_date = $1
       WHERE product_type = $2
         AND product_id = $3
         AND start_date <= CURRENT_DATE
         AND (end_date IS NULL OR end_date >= CURRENT_DATE)`,
      [today, product_type, product_id],
    );

    await bumpDataVersion();
    await reschedule();

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to deactivate product:', err);
    res.status(500).json({ error: 'Produkt konnte nicht deaktiviert werden' });
  }
});

// -------------------------------------------------------------------------
// POST /api/admin/releases/clear-history — delete all release windows for a product
// Body: { product_type, product_id }
// -------------------------------------------------------------------------
releasesRouter.post('/clear-history', async (req, res) => {
  const { product_type, product_id } = req.body;

  if (!product_type || !product_id) {
    res.status(400).json({ error: 'product_type and product_id required' });
    return;
  }

  try {
    const result = await pool.query(
      `DELETE FROM shop_release_windows
       WHERE product_type = $1 AND product_id = $2`,
      [product_type, product_id],
    );

    // Also clear ig_release_date
    if (product_type === 'booster' || product_type === 'starter') {
      await pool.query(`UPDATE shop_set_config SET ig_release_date = NULL WHERE set_name = $1`, [product_id]);
    } else if (product_type === 'display') {
      await pool.query(`UPDATE shop_displays SET ig_release_date = NULL WHERE id = $1::int`, [product_id]);
    }

    console.log(`[ADMIN] Cleared ${result.rowCount} release windows for ${product_type}:${product_id}`);

    await bumpDataVersion();
    await reschedule();

    res.json({ success: true, deleted: result.rowCount });
  } catch (err) {
    console.error('Failed to clear release history:', err);
    res.status(500).json({ error: 'Release-Verlauf konnte nicht geloescht werden' });
  }
});

// -------------------------------------------------------------------------
// POST /api/admin/releases/cancel-planned — cancel a planned future release
// Deletes future windows + clears ig_release_date. Does NOT change shop_active.
// Body: { product_type, product_id }
// -------------------------------------------------------------------------
releasesRouter.post('/cancel-planned', async (req, res) => {
  const { product_type, product_id } = req.body;

  if (!product_type || !product_id) {
    res.status(400).json({ error: 'product_type and product_id required' });
    return;
  }

  try {
    // Delete future windows only
    await pool.query(
      `DELETE FROM shop_release_windows
       WHERE product_type = $1 AND product_id = $2 AND start_date > CURRENT_DATE`,
      [product_type, product_id],
    );

    // Clear ig_release_date
    if (product_type === 'booster' || product_type === 'starter') {
      await pool.query(`UPDATE shop_set_config SET ig_release_date = NULL WHERE set_name = $1`, [product_id]);
    } else if (product_type === 'display') {
      await pool.query(`UPDATE shop_displays SET ig_release_date = NULL WHERE id = $1::int`, [product_id]);
    }

    await bumpDataVersion();
    await reschedule();

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to cancel planned release:', err);
    res.status(500).json({ error: 'Geplanter Release konnte nicht abgebrochen werden' });
  }
});
