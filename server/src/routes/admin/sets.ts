/**
 * Admin Sets routes — CRUD for sets, shop config, rarity rates, and set card management.
 */

import { Router } from 'express';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../../config/db.js';
import { bumpDataVersion } from '../../services/versionService.js';

const __sets_dirname = dirname(fileURLToPath(import.meta.url));
const IMAGE_DIR = resolve(__sets_dirname, '../../../../public/images/cards');
const YGOPRO_API = 'https://db.ygoprodeck.com/api/v7';

function importDelay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const setsRouter = Router();

/**
 * GET /api/admin/sets
 * List all sets with shop config and card counts.
 */
setsRouter.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        cs.name,
        cs.code,
        cs.type,
        cs.wave,
        cs.og_release_date,
        sc.product_type,
        sc.price_pack,
        sc.pack_size,
        sc.desc_de,
        sc.desc_en,
        sc.featured,
        sc.sort_order,
        COALESCE(sc.shop_visible, TRUE) AS shop_visible,
        COALESCE(sc.shop_active, FALSE) AS shop_active,
        sc.showcase_card_ids,
        COALESCE(sc.showcase_animated, FALSE) AS showcase_animated,
        sc.ig_release_date,
        COALESCE(sc.is_event, FALSE) AS is_event,
        COALESCE(cnt.card_count, 0)::int AS card_count,
        (SELECT rw.start_date FROM shop_release_windows rw
         WHERE rw.product_type = sc.product_type AND rw.product_id = cs.name
         AND rw.start_date > CURRENT_DATE ORDER BY rw.start_date LIMIT 1) AS next_release_start,
        (SELECT rw.end_date FROM shop_release_windows rw
         WHERE rw.product_type = sc.product_type AND rw.product_id = cs.name
         AND rw.start_date <= CURRENT_DATE AND (rw.end_date IS NULL OR rw.end_date >= CURRENT_DATE)
         ORDER BY rw.start_date DESC LIMIT 1) AS active_window_end
      FROM card_sets cs
      LEFT JOIN shop_set_config sc ON sc.set_name = cs.name
      LEFT JOIN (
        SELECT set_name, COALESCE(SUM(quantity), COUNT(DISTINCT card_id))::int AS card_count
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

// ---- YGOPRODeck cardsets cache ----
let cachedCardSets: any[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function getYgoproSets(): Promise<any[]> {
  if (cachedCardSets && Date.now() < cacheExpiry) return cachedCardSets;
  const res = await fetch('https://db.ygoprodeck.com/api/v7/cardsets.php');
  if (!res.ok) throw new Error('YGOPRODeck API nicht erreichbar');
  cachedCardSets = await res.json() as any[];
  cacheExpiry = Date.now() + CACHE_TTL;
  return cachedCardSets;
}

/**
 * GET /api/admin/sets/search-api
 * Proxy search for YGOPRODeck card sets. Returns matching sets with already_exists flag.
 */
setsRouter.get('/search-api', async (req, res) => {
  try {
    const search = (req.query.search as string ?? '').toLowerCase().trim();
    const type = req.query.type as string | undefined;

    if (search.length < 2) {
      res.json({ sets: [] });
      return;
    }

    const allSets = await getYgoproSets();

    // Filter by search term and optionally by type heuristic
    let filtered = allSets.filter((s: any) =>
      (s.set_name ?? '').toLowerCase().includes(search) ||
      (s.set_code ?? '').toLowerCase().includes(search)
    );

    if (type === 'starter') {
      filtered = filtered.filter((s: any) => {
        const n = (s.set_name ?? '').toLowerCase();
        return n.includes('starter') || n.includes('structure');
      });
    } else if (type === 'booster') {
      filtered = filtered.filter((s: any) => {
        const n = (s.set_name ?? '').toLowerCase();
        return !n.includes('starter') && !n.includes('structure');
      });
    }

    const limited = filtered.slice(0, 20);

    // Check which sets already exist in our DB
    const names = limited.map((s: any) => s.set_name);
    const existing = names.length > 0
      ? await pool.query(
          `SELECT name FROM card_sets WHERE name = ANY($1)`,
          [names]
        )
      : { rows: [] };
    const existingSet = new Set(existing.rows.map((r: any) => r.name));

    const results = limited.map((s: any) => ({
      set_name: s.set_name,
      set_code: s.set_code ?? '',
      num_of_cards: s.num_of_cards ?? 0,
      tcg_date: s.tcg_date ?? null,
      already_exists: existingSet.has(s.set_name),
    }));

    res.json({ sets: results });
  } catch (err) {
    console.error('Search API sets failed:', err);
    res.status(500).json({ error: 'API-Suche fehlgeschlagen' });
  }
});

/**
 * GET /api/admin/sets/:name/info
 * Returns a single set with shop config and card count (lightweight alternative to GET /sets).
 */
setsRouter.get('/:name/info', async (req, res) => {
  try {
    const { name } = req.params;

    const result = await pool.query(`
      SELECT
        cs.name,
        cs.code,
        cs.type,
        cs.wave,
        cs.og_release_date,
        sc.product_type,
        sc.price_pack,
        sc.pack_size,
        sc.desc_de,
        sc.desc_en,
        sc.featured,
        sc.sort_order,
        sc.ig_release_date,
        COALESCE(sc.is_event, FALSE) AS is_event,
        COALESCE(cnt.card_count, 0)::int AS card_count
      FROM card_sets cs
      LEFT JOIN shop_set_config sc ON sc.set_name = cs.name
      LEFT JOIN (
        SELECT set_name, COALESCE(SUM(quantity), COUNT(DISTINCT card_id))::int AS card_count
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
 * Update set fields: active, wave, og_release_date.
 */
setsRouter.put('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { wave, og_release_date } = req.body;

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

    if (wave !== undefined) {
      updates.push(`wave = $${idx++}`);
      params.push(Number(wave));
    }
    if (og_release_date !== undefined) {
      updates.push(`og_release_date = $${idx++}`);
      params.push(String(og_release_date));
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

    await bumpDataVersion();
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
setsRouter.put('/:name/config', async (req, res) => {
  try {
    const { name } = req.params;
    const {
      price_pack, pack_size,
      desc_de, desc_en, featured, sort_order, shop_visible, showcase_card_ids, showcase_animated,
      ig_release_date, is_event,
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
    if (pack_size !== undefined) {
      updates.push(`pack_size = $${idx++}`);
      params.push(Number(pack_size));
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
    if (shop_visible !== undefined) {
      updates.push(`shop_visible = $${idx++}`);
      params.push(Boolean(shop_visible));
    }
    if (showcase_card_ids !== undefined) {
      updates.push(`showcase_card_ids = $${idx++}`);
      params.push(Array.isArray(showcase_card_ids) ? showcase_card_ids : null);
    }
    if (showcase_animated !== undefined) {
      updates.push(`showcase_animated = $${idx++}`);
      params.push(Boolean(showcase_animated));
    }
    if (ig_release_date !== undefined) {
      updates.push(`ig_release_date = $${idx++}`);
      params.push(ig_release_date === null || ig_release_date === '' ? null : String(ig_release_date));
    }
    if (is_event !== undefined) {
      updates.push(`is_event = $${idx++}`);
      params.push(Boolean(is_event));
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

    await bumpDataVersion();
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin update set config failed:', err);
    res.status(500).json({ error: 'Shop-Konfiguration konnte nicht aktualisiert werden' });
  }
});

/**
 * GET /api/admin/sets/:name/rarities
 * Returns distinct rarities that actually exist in this set's card_set_entries.
 */
setsRouter.get('/:name/rarities', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT c.rarity FROM card_set_entries cse
       JOIN cards c ON c.id = cse.card_id
       WHERE cse.set_name = $1 AND c.rarity IS NOT NULL
       ORDER BY c.rarity`,
      [req.params.name]
    );
    res.json(result.rows.map((r: { rarity: string }) => r.rarity));
  } catch (err) {
    console.error('Failed to load set rarities:', err);
    res.status(500).json({ error: 'Rarities konnten nicht geladen werden' });
  }
});

/**
 * GET /api/admin/sets/:name/rates
 * Fetch rarity rates for a set.
 */
setsRouter.get('/:name/rates', async (req, res) => {
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
setsRouter.put('/:name/rates', async (req, res) => {
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

    await bumpDataVersion();
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
// Set CRUD (create / delete)
// ---------------------------------------------------------------------------

/**
 * POST /api/admin/sets
 * Create a new set with default shop config and rarity rates.
 * Body: { name, code, type, wave, active, og_release_date }
 */
setsRouter.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    const { name, code, type, wave, og_release_date } = req.body;

    if (!name || !code) {
      res.status(400).json({ error: 'Pflichtfelder: name, code' });
      client.release();
      return;
    }

    const setType = type || 'booster';

    await client.query('BEGIN');

    // Insert the set itself
    const setResult = await client.query(
      `INSERT INTO card_sets (name, code, type, wave, og_release_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, code, setType, wave ?? 0, og_release_date ?? null]
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

    await bumpDataVersion();
    res.status(201).json(setResult.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err?.code === '23505') {
      res.status(409).json({ error: 'Set mit diesem Namen existiert bereits' });
    } else {
      console.error('Admin create set failed:', err);
      res.status(500).json({ error: 'Set konnte nicht erstellt werden' });
    }
  } finally {
    client.release();
  }
});

/**
 * POST /api/admin/sets/:name/import-cards
 * Fetch all cards for a set from YGOPRODeck, upsert into DB, download artworks.
 * Skips cards/artworks that already exist. Returns import summary.
 */
setsRouter.post('/:name/import-cards', async (req, res) => {
  const { name } = req.params;

  try {
    const setCheck = await pool.query('SELECT name, code FROM card_sets WHERE name = $1', [name]);
    if (setCheck.rows.length === 0) {
      res.status(404).json({ error: 'Set nicht gefunden' });
      return;
    }

    await mkdir(IMAGE_DIR, { recursive: true });

    // Fetch EN + DE card data in parallel
    const [enRes, deRes] = await Promise.all([
      fetch(`${YGOPRO_API}/cardinfo.php?cardset=${encodeURIComponent(name)}`),
      fetch(`${YGOPRO_API}/cardinfo.php?cardset=${encodeURIComponent(name)}&language=de`),
    ]);

    if (!enRes.ok) {
      res.status(502).json({ error: 'YGOPRODeck API nicht erreichbar' });
      return;
    }

    const enData = await enRes.json();
    const enCards: any[] = enData.data ?? [];
    const deData = deRes.ok ? await deRes.json() : { data: [] };
    const deCards: any[] = deData.data ?? [];

    const deMap = new Map<number, any>();
    for (const c of deCards) deMap.set(c.id, c);

    let cardsInserted = 0;
    let cardsSkipped = 0;
    let artworksInserted = 0;
    let imagesDownloaded = 0;
    let setEntriesCreated = 0;

    for (const c of enCards) {
      let cardId = c.id;
      const de = deMap.get(cardId);
      const nameEn = c.name;
      const nameDe = de?.name ?? c.misc_info?.[0]?.translated_name ?? nameEn;
      const descEn = c.desc;
      const descDe = de?.desc ?? c.misc_info?.[0]?.translated_desc ?? descEn;
      const typeEn = c.type;
      const typeDe = de?.type ?? typeEn;
      const raceEn = c.race;
      const raceDe = de?.race ?? raceEn;
      const banStatus = c.banlist_info?.ban_tcg ?? null;

      // Check if this card ID is actually an artwork variant of an existing card
      const artworkCheck = await pool.query(
        'SELECT card_id FROM card_artworks WHERE artwork_id = $1 AND card_id != $1',
        [cardId]
      );
      if (artworkCheck.rows.length > 0) {
        // This "card" is an alternate artwork — use the parent card for the set entry
        cardId = artworkCheck.rows[0].card_id;
        cardsSkipped++;
      } else {
        // Upsert card (skip if exists)
        const existing = await pool.query('SELECT id FROM cards WHERE id = $1', [cardId]);
        if (existing.rows.length === 0) {
          const cardSetsAll = c.card_sets ?? [];
          const setEntryForRarity = cardSetsAll.find((s: any) => s.set_name === name);
          const initRarity = setEntryForRarity?.set_rarity ?? 'Common';
          const initRarityCode = setEntryForRarity?.set_rarity_code ?? 'C';
          await pool.query(
            `INSERT INTO cards (id, name_de, name_en, desc_de, desc_en, type_de, type_en, frame_type, atk, def, level, race_de, race_en, attribute, archetype, rarity, rarity_code, image_path, ban_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
            [cardId, nameDe, nameEn, descDe, descEn, typeDe, typeEn, c.frameType,
             c.atk ?? null, c.def ?? null, c.level ?? null,
             raceDe, raceEn, c.attribute ?? null, c.archetype ?? null,
             initRarity, initRarityCode,
             `/images/cards/${cardId}.jpg`, banStatus]
          );
          cardsInserted++;
        } else {
          cardsSkipped++;
        }
      }

      // Download ALL artworks
      const images = c.card_images ?? [];
      for (let j = 0; j < images.length; j++) {
        const img = images[j];
        const artworkId = img.id;
        const isDefault = j === 0;
        const label = j === 0 ? 'Original' : `Artwork ${j + 1}`;

        const artResult = await pool.query(
          `INSERT INTO card_artworks (card_id, artwork_id, label, image_path, is_default)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (artwork_id) DO NOTHING
           RETURNING id`,
          [cardId, artworkId, label, `/images/cards/${artworkId}.jpg`, isDefault]
        );
        if (artResult.rowCount && artResult.rowCount > 0) artworksInserted++;

        // Download image if not on disk
        const destPath = resolve(IMAGE_DIR, `${artworkId}.jpg`);
        if (!existsSync(destPath)) {
          try {
            const imgRes = await fetch(img.image_url);
            if (imgRes.ok) {
              const buffer = Buffer.from(await imgRes.arrayBuffer());
              await writeFile(destPath, buffer);
              imagesDownloaded++;
            }
          } catch { /* skip failed downloads */ }
        }
      }

      // Set entry (no rarity — rarity lives on cards table)
      const cardSets = c.card_sets ?? [];
      const setEntry = cardSets.find((s: any) => s.set_name === name);
      const rarity = setEntry?.set_rarity ?? 'Common';
      const rarityCode = setEntry?.set_rarity_code ?? 'C';
      const setCode = setEntry?.set_code ?? null;
      const defaultArtworkId = images.length > 0 ? images[0].id : null;

      // Update card rarity if this set's rarity is higher (upgrade only)
      const RARITY_PRIORITY: Record<string, number> = {
        'Secret Rare': 0, 'Ultra Rare': 1, 'Super Rare': 2,
        'Rare': 3, 'Short Print': 4, 'Common': 5,
      };
      const existingCard = await pool.query('SELECT rarity FROM cards WHERE id = $1', [cardId]);
      const existingRarity = existingCard.rows[0]?.rarity;
      if (!existingRarity || (RARITY_PRIORITY[rarity] ?? 99) < (RARITY_PRIORITY[existingRarity] ?? 99)) {
        await pool.query(
          'UPDATE cards SET rarity = $1, rarity_code = $2 WHERE id = $3',
          [rarity, rarityCode, cardId]
        );
      }

      await pool.query(
        `INSERT INTO card_set_entries (card_id, set_name, set_code, artwork_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (card_id, set_name) DO UPDATE SET artwork_id = EXCLUDED.artwork_id`,
        [cardId, name, setCode, defaultArtworkId]
      );
      setEntriesCreated++;

      await importDelay(100);
    }

    await bumpDataVersion();

    console.log(`[ADMIN] user=${req.user!.userId} action=import_set_cards target=${name} inserted=${cardsInserted} skipped=${cardsSkipped} artworks=${artworksInserted} images=${imagesDownloaded}`);

    res.json({
      cardsInserted,
      cardsSkipped,
      artworksInserted,
      imagesDownloaded,
      setEntriesCreated,
      totalCards: enCards.length,
    });
  } catch (err) {
    console.error('Import set cards failed:', err);
    res.status(500).json({ error: 'Kartenimport fehlgeschlagen' });
  }
});

/**
 * GET /api/admin/sets/:name/exclusive-cards
 * Returns cards that exist ONLY in this set (not in any other set).
 * Used to preview which cards would be deleted when removing a set.
 */
setsRouter.get('/:name/exclusive-cards', async (req, res) => {
  try {
    const { name } = req.params;
    const result = await pool.query(
      `SELECT c.id, c.name_de, c.name_en, c.frame_type
       FROM card_set_entries cse
       JOIN cards c ON c.id = cse.card_id
       WHERE cse.set_name = $1
       AND NOT EXISTS (
         SELECT 1 FROM card_set_entries other
         WHERE other.card_id = cse.card_id AND other.set_name != $1
       )
       ORDER BY c.name_en`,
      [name]
    );
    res.json({ cards: result.rows, total: result.rows.length });
  } catch (err) {
    console.error('Failed to load exclusive cards:', err);
    res.status(500).json({ error: 'Exklusive Karten konnten nicht geladen werden' });
  }
});

/**
 * DELETE /api/admin/sets/:name
 * Delete a set. Cascades handle card_set_entries, shop_set_config, shop_rarity_rates.
 * Query: ?deleteCards=true — also deletes cards that are exclusive to this set
 *        (cards in other sets are kept, only orphaned cards + their artworks are removed).
 */
setsRouter.delete('/:name', async (req, res) => {
  const client = await pool.connect();

  try {
    const { name } = req.params;
    const deleteCards = req.query.deleteCards === 'true';

    await client.query('BEGIN');

    let cardsDeleted = 0;

    if (deleteCards) {
      // Find cards exclusive to this set (not in any other set)
      const exclusiveCards = await client.query(
        `SELECT cse.card_id FROM card_set_entries cse
         WHERE cse.set_name = $1
         AND NOT EXISTS (
           SELECT 1 FROM card_set_entries other
           WHERE other.card_id = cse.card_id AND other.set_name != $1
         )`,
        [name]
      );

      const exclusiveIds = exclusiveCards.rows.map((r: any) => r.card_id);

      if (exclusiveIds.length > 0) {
        // Delete artworks for exclusive cards
        await client.query(
          'DELETE FROM card_artworks WHERE card_id = ANY($1)',
          [exclusiveIds]
        );
        // Delete the cards themselves
        const delResult = await client.query(
          'DELETE FROM cards WHERE id = ANY($1)',
          [exclusiveIds]
        );
        cardsDeleted = delResult.rowCount ?? 0;
      }
    }

    // Delete the set (cascades: card_set_entries, shop_set_config, shop_rarity_rates)
    const result = await client.query(
      'DELETE FROM card_sets WHERE name = $1 RETURNING name',
      [name]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Set nicht gefunden' });
      return;
    }

    await client.query('COMMIT');

    console.log(`[ADMIN] user=${req.user!.userId} action=delete_set target=${name} cardsDeleted=${cardsDeleted}`);

    await bumpDataVersion();
    res.json({ success: true, cardsDeleted });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Admin delete set failed:', err);
    res.status(500).json({ error: 'Set konnte nicht geloescht werden' });
  } finally {
    client.release();
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
setsRouter.get('/:name/cards', async (req, res) => {
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
        c.ban_status, c.rarity, c.rarity_code, cse.artwork_id, COALESCE(cse.quantity, 1)::int AS quantity,
        COALESCE(cse.is_ghost, FALSE) AS is_ghost, COALESCE(cse.is_misprint, FALSE) AS is_misprint
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
setsRouter.post('/:name/cards', async (req, res) => {
  try {
    const { name } = req.params;
    const { cardId, rarity, rarityCode, artworkId, quantity, isGhost, isMisprint } = req.body;

    if (!cardId) {
      res.status(400).json({ error: 'cardId ist erforderlich' });
      return;
    }

    // Resolve artwork: use provided, or fall back to the card's default artwork
    let resolvedArtworkId = artworkId ?? null;
    if (!resolvedArtworkId) {
      const defaultArt = await pool.query(
        'SELECT artwork_id FROM card_artworks WHERE card_id = $1 AND is_default = TRUE LIMIT 1',
        [cardId]
      );
      resolvedArtworkId = defaultArt.rows[0]?.artwork_id ?? cardId;
    }

    // Update card rarity if provided (rarity lives on cards table, not card_set_entries)
    if (rarity) {
      await pool.query(
        'UPDATE cards SET rarity = $1, rarity_code = $2 WHERE id = $3',
        [rarity, rarityCode ?? null, cardId]
      );
    }

    const result = await pool.query(
      `INSERT INTO card_set_entries (card_id, set_name, artwork_id, quantity, is_ghost, is_misprint)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (card_id, set_name)
       DO UPDATE SET artwork_id = EXCLUDED.artwork_id, quantity = EXCLUDED.quantity, is_ghost = EXCLUDED.is_ghost, is_misprint = EXCLUDED.is_misprint
       RETURNING *`,
      [cardId, name, resolvedArtworkId, quantity ?? 1, isGhost ?? false, isMisprint ?? false]
    );

    console.log(`[ADMIN] user=${req.user!.userId} action=add_set_card target=${name} card=${cardId}`);

    await bumpDataVersion();
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
setsRouter.post('/:name/cards/bulk', async (req, res) => {
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
      const { cardId, rarity, rarityCode, artworkId, quantity, isGhost, isMisprint } = entry;
      if (!cardId) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Jeder Eintrag braucht eine cardId' });
        client.release();
        return;
      }

      // Update card rarity if provided (rarity lives on cards table)
      if (rarity) {
        await client.query(
          'UPDATE cards SET rarity = $1, rarity_code = $2 WHERE id = $3',
          [rarity, rarityCode ?? null, cardId]
        );
      }

      await client.query(
        `INSERT INTO card_set_entries (card_id, set_name, artwork_id, quantity, is_ghost, is_misprint)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (card_id, set_name)
         DO UPDATE SET artwork_id = EXCLUDED.artwork_id, quantity = EXCLUDED.quantity, is_ghost = EXCLUDED.is_ghost, is_misprint = EXCLUDED.is_misprint`,
        [cardId, name, artworkId ?? null, quantity ?? 1, isGhost ?? false, isMisprint ?? false]
      );
    }

    await client.query('COMMIT');

    console.log(`[ADMIN] user=${req.user!.userId} action=bulk_add_set_cards target=${name} count=${cards.length}`);

    await bumpDataVersion();
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
setsRouter.delete('/:name/cards/:cardId', async (req, res) => {
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

    await bumpDataVersion();
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
setsRouter.delete('/:name/cards', async (req, res) => {
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

    await bumpDataVersion();
    res.json({ count: result.rowCount });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Admin bulk remove set cards failed:', err);
    res.status(500).json({ error: 'Karten konnten nicht aus dem Set entfernt werden' });
  } finally {
    client.release();
  }
});
