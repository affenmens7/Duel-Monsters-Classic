/**
 * Admin Display routes — CRUD for independent display products.
 * Displays bundle multiple booster sets into a single purchasable product.
 */

import { Router } from 'express';
import { pool } from '../../config/db.js';
import { bumpDataVersion } from '../../services/versionService.js';

export const displaysRouter = Router();

/**
 * GET /api/admin/displays
 * List all displays with contents (admin sees all, not just shop_visible).
 */
displaysRouter.get('/', async (req, res) => {
  try {
    const displaysResult = await pool.query(`
      SELECT
        d.id, d.name, d.code, d.price,
        d.desc_de, d.desc_en,
        d.showcase_card_ids,
        COALESCE(d.showcase_animated, FALSE) AS showcase_animated,
        d.og_release_date, d.ig_release_date,
        COALESCE(d.is_event, FALSE) AS is_event,
        COALESCE(d.shop_active, FALSE) AS shop_active, d.shop_visible, d.wave,
        d.sort_order, d.created_at,
        (SELECT COALESCE(SUM(dc.pack_count), 0)::int
         FROM shop_display_contents dc WHERE dc.display_id = d.id) AS total_packs,
        (SELECT COALESCE(SUM(cnt.card_count), 0)::int
         FROM shop_display_contents dc2
         JOIN (SELECT set_name, COUNT(DISTINCT card_id)::int AS card_count
               FROM card_set_entries GROUP BY set_name) cnt
         ON cnt.set_name = dc2.booster_set_name
         WHERE dc2.display_id = d.id) AS card_count,
        (SELECT rw.start_date FROM shop_release_windows rw WHERE rw.product_type = 'display' AND rw.product_id = d.id::text AND rw.start_date > CURRENT_DATE ORDER BY rw.start_date LIMIT 1) AS next_release_start,
        (SELECT rw.end_date FROM shop_release_windows rw WHERE rw.product_type = 'display' AND rw.product_id = d.id::text AND rw.start_date <= CURRENT_DATE AND (rw.end_date IS NULL OR rw.end_date >= CURRENT_DATE) ORDER BY rw.start_date DESC LIMIT 1) AS active_window_end
      FROM shop_displays d
      ORDER BY d.sort_order, d.id
    `);

    const displayIds = displaysResult.rows.map((d: any) => d.id);
    let contentsRows: any[] = [];
    if (displayIds.length > 0) {
      const contentsResult = await pool.query(`
        SELECT dc.display_id, dc.booster_set_name, dc.pack_count,
               COALESCE(cnt.card_count, 0)::int AS card_count
        FROM shop_display_contents dc
        LEFT JOIN (
          SELECT set_name, COUNT(DISTINCT card_id)::int AS card_count
          FROM card_set_entries GROUP BY set_name
        ) cnt ON cnt.set_name = dc.booster_set_name
        WHERE dc.display_id = ANY($1)
      `, [displayIds]);
      contentsRows = contentsResult.rows;
    }

    const displays = displaysResult.rows.map((d: any) => ({
      ...d,
      contents: contentsRows
        .filter((c: any) => c.display_id === d.id)
        .map(({ booster_set_name, pack_count, card_count }: any) => ({
          boosterSetName: booster_set_name,
          packCount: pack_count,
          cardCount: card_count,
        })),
    }));

    console.log(`[ADMIN] user=${req.user!.userId} action=list_displays`);
    res.json(displays);
  } catch (err) {
    console.error('Admin list displays failed:', err);
    res.status(500).json({ error: 'Displays konnten nicht geladen werden' });
  }
});

/**
 * GET /api/admin/displays/search-boosters
 * Search available booster sets for display composition.
 */
displaysRouter.get('/search-boosters', async (req, res) => {
  try {
    const search = (req.query.search as string ?? '').trim();
    if (search.length < 1) {
      res.json([]);
      return;
    }

    const result = await pool.query(
      `SELECT cs.name, cs.code, cs.og_release_date
       FROM card_sets cs
       JOIN shop_set_config sc ON sc.set_name = cs.name
       WHERE sc.product_type = 'booster' AND cs.name ILIKE $1
       ORDER BY cs.name
       LIMIT 20`,
      [`%${search}%`]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Search boosters failed:', err);
    res.status(500).json({ error: 'Booster-Suche fehlgeschlagen' });
  }
});

/**
 * GET /api/admin/displays/:idOrName
 * Single display detail. Accepts numeric ID or display name.
 */
displaysRouter.get('/:idOrName', async (req, res) => {
  const param = req.params.idOrName;
  const displayId = /^\d+$/.test(param) ? parseInt(param, 10) : null;

  try {
    const displayResult = await pool.query(`
      SELECT
        d.id, d.name, d.code, d.price,
        d.desc_de, d.desc_en,
        d.showcase_card_ids,
        COALESCE(d.showcase_animated, FALSE) AS showcase_animated,
        d.og_release_date, d.ig_release_date,
        COALESCE(d.is_event, FALSE) AS is_event,
        COALESCE(d.shop_active, FALSE) AS shop_active, d.shop_visible, d.wave,
        d.sort_order, d.created_at,
        (SELECT COALESCE(SUM(dc.pack_count), 0)::int
         FROM shop_display_contents dc WHERE dc.display_id = d.id) AS total_packs,
        (SELECT COALESCE(SUM(cnt.card_count), 0)::int
         FROM shop_display_contents dc2
         JOIN (SELECT set_name, COUNT(DISTINCT card_id)::int AS card_count
               FROM card_set_entries GROUP BY set_name) cnt
         ON cnt.set_name = dc2.booster_set_name
         WHERE dc2.display_id = d.id) AS card_count
      FROM shop_displays d
      WHERE ${displayId !== null ? 'd.id = $1' : 'd.name = $1'}
    `, [displayId !== null ? displayId : param]);

    if (displayResult.rows.length === 0) {
      res.status(404).json({ error: 'Display nicht gefunden' });
      return;
    }

    const resolvedId = displayResult.rows[0].id;
    const contentsResult = await pool.query(`
      SELECT dc.booster_set_name, dc.pack_count
      FROM shop_display_contents dc
      WHERE dc.display_id = $1
    `, [resolvedId]);

    const display = {
      ...displayResult.rows[0],
      contents: contentsResult.rows.map(({ booster_set_name, pack_count }: any) => ({
        boosterSetName: booster_set_name,
        packCount: pack_count,
      })),
    };

    console.log(`[ADMIN] user=${req.user!.userId} action=get_display id=${displayId}`);
    res.json(display);
  } catch (err) {
    console.error('Admin get display failed:', err);
    res.status(500).json({ error: 'Display konnte nicht geladen werden' });
  }
});

/**
 * POST /api/admin/displays
 * Create a new display with optional contents.
 */
displaysRouter.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      name, code, price, desc_de, desc_en, wave, sort_order, shop_active, shop_visible,
      og_release_date, ig_release_date, showcase_card_ids, showcase_animated, contents, is_event,
    } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Pflichtfeld: name' });
      client.release();
      return;
    }

    await client.query('BEGIN');

    const displayResult = await client.query(
      `INSERT INTO shop_displays (name, code, price, desc_de, desc_en, wave, sort_order,
                                   shop_active, shop_visible, og_release_date, ig_release_date,
                                   showcase_card_ids, showcase_animated, is_event)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        name,
        code ?? null,
        price ?? 0,
        desc_de ?? null,
        desc_en ?? null,
        wave ?? 0,
        sort_order ?? 0,
        shop_active ?? false,
        shop_visible ?? true,
        og_release_date ?? null,
        ig_release_date || null,
        Array.isArray(showcase_card_ids) ? showcase_card_ids : null,
        showcase_animated ?? false,
        is_event ?? false,
      ]
    );

    const displayId = displayResult.rows[0].id;

    // Bulk insert contents
    if (Array.isArray(contents) && contents.length > 0) {
      for (const entry of contents) {
        await client.query(
          `INSERT INTO shop_display_contents (display_id, booster_set_name, pack_count)
           VALUES ($1, $2, $3)`,
          [displayId, entry.boosterSetName, entry.packCount ?? 24]
        );
      }
    }

    await client.query('COMMIT');

    console.log(`[ADMIN] user=${req.user!.userId} action=create_display name=${name}`);
    await bumpDataVersion();
    res.status(201).json(displayResult.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err?.code === '23505') {
      res.status(409).json({ error: 'Display mit diesem Namen existiert bereits' });
    } else {
      console.error('Admin create display failed:', err);
      res.status(500).json({ error: 'Display konnte nicht erstellt werden' });
    }
  } finally {
    client.release();
  }
});

/**
 * PUT /api/admin/displays/:id
 * Update display. If contents array is provided, replaces all contents.
 */
displaysRouter.put('/:id', async (req, res) => {
  const displayId = parseInt(req.params.id, 10);
  if (isNaN(displayId)) {
    res.status(400).json({ error: 'Ungueltige Display-ID' });
    return;
  }

  const client = await pool.connect();

  try {
    const {
      name, code, price, desc_de, desc_en, wave, sort_order, shop_active, shop_visible,
      og_release_date, ig_release_date, showcase_card_ids, showcase_animated, contents, is_event,
    } = req.body;

    await client.query('BEGIN');

    // Build dynamic update
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (name !== undefined) { updates.push(`name = $${idx++}`); params.push(name); }
    if (code !== undefined) { updates.push(`code = $${idx++}`); params.push(code); }
    if (price !== undefined) { updates.push(`price = $${idx++}`); params.push(Number(price)); }
    if (desc_de !== undefined) { updates.push(`desc_de = $${idx++}`); params.push(desc_de); }
    if (desc_en !== undefined) { updates.push(`desc_en = $${idx++}`); params.push(desc_en); }
    if (wave !== undefined) { updates.push(`wave = $${idx++}`); params.push(Number(wave)); }
    if (sort_order !== undefined) { updates.push(`sort_order = $${idx++}`); params.push(Number(sort_order)); }
    if (shop_active !== undefined) { updates.push(`shop_active = $${idx++}`); params.push(Boolean(shop_active)); }
    if (shop_visible !== undefined) { updates.push(`shop_visible = $${idx++}`); params.push(Boolean(shop_visible)); }
    if (og_release_date !== undefined) {
      updates.push(`og_release_date = $${idx++}`);
      params.push(og_release_date === null || og_release_date === '' ? null : String(og_release_date));
    }
    if (ig_release_date !== undefined) {
      updates.push(`ig_release_date = $${idx++}`);
      params.push(ig_release_date === null || ig_release_date === '' ? null : String(ig_release_date));
    }
    if (showcase_card_ids !== undefined) {
      updates.push(`showcase_card_ids = $${idx++}`);
      params.push(Array.isArray(showcase_card_ids) ? showcase_card_ids : null);
    }
    if (showcase_animated !== undefined) {
      updates.push(`showcase_animated = $${idx++}`);
      params.push(Boolean(showcase_animated));
    }
    if (is_event !== undefined) {
      updates.push(`is_event = $${idx++}`);
      params.push(Boolean(is_event));
    }

    if (updates.length > 0) {
      params.push(displayId);
      const result = await client.query(
        `UPDATE shop_displays SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Display nicht gefunden' });
        return;
      }
    }

    // Replace contents if provided
    if (Array.isArray(contents)) {
      await client.query(
        'DELETE FROM shop_display_contents WHERE display_id = $1',
        [displayId]
      );

      for (const entry of contents) {
        await client.query(
          `INSERT INTO shop_display_contents (display_id, booster_set_name, pack_count)
           VALUES ($1, $2, $3)`,
          [displayId, entry.boosterSetName, entry.packCount ?? 24]
        );
      }
    }

    await client.query('COMMIT');

    console.log(`[ADMIN] user=${req.user!.userId} action=update_display id=${displayId}`);
    await bumpDataVersion();

    // Return updated display
    const updated = await pool.query('SELECT * FROM shop_displays WHERE id = $1', [displayId]);
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Admin update display failed:', err);
    res.status(500).json({ error: 'Display konnte nicht aktualisiert werden' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/admin/displays/:id
 * Delete a display (cascade handles contents).
 */
displaysRouter.delete('/:id', async (req, res) => {
  const displayId = parseInt(req.params.id, 10);
  if (isNaN(displayId)) {
    res.status(400).json({ error: 'Ungueltige Display-ID' });
    return;
  }

  try {
    const result = await pool.query(
      'DELETE FROM shop_displays WHERE id = $1 RETURNING id, name',
      [displayId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Display nicht gefunden' });
      return;
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=delete_display id=${displayId} name=${result.rows[0].name}`);
    await bumpDataVersion();
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete display failed:', err);
    res.status(500).json({ error: 'Display konnte nicht geloescht werden' });
  }
});
