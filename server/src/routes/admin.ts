/**
 * Admin routes — dashboard stats, set management, news, roadmap, users, cosmetics.
 * All routes require authentication + admin role.
 */

import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

export const adminRouter = Router();

// Apply auth + admin middleware to every route in this router
adminRouter.use(requireAuth, requireAdmin);

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/stats
 * Returns high-level platform statistics.
 */
adminRouter.get('/stats', async (req, res) => {
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

// ---------------------------------------------------------------------------
// Sets
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/sets
 * List all sets with shop config and card counts.
 */
adminRouter.get('/sets', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        cs.name,
        cs.code,
        cs.type,
        cs.wave,
        cs.active,
        cs.release_date,
        cs.image_path,
        sc.product_type,
        sc.price_pack,
        sc.price_display,
        sc.pack_size,
        sc.display_size,
        sc.desc_de,
        sc.desc_en,
        sc.featured,
        sc.sort_order,
        COALESCE(cnt.card_count, 0)::int AS card_count
      FROM card_sets cs
      LEFT JOIN shop_set_config sc ON sc.set_name = cs.name
      LEFT JOIN (
        SELECT set_name, COUNT(DISTINCT card_id)::int AS card_count
        FROM card_set_entries
        GROUP BY set_name
      ) cnt ON cnt.set_name = cs.name
      ORDER BY cs.wave, cs.type DESC, cs.name
    `);

    console.log(`[ADMIN] user=${req.user!.userId} action=list_sets`);

    res.json(result.rows);
  } catch (err) {
    console.error('Admin list sets failed:', err);
    res.status(500).json({ error: 'Sets konnten nicht geladen werden' });
  }
});

/**
 * GET /api/admin/sets/:name/info
 * Returns a single set with shop config and card count (lightweight alternative to GET /sets).
 */
adminRouter.get('/sets/:name/info', async (req, res) => {
  try {
    const { name } = req.params;

    const result = await pool.query(`
      SELECT
        cs.name,
        cs.code,
        cs.type,
        cs.wave,
        cs.active,
        cs.release_date,
        cs.image_path,
        sc.product_type,
        sc.price_pack,
        sc.price_display,
        sc.pack_size,
        sc.display_size,
        sc.desc_de,
        sc.desc_en,
        sc.featured,
        sc.sort_order,
        COALESCE(cnt.card_count, 0)::int AS card_count
      FROM card_sets cs
      LEFT JOIN shop_set_config sc ON sc.set_name = cs.name
      LEFT JOIN (
        SELECT set_name, COUNT(DISTINCT card_id)::int AS card_count
        FROM card_set_entries
        WHERE set_name = $1
        GROUP BY set_name
      ) cnt ON cnt.set_name = cs.name
      WHERE cs.name = $1
    `, [name]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Set nicht gefunden' });
      return;
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=get_set_info target=${name}`);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin get set info failed:', err);
    res.status(500).json({ error: 'Set-Info konnte nicht geladen werden' });
  }
});

/**
 * PUT /api/admin/sets/:name
 * Update set fields: active, wave, release_date.
 */
adminRouter.put('/sets/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { active, wave, release_date } = req.body;

    // Validate that the set exists
    const existing = await pool.query(
      'SELECT name FROM card_sets WHERE name = $1',
      [name]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Set nicht gefunden' });
      return;
    }

    // Build dynamic update (only update fields that are present)
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (active !== undefined) {
      updates.push(`active = $${idx++}`);
      params.push(Boolean(active));
    }
    if (wave !== undefined) {
      updates.push(`wave = $${idx++}`);
      params.push(Number(wave));
    }
    if (release_date !== undefined) {
      updates.push(`release_date = $${idx++}`);
      params.push(String(release_date));
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Keine Felder zum Aktualisieren angegeben' });
      return;
    }

    params.push(name);
    const result = await pool.query(
      `UPDATE card_sets SET ${updates.join(', ')} WHERE name = $${idx} RETURNING *`,
      params
    );

    console.log(`[ADMIN] user=${req.user!.userId} action=update_set target=${name}`);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin update set failed:', err);
    res.status(500).json({ error: 'Set konnte nicht aktualisiert werden' });
  }
});

/**
 * PUT /api/admin/sets/:name/config
 * Update shop_set_config fields for a set.
 */
adminRouter.put('/sets/:name/config', async (req, res) => {
  try {
    const { name } = req.params;
    const {
      price_pack, price_display, pack_size, display_size,
      desc_de, desc_en, featured, sort_order,
    } = req.body;

    // Verify the set exists
    const existing = await pool.query(
      'SELECT name FROM card_sets WHERE name = $1',
      [name]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Set nicht gefunden' });
      return;
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (price_pack !== undefined) {
      updates.push(`price_pack = $${idx++}`);
      params.push(Number(price_pack));
    }
    if (price_display !== undefined) {
      updates.push(`price_display = $${idx++}`);
      params.push(price_display === null ? null : Number(price_display));
    }
    if (pack_size !== undefined) {
      updates.push(`pack_size = $${idx++}`);
      params.push(Number(pack_size));
    }
    if (display_size !== undefined) {
      updates.push(`display_size = $${idx++}`);
      params.push(display_size === null ? null : Number(display_size));
    }
    if (desc_de !== undefined) {
      updates.push(`desc_de = $${idx++}`);
      params.push(desc_de);
    }
    if (desc_en !== undefined) {
      updates.push(`desc_en = $${idx++}`);
      params.push(desc_en);
    }
    if (featured !== undefined) {
      updates.push(`featured = $${idx++}`);
      params.push(Boolean(featured));
    }
    if (sort_order !== undefined) {
      updates.push(`sort_order = $${idx++}`);
      params.push(Number(sort_order));
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Keine Felder zum Aktualisieren angegeben' });
      return;
    }

    params.push(name);
    const result = await pool.query(
      `UPDATE shop_set_config SET ${updates.join(', ')} WHERE set_name = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Shop-Konfiguration fuer dieses Set nicht gefunden' });
      return;
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=update_set_config target=${name}`);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin update set config failed:', err);
    res.status(500).json({ error: 'Shop-Konfiguration konnte nicht aktualisiert werden' });
  }
});

/**
 * GET /api/admin/sets/:name/rates
 * Fetch rarity rates for a set.
 */
adminRouter.get('/sets/:name/rates', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT rarity, rate_pct::float AS "ratePct" FROM shop_rarity_rates WHERE set_name = $1 ORDER BY sort_order',
      [req.params.name]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load rarity rates:', err);
    res.status(500).json({ error: 'Rarity Rates konnten nicht geladen werden' });
  }
});

/**
 * PUT /api/admin/sets/:name/rates
 * Replace all rarity rates for a set.
 * Body: { rates: [{ rarity: string, ratePct: number }] }
 */
adminRouter.put('/sets/:name/rates', async (req, res) => {
  const client = await pool.connect();

  try {
    const { name } = req.params;
    const { rates } = req.body;

    if (!Array.isArray(rates)) {
      res.status(400).json({ error: 'rates muss ein Array sein' });
      client.release();
      return;
    }

    // Verify the set exists
    const existing = await client.query(
      'SELECT name FROM card_sets WHERE name = $1',
      [name]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Set nicht gefunden' });
      client.release();
      return;
    }

    await client.query('BEGIN');

    // Delete existing rates for this set
    await client.query(
      'DELETE FROM shop_rarity_rates WHERE set_name = $1',
      [name]
    );

    // Insert new rates
    for (let i = 0; i < rates.length; i++) {
      const { rarity, ratePct } = rates[i];
      if (!rarity || ratePct === undefined) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Jeder Eintrag braucht rarity und ratePct' });
        client.release();
        return;
      }

      await client.query(
        `INSERT INTO shop_rarity_rates (set_name, rarity, rate_pct, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [name, String(rarity), Number(ratePct), i]
      );
    }

    await client.query('COMMIT');

    console.log(`[ADMIN] user=${req.user!.userId} action=update_rates target=${name}`);

    // Return the newly inserted rates
    const result = await client.query(
      'SELECT rarity, rate_pct AS "ratePct", sort_order FROM shop_rarity_rates WHERE set_name = $1 ORDER BY sort_order',
      [name]
    );

    res.json(result.rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Admin update rates failed:', err);
    res.status(500).json({ error: 'Rarity-Raten konnten nicht aktualisiert werden' });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// Cards Browser
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/cards
 * Browse all cards in the database with pagination, search and filters.
 * Query params: page (default 1), limit (default 50, max 100),
 *   search (ILIKE on name_de/name_en), frameType (optional), attribute (optional).
 */
adminRouter.get('/cards', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const search = (req.query.search as string)?.trim() || null;
    const frameType = (req.query.frameType as string)?.trim() || null;
    const attribute = (req.query.attribute as string)?.trim() || null;
    const sortBy = (req.query.sortBy as string)?.trim() || 'name_en';
    const sortDir = (req.query.sortDir as string)?.trim() === 'desc' ? 'DESC' : 'ASC';
    const offset = (page - 1) * limit;

    // Whitelist sortable columns
    const sortableColumns = ['name_en', 'name_de', 'frame_type', 'atk', 'def', 'level', 'attribute', 'id'];
    const safeSort = sortableColumns.includes(sortBy) ? sortBy : 'name_en';

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (search) {
      conditions.push(`(name_de ILIKE $${idx} OR name_en ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (frameType) {
      conditions.push(`frame_type = $${idx}`);
      params.push(frameType);
      idx++;
    }
    if (attribute) {
      conditions.push(`attribute = $${idx}`);
      params.push(attribute);
      idx++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Count total matching rows
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM cards ${whereClause}`,
      params
    );

    // Fetch paginated results
    const dataParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT * FROM cards ${whereClause} ORDER BY ${safeSort} ${sortDir} NULLS LAST LIMIT $${idx} OFFSET $${idx + 1}`,
      dataParams
    );

    console.log(`[ADMIN] user=${req.user!.userId} action=browse_cards page=${page}`);

    res.json({
      cards: result.rows,
      total: countResult.rows[0].total,
      page,
      limit,
    });
  } catch (err) {
    console.error('Admin browse cards failed:', err);
    res.status(500).json({ error: 'Karten konnten nicht geladen werden' });
  }
});

/**
 * POST /api/admin/cards
 * Create a new card in the database.
 */
adminRouter.post('/cards', async (req, res) => {
  try {
    const { id, name_de, name_en, desc_de, desc_en, type_de, type_en, frame_type, atk, def, level, race_de, race_en, attribute, archetype } = req.body;

    if (!id || !name_en || !frame_type) {
      res.status(400).json({ error: 'id, name_en und frame_type sind Pflichtfelder' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO cards (id, name_de, name_en, desc_de, desc_en, type_de, type_en, frame_type, atk, def, level, race_de, race_en, attribute, archetype, image_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [id, name_de ?? name_en, name_en, desc_de ?? '', desc_en ?? '', type_de ?? '', type_en ?? '', frame_type, atk ?? null, def ?? null, level ?? null, race_de ?? '', race_en ?? '', attribute ?? null, archetype ?? null, `/images/cards/${id}.jpg`]
    );

    console.log(`[ADMIN] user=${req.user!.userId} action=create_card target=${id}`);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ error: 'Karte mit dieser ID existiert bereits' });
      return;
    }
    console.error('Create card failed:', err);
    res.status(500).json({ error: 'Karte konnte nicht erstellt werden' });
  }
});

/**
 * PUT /api/admin/cards/:id
 * Update an existing card.
 */
adminRouter.put('/cards/:id', async (req, res) => {
  try {
    const cardId = parseInt(req.params.id, 10);
    const fields = req.body;
    const allowed = ['name_de', 'name_en', 'desc_de', 'desc_en', 'type_de', 'type_en', 'frame_type', 'atk', 'def', 'level', 'race_de', 'race_en', 'attribute', 'archetype'];

    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const key of allowed) {
      if (key in fields) {
        sets.push(`${key} = $${idx}`);
        params.push(fields[key]);
        idx++;
      }
    }

    if (sets.length === 0) {
      res.status(400).json({ error: 'Keine Felder zum Aktualisieren' });
      return;
    }

    params.push(cardId);
    const result = await pool.query(
      `UPDATE cards SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Karte nicht gefunden' });
      return;
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=update_card target=${cardId}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update card failed:', err);
    res.status(500).json({ error: 'Karte konnte nicht aktualisiert werden' });
  }
});

/**
 * GET /api/admin/cards/search-api
 * Search YGOPRODeck API for cards (external, not our DB).
 * Used for importing new cards into our database.
 */
adminRouter.get('/cards/search-api', async (req, res) => {
  try {
    const search = (req.query.search as string)?.trim();
    if (!search || search.length < 2) {
      res.json({ cards: [] });
      return;
    }

    // Search both DE and EN APIs in parallel, merge results
    const [deRes, enRes] = await Promise.allSettled([
      fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(search)}&language=de`),
      fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(search)}`),
    ]);

    const deData = deRes.status === 'fulfilled' && deRes.value.ok ? await deRes.value.json() : { data: [] };
    const enData = enRes.status === 'fulfilled' && enRes.value.ok ? await enRes.value.json() : { data: [] };

    // Merge and deduplicate by card ID
    const seen = new Set<number>();
    const merged: any[] = [];
    for (const c of [...(deData.data ?? []), ...(enData.data ?? [])]) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        merged.push(c);
      }
    }

    const cards = merged.slice(0, 20).map((c: any) => ({
      id: c.id,
      name_en: c.name,
      name_de: c.misc_info?.[0]?.translated_name ?? c.name,
      desc_en: c.desc,
      desc_de: c.misc_info?.[0]?.translated_desc ?? c.desc,
      type_en: c.type,
      frame_type: c.frameType,
      atk: c.atk ?? null,
      def: c.def ?? null,
      level: c.level ?? null,
      race_en: c.race,
      attribute: c.attribute ?? null,
      archetype: c.archetype ?? null,
      image_url: c.card_images?.[0]?.image_url ?? null,
      image_url_small: c.card_images?.[0]?.image_url_small ?? null,
      artworks: (c.card_images ?? []).map((img: any) => ({
        artwork_id: img.id,
        image_url: img.image_url,
        image_url_small: img.image_url_small,
      })),
      already_imported: false,
    }));

    // Check which cards are already in our DB
    if (cards.length > 0) {
      const ids = cards.map((c: any) => c.id);
      const existing = await pool.query('SELECT id FROM cards WHERE id = ANY($1)', [ids]);
      const existingIds = new Set(existing.rows.map((r: any) => r.id));
      for (const card of cards) {
        card.already_imported = existingIds.has(card.id);
      }
    }

    res.json({ cards });
  } catch (err) {
    console.error('YGOPRODeck API search failed:', err);
    res.status(500).json({ error: 'API-Suche fehlgeschlagen' });
  }
});

/**
 * POST /api/admin/cards/import
 * Import a card from YGOPRODeck API into our DB + download image.
 * Body: { cardId: number }
 */
adminRouter.post('/cards/import', async (req, res) => {
  try {
    const { cardId } = req.body;
    if (!cardId) {
      res.status(400).json({ error: 'cardId erforderlich' });
      return;
    }

    // Check if already exists
    const existing = await pool.query('SELECT id FROM cards WHERE id = $1', [cardId]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Karte bereits importiert' });
      return;
    }

    // Fetch from YGOPRODeck API
    const apiUrl = `https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${cardId}&language=de`;
    const apiRes = await fetch(apiUrl);
    if (!apiRes.ok) {
      res.status(404).json({ error: 'Karte nicht in YGOPRODeck gefunden' });
      return;
    }

    const data = await apiRes.json();
    const c = data.data?.[0];
    if (!c) {
      res.status(404).json({ error: 'Kartendaten leer' });
      return;
    }

    // Insert card into DB
    const nameDe = c.misc_info?.[0]?.translated_name ?? c.name;
    const descDe = c.misc_info?.[0]?.translated_desc ?? c.desc;
    const typeDe = c.type; // fallback to English type
    const raceDe = c.race; // fallback to English race

    await pool.query(
      `INSERT INTO cards (id, name_de, name_en, desc_de, desc_en, type_de, type_en, frame_type, atk, def, level, race_de, race_en, attribute, archetype, image_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [c.id, nameDe, c.name, descDe, c.desc, typeDe, c.type, c.frameType, c.atk ?? null, c.def ?? null, c.level ?? null, raceDe, c.race, c.attribute ?? null, c.archetype ?? null, `/images/cards/${c.id}.jpg`]
    );

    // Download all artworks
    const fs = await import('fs');
    const path = await import('path');
    const artworks = c.card_images ?? [];
    let artworkCount = 0;

    for (let i = 0; i < artworks.length; i++) {
      const artwork = artworks[i];
      const artworkId = artwork.id;
      const isDefault = i === 0;
      const label = isDefault ? 'Original' : `Artwork ${i + 1}`;
      const artImgPath = `/images/cards/${artworkId}.jpg`;

      // Insert artwork record
      await pool.query(
        `INSERT INTO card_artworks (card_id, artwork_id, label, image_path, is_default)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (artwork_id) DO NOTHING`,
        [c.id, artworkId, label, artImgPath, isDefault]
      );

      // Download image
      try {
        const imgRes = await fetch(artwork.image_url);
        if (imgRes.ok) {
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          const imgDest = path.default.join(process.cwd(), '..', 'public', 'images', 'cards', `${artworkId}.jpg`);
          fs.default.mkdirSync(path.default.dirname(imgDest), { recursive: true });
          fs.default.writeFileSync(imgDest, imgBuffer);
          artworkCount++;
        }
      } catch (imgErr) {
        console.error(`Failed to download artwork ${artworkId}:`, imgErr);
      }
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=import_card target=${c.id} name=${c.name} artworks=${artworkCount}`);
    res.status(201).json({ success: true, cardId: c.id, name: c.name, nameDe, artworkCount });
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ error: 'Karte bereits importiert' });
      return;
    }
    console.error('Card import failed:', err);
    res.status(500).json({ error: 'Import fehlgeschlagen' });
  }
});

// ---------------------------------------------------------------------------
// Set CRUD (create / delete)
// ---------------------------------------------------------------------------

/**
 * POST /api/admin/sets
 * Create a new set with default shop config and rarity rates.
 * Body: { name, code, type, wave, active, release_date }
 */
adminRouter.post('/sets', async (req, res) => {
  const client = await pool.connect();

  try {
    const { name, code, type, wave, active, release_date } = req.body;

    if (!name || !code) {
      res.status(400).json({ error: 'Pflichtfelder: name, code' });
      client.release();
      return;
    }

    const setType = type || 'booster';

    await client.query('BEGIN');

    // Insert the set itself
    const setResult = await client.query(
      `INSERT INTO card_sets (name, code, type, wave, active, release_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, code, setType, wave ?? 0, active ?? false, release_date ?? null]
    );

    // Auto-create default shop_set_config based on set type
    const isStarter = setType === 'starter';
    const defaultPricePack = isStarter ? 600 : 120;
    const defaultPackSize = isStarter ? 40 : 5;

    await client.query(
      `INSERT INTO shop_set_config (set_name, product_type, price_pack, pack_size)
       VALUES ($1, $2, $3, $4)`,
      [name, setType, defaultPricePack, defaultPackSize]
    );

    // Auto-create default rarity rates
    const defaultRates = [
      { rarity: 'Common', rate: 55, order: 0 },
      { rarity: 'Rare', rate: 25, order: 1 },
      { rarity: 'Super Rare', rate: 12, order: 2 },
      { rarity: 'Ultra Rare', rate: 6, order: 3 },
      { rarity: 'Secret Rare', rate: 2, order: 4 },
    ];

    for (const r of defaultRates) {
      await client.query(
        `INSERT INTO shop_rarity_rates (set_name, rarity, rate_pct, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [name, r.rarity, r.rate, r.order]
      );
    }

    await client.query('COMMIT');

    console.log(`[ADMIN] user=${req.user!.userId} action=create_set target=${name}`);

    res.status(201).json(setResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Admin create set failed:', err);
    res.status(500).json({ error: 'Set konnte nicht erstellt werden' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/admin/sets/:name
 * Delete a set. Cascades handle card_set_entries, shop_set_config, shop_rarity_rates.
 */
adminRouter.delete('/sets/:name', async (req, res) => {
  try {
    const { name } = req.params;

    const result = await pool.query(
      'DELETE FROM card_sets WHERE name = $1 RETURNING name',
      [name]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Set nicht gefunden' });
      return;
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=delete_set target=${name}`);

    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete set failed:', err);
    res.status(500).json({ error: 'Set konnte nicht geloescht werden' });
  }
});

// ---------------------------------------------------------------------------
// Set Cards Management
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/sets/:name/cards
 * List cards in a set with pagination and search.
 * Query params: page (default 1), limit (default 100), search (optional ILIKE on name_de/name_en).
 */
adminRouter.get('/sets/:name/cards', async (req, res) => {
  try {
    const { name } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 100));
    const search = (req.query.search as string)?.trim() || null;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['cse.set_name = $1'];
    const params: unknown[] = [name];
    let idx = 2;

    if (search) {
      conditions.push(`(c.name_de ILIKE $${idx} OR c.name_en ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Count total matching rows
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM card_set_entries cse
       JOIN cards c ON c.id = cse.card_id
       ${whereClause}`,
      params
    );

    // Fetch paginated results
    const dataParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT
        c.id, c.name_de, c.name_en, c.desc_de, c.desc_en, c.frame_type,
        c.atk, c.def, c.level, c.attribute, c.race_de, c.race_en, c.archetype, c.image_path,
        cse.rarity, cse.rarity_code, cse.artwork_id
       FROM card_set_entries cse
       JOIN cards c ON c.id = cse.card_id
       ${whereClause}
       ORDER BY c.name_en
       LIMIT $${idx} OFFSET $${idx + 1}`,
      dataParams
    );

    console.log(`[ADMIN] user=${req.user!.userId} action=list_set_cards target=${name}`);

    res.json({
      cards: result.rows,
      total: countResult.rows[0].total,
    });
  } catch (err) {
    console.error('Admin list set cards failed:', err);
    res.status(500).json({ error: 'Set-Karten konnten nicht geladen werden' });
  }
});

/**
 * POST /api/admin/sets/:name/cards
 * Add or update a single card in a set.
 * Body: { cardId, rarity, rarityCode, artworkId? }
 */
adminRouter.post('/sets/:name/cards', async (req, res) => {
  try {
    const { name } = req.params;
    const { cardId, rarity, rarityCode, artworkId } = req.body;

    if (!cardId) {
      res.status(400).json({ error: 'cardId ist erforderlich' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO card_set_entries (card_id, set_name, rarity, rarity_code, artwork_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (card_id, set_name)
       DO UPDATE SET rarity = EXCLUDED.rarity, rarity_code = EXCLUDED.rarity_code, artwork_id = EXCLUDED.artwork_id
       RETURNING *`,
      [cardId, name, rarity ?? null, rarityCode ?? null, artworkId ?? null]
    );

    console.log(`[ADMIN] user=${req.user!.userId} action=add_set_card target=${name} card=${cardId}`);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Admin add set card failed:', err);
    res.status(500).json({ error: 'Karte konnte nicht zum Set hinzugefuegt werden' });
  }
});

/**
 * POST /api/admin/sets/:name/cards/bulk
 * Add or update multiple cards in a set within a transaction.
 * Body: { cards: [{ cardId, rarity, rarityCode, artworkId? }] }
 */
adminRouter.post('/sets/:name/cards/bulk', async (req, res) => {
  const client = await pool.connect();

  try {
    const { name } = req.params;
    const { cards } = req.body;

    if (!Array.isArray(cards) || cards.length === 0) {
      res.status(400).json({ error: 'cards muss ein nicht-leeres Array sein' });
      client.release();
      return;
    }

    await client.query('BEGIN');

    for (const entry of cards) {
      const { cardId, rarity, rarityCode, artworkId } = entry;
      if (!cardId) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Jeder Eintrag braucht eine cardId' });
        client.release();
        return;
      }

      await client.query(
        `INSERT INTO card_set_entries (card_id, set_name, rarity, rarity_code, artwork_id)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (card_id, set_name)
         DO UPDATE SET rarity = EXCLUDED.rarity, rarity_code = EXCLUDED.rarity_code, artwork_id = EXCLUDED.artwork_id`,
        [cardId, name, rarity ?? null, rarityCode ?? null, artworkId ?? null]
      );
    }

    await client.query('COMMIT');

    console.log(`[ADMIN] user=${req.user!.userId} action=bulk_add_set_cards target=${name} count=${cards.length}`);

    res.status(201).json({ count: cards.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Admin bulk add set cards failed:', err);
    res.status(500).json({ error: 'Karten konnten nicht zum Set hinzugefuegt werden' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/admin/sets/:name/cards/:cardId
 * Remove a single card from a set.
 */
adminRouter.delete('/sets/:name/cards/:cardId', async (req, res) => {
  try {
    const { name, cardId } = req.params;
    const cardIdNum = parseInt(cardId, 10);

    if (isNaN(cardIdNum)) {
      res.status(400).json({ error: 'Ungueltige Card-ID' });
      return;
    }

    const result = await pool.query(
      'DELETE FROM card_set_entries WHERE set_name = $1 AND card_id = $2 RETURNING id',
      [name, cardIdNum]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Karte nicht in diesem Set gefunden' });
      return;
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=remove_set_card target=${name} card=${cardIdNum}`);

    res.json({ success: true });
  } catch (err) {
    console.error('Admin remove set card failed:', err);
    res.status(500).json({ error: 'Karte konnte nicht aus dem Set entfernt werden' });
  }
});

/**
 * DELETE /api/admin/sets/:name/cards
 * Bulk-remove cards from a set.
 * Body: { cardIds: number[] }
 */
adminRouter.delete('/sets/:name/cards', async (req, res) => {
  const client = await pool.connect();

  try {
    const { name } = req.params;
    const { cardIds } = req.body;

    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      res.status(400).json({ error: 'cardIds muss ein nicht-leeres Array sein' });
      client.release();
      return;
    }

    await client.query('BEGIN');

    const result = await client.query(
      'DELETE FROM card_set_entries WHERE set_name = $1 AND card_id = ANY($2) RETURNING id',
      [name, cardIds]
    );

    await client.query('COMMIT');

    console.log(`[ADMIN] user=${req.user!.userId} action=bulk_remove_set_cards target=${name} count=${result.rowCount}`);

    res.json({ count: result.rowCount });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Admin bulk remove set cards failed:', err);
    res.status(500).json({ error: 'Karten konnten nicht aus dem Set entfernt werden' });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/news
 * List all news articles (including unpublished).
 */
adminRouter.get('/news', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM news ORDER BY sort_order DESC, created_at DESC'
    );

    console.log(`[ADMIN] user=${req.user!.userId} action=list_news`);

    res.json(result.rows);
  } catch (err) {
    console.error('Admin list news failed:', err);
    res.status(500).json({ error: 'News konnten nicht geladen werden' });
  }
});

/**
 * POST /api/admin/news
 * Create a news article.
 */
adminRouter.post('/news', async (req, res) => {
  try {
    const {
      slug, dateLabel, titleDe, titleEn,
      summaryDe, summaryEn, contentDe, contentEn,
      tag, published, sortOrder,
    } = req.body;

    if (!slug || !dateLabel || !titleDe || !summaryDe || !contentDe || !tag) {
      res.status(400).json({ error: 'Pflichtfelder: slug, dateLabel, titleDe, summaryDe, contentDe, tag' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO news
        (slug, date_label, title_de, title_en, summary_de, summary_en, content_de, content_en, tag, published, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        slug, dateLabel, titleDe, titleEn ?? null,
        summaryDe, summaryEn ?? null, contentDe, contentEn ?? null,
        tag, published ?? true, sortOrder ?? 0,
      ]
    );

    console.log(`[ADMIN] user=${req.user!.userId} action=create_news target=${slug}`);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Admin create news failed:', err);
    res.status(500).json({ error: 'News konnte nicht erstellt werden' });
  }
});

/**
 * PUT /api/admin/news/:id
 * Update a news article by ID.
 */
adminRouter.put('/news/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungueltige News-ID' });
      return;
    }

    const {
      slug, dateLabel, titleDe, titleEn,
      summaryDe, summaryEn, contentDe, contentEn,
      tag, published, sortOrder,
    } = req.body;

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (slug !== undefined) { updates.push(`slug = $${idx++}`); params.push(slug); }
    if (dateLabel !== undefined) { updates.push(`date_label = $${idx++}`); params.push(dateLabel); }
    if (titleDe !== undefined) { updates.push(`title_de = $${idx++}`); params.push(titleDe); }
    if (titleEn !== undefined) { updates.push(`title_en = $${idx++}`); params.push(titleEn); }
    if (summaryDe !== undefined) { updates.push(`summary_de = $${idx++}`); params.push(summaryDe); }
    if (summaryEn !== undefined) { updates.push(`summary_en = $${idx++}`); params.push(summaryEn); }
    if (contentDe !== undefined) { updates.push(`content_de = $${idx++}`); params.push(contentDe); }
    if (contentEn !== undefined) { updates.push(`content_en = $${idx++}`); params.push(contentEn); }
    if (tag !== undefined) { updates.push(`tag = $${idx++}`); params.push(tag); }
    if (published !== undefined) { updates.push(`published = $${idx++}`); params.push(Boolean(published)); }
    if (sortOrder !== undefined) { updates.push(`sort_order = $${idx++}`); params.push(Number(sortOrder)); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Keine Felder zum Aktualisieren angegeben' });
      return;
    }

    updates.push(`updated_at = NOW()`);

    params.push(id);
    const result = await pool.query(
      `UPDATE news SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'News nicht gefunden' });
      return;
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=update_news target=${id}`);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin update news failed:', err);
    res.status(500).json({ error: 'News konnte nicht aktualisiert werden' });
  }
});

/**
 * DELETE /api/admin/news/:id
 * Delete a news article by ID.
 */
adminRouter.delete('/news/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungueltige News-ID' });
      return;
    }

    const result = await pool.query(
      'DELETE FROM news WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'News nicht gefunden' });
      return;
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=delete_news target=${id}`);

    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete news failed:', err);
    res.status(500).json({ error: 'News konnte nicht geloescht werden' });
  }
});

// ---------------------------------------------------------------------------
// Roadmap
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/roadmap
 * List all roadmap phases.
 */
adminRouter.get('/roadmap', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM roadmap_phases ORDER BY sort_order'
    );

    console.log(`[ADMIN] user=${req.user!.userId} action=list_roadmap`);

    res.json(result.rows);
  } catch (err) {
    console.error('Admin list roadmap failed:', err);
    res.status(500).json({ error: 'Roadmap konnte nicht geladen werden' });
  }
});

/**
 * POST /api/admin/roadmap
 * Create a roadmap phase.
 */
adminRouter.post('/roadmap', async (req, res) => {
  try {
    const {
      slug, phaseLabel, titleDe, titleEn,
      descDe, descEn, status,
      featuresDe, featuresEn, detailDe, detailEn,
      sortOrder,
    } = req.body;

    if (!slug || !phaseLabel || !titleDe || !status) {
      res.status(400).json({ error: 'Pflichtfelder: slug, phaseLabel, titleDe, status' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO roadmap_phases
        (slug, phase_label, title_de, title_en, desc_de, desc_en, status, features_de, features_en, detail_de, detail_en, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        slug, phaseLabel, titleDe, titleEn ?? null,
        descDe ?? null, descEn ?? null, status,
        featuresDe ?? null, featuresEn ?? null,
        detailDe ?? null, detailEn ?? null,
        sortOrder ?? 0,
      ]
    );

    console.log(`[ADMIN] user=${req.user!.userId} action=create_roadmap target=${slug}`);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Admin create roadmap failed:', err);
    res.status(500).json({ error: 'Roadmap-Phase konnte nicht erstellt werden' });
  }
});

/**
 * PUT /api/admin/roadmap/:id
 * Update a roadmap phase by ID.
 */
adminRouter.put('/roadmap/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungueltige Roadmap-ID' });
      return;
    }

    const {
      slug, phaseLabel, titleDe, titleEn,
      descDe, descEn, status,
      featuresDe, featuresEn, detailDe, detailEn,
      sortOrder,
    } = req.body;

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (slug !== undefined) { updates.push(`slug = $${idx++}`); params.push(slug); }
    if (phaseLabel !== undefined) { updates.push(`phase_label = $${idx++}`); params.push(phaseLabel); }
    if (titleDe !== undefined) { updates.push(`title_de = $${idx++}`); params.push(titleDe); }
    if (titleEn !== undefined) { updates.push(`title_en = $${idx++}`); params.push(titleEn); }
    if (descDe !== undefined) { updates.push(`desc_de = $${idx++}`); params.push(descDe); }
    if (descEn !== undefined) { updates.push(`desc_en = $${idx++}`); params.push(descEn); }
    if (status !== undefined) { updates.push(`status = $${idx++}`); params.push(status); }
    if (featuresDe !== undefined) { updates.push(`features_de = $${idx++}`); params.push(featuresDe); }
    if (featuresEn !== undefined) { updates.push(`features_en = $${idx++}`); params.push(featuresEn); }
    if (detailDe !== undefined) { updates.push(`detail_de = $${idx++}`); params.push(detailDe); }
    if (detailEn !== undefined) { updates.push(`detail_en = $${idx++}`); params.push(detailEn); }
    if (sortOrder !== undefined) { updates.push(`sort_order = $${idx++}`); params.push(Number(sortOrder)); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Keine Felder zum Aktualisieren angegeben' });
      return;
    }

    updates.push(`updated_at = NOW()`);

    params.push(id);
    const result = await pool.query(
      `UPDATE roadmap_phases SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Roadmap-Phase nicht gefunden' });
      return;
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=update_roadmap target=${id}`);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin update roadmap failed:', err);
    res.status(500).json({ error: 'Roadmap-Phase konnte nicht aktualisiert werden' });
  }
});

/**
 * DELETE /api/admin/roadmap/:id
 * Delete a roadmap phase by ID.
 */
adminRouter.delete('/roadmap/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungueltige Roadmap-ID' });
      return;
    }

    const result = await pool.query(
      'DELETE FROM roadmap_phases WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Roadmap-Phase nicht gefunden' });
      return;
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=delete_roadmap target=${id}`);

    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete roadmap failed:', err);
    res.status(500).json({ error: 'Roadmap-Phase konnte nicht geloescht werden' });
  }
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/users
 * List users with stats. Supports pagination and search.
 * Query params: page (default 1), limit (default 25), search (optional).
 */
adminRouter.get('/users', async (req, res) => {
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

/**
 * PUT /api/admin/users/:id
 * Update user: dp and/or role only.
 */
adminRouter.put('/users/:id', async (req, res) => {
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

// ---------------------------------------------------------------------------
// Cosmetics
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/cosmetics
 * List all cosmetic products.
 */
adminRouter.get('/cosmetics', async (req, res) => {
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

/**
 * POST /api/admin/cosmetics
 * Create a cosmetic product.
 */
adminRouter.post('/cosmetics', async (req, res) => {
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

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Admin create cosmetic failed:', err);
    res.status(500).json({ error: 'Kosmetik-Produkt konnte nicht erstellt werden' });
  }
});

/**
 * PUT /api/admin/cosmetics/:id
 * Update a cosmetic product by ID.
 */
adminRouter.put('/cosmetics/:id', async (req, res) => {
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

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin update cosmetic failed:', err);
    res.status(500).json({ error: 'Kosmetik-Produkt konnte nicht aktualisiert werden' });
  }
});

/**
 * DELETE /api/admin/cosmetics/:id
 * Delete a cosmetic product by ID.
 */
adminRouter.delete('/cosmetics/:id', async (req, res) => {
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

    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete cosmetic failed:', err);
    res.status(500).json({ error: 'Kosmetik-Produkt konnte nicht geloescht werden' });
  }
});

// ---------------------------------------------------------------------------
// Card Artworks
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/cards/:id/artworks
 * List all artworks for a card from the card_artworks table.
 */
adminRouter.get('/cards/:id/artworks', async (req, res) => {
  try {
    const cardId = parseInt(req.params.id, 10);
    if (isNaN(cardId)) {
      res.status(400).json({ error: 'Ungueltige Karten-ID' });
      return;
    }

    const result = await pool.query(
      `SELECT ca.artwork_id AS "artworkId", ca.label, ca.image_path AS "imagePath", ca.is_default AS "isDefault",
        (SELECT string_agg(cse.set_name, ', ')
         FROM card_set_entries cse
         WHERE cse.card_id = ca.card_id AND cse.artwork_id = ca.artwork_id
        ) AS "availableIn"
       FROM card_artworks ca
       WHERE ca.card_id = $1
       ORDER BY ca.is_default DESC, ca.artwork_id`,
      [cardId]
    );

    console.log(`[ADMIN] user=${req.user!.userId} action=list_artworks target=${cardId} count=${result.rows.length}`);

    res.json(result.rows);
  } catch (err) {
    console.error('Admin list artworks failed:', err);
    res.status(500).json({ error: 'Artworks konnten nicht geladen werden' });
  }
});

/**
 * PUT /api/admin/cards/:id/artworks/:artworkId
 * Update artwork label and/or is_default flag.
 * Body: { label?: string, isDefault?: boolean }
 * If isDefault is set to true, all other artworks for this card are set to false.
 */
adminRouter.put('/cards/:id/artworks/:artworkId', async (req, res) => {
  try {
    const cardId = parseInt(req.params.id, 10);
    const artworkId = parseInt(req.params.artworkId, 10);

    if (isNaN(cardId) || isNaN(artworkId)) {
      res.status(400).json({ error: 'Ungueltige Karten-ID oder Artwork-ID' });
      return;
    }

    const { label, isDefault } = req.body;

    // Verify artwork exists and belongs to this card
    const existing = await pool.query(
      'SELECT id FROM card_artworks WHERE card_id = $1 AND artwork_id = $2',
      [cardId, artworkId]
    );
    if (existing.rows.length === 0) {
      res.status(404).json({ error: 'Artwork nicht gefunden' });
      return;
    }

    // Build dynamic update
    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (label !== undefined) {
      updates.push(`label = $${idx++}`);
      params.push(String(label));
    }
    if (isDefault !== undefined) {
      updates.push(`is_default = $${idx++}`);
      params.push(Boolean(isDefault));
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Keine Felder zum Aktualisieren angegeben' });
      return;
    }

    // If setting this artwork as default, clear default on all other artworks for this card
    if (isDefault === true) {
      await pool.query(
        'UPDATE card_artworks SET is_default = FALSE WHERE card_id = $1 AND artwork_id != $2',
        [cardId, artworkId]
      );
    }

    params.push(cardId, artworkId);
    const result = await pool.query(
      `UPDATE card_artworks SET ${updates.join(', ')}
       WHERE card_id = $${idx} AND artwork_id = $${idx + 1}
       RETURNING artwork_id AS "artworkId", label, image_path AS "imagePath", is_default AS "isDefault"`,
      params
    );

    console.log(`[ADMIN] user=${req.user!.userId} action=update_artwork target=${cardId}/${artworkId}`);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin update artwork failed:', err);
    res.status(500).json({ error: 'Artwork konnte nicht aktualisiert werden' });
  }
});
