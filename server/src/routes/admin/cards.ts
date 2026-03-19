/**
 * Admin Cards routes — CRUD for cards, import from YGOPRODeck API, ban management, artworks.
 */

import { Router } from 'express';
import { pool } from '../../config/db.js';
import { bumpDataVersion } from '../../services/versionService.js';

export const cardsRouter = Router();

/** SSRF protection: only allow image downloads from trusted hosts. */
const ALLOWED_IMAGE_HOSTS = ['images.ygoprodeck.com', 'storage.googleapis.com'];
function isSafeImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_IMAGE_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * GET /api/admin/cards
 * Browse all cards in the database with pagination, search and filters.
 * Query params: page (default 1), limit (default 50, max 100),
 *   search (ILIKE on name_de/name_en), frameType (optional), attribute (optional).
 */
cardsRouter.get('/', async (req, res) => {
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
    const sortableColumns = ['name_en', 'name_de', 'frame_type', 'atk', 'def', 'level', 'attribute', 'id', 'ban_status'];
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

    // Fetch paginated results (include default artwork ID)
    const dataParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT c.*,
        (SELECT ca.artwork_id FROM card_artworks ca WHERE ca.card_id = c.id ORDER BY ca.is_default DESC, ca.artwork_id LIMIT 1) AS default_artwork_id
       FROM cards c ${whereClause} ORDER BY ${
        safeSort === 'ban_status'
          ? `CASE ban_status WHEN 'Forbidden' THEN 0 WHEN 'Limited' THEN 1 WHEN 'Semi-Limited' THEN 2 ELSE 3 END`
          : safeSort
       } ${sortDir} NULLS LAST LIMIT $${idx} OFFSET $${idx + 1}`,
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
cardsRouter.post('/', async (req, res) => {
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
    await bumpDataVersion();
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
cardsRouter.put('/:id', async (req, res) => {
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
    await bumpDataVersion();
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update card failed:', err);
    res.status(500).json({ error: 'Karte konnte nicht aktualisiert werden' });
  }
});

/**
 * PATCH /api/admin/cards/:id/ban
 * Updates the ban status for a card.
 * Body: { banStatus: "Forbidden" | "Limited" | "Semi-Limited" | null }
 */
cardsRouter.patch('/:id/ban', async (req, res) => {
  try {
    const cardId = parseInt(req.params.id, 10);
    if (isNaN(cardId)) {
      res.status(400).json({ error: 'Ungueltige Karten-ID' });
      return;
    }

    const { banStatus } = req.body;
    const valid = [null, 'Forbidden', 'Limited', 'Semi-Limited'];
    if (!valid.includes(banStatus)) {
      res.status(400).json({ error: 'Ungueltiger Ban-Status. Erlaubt: Forbidden, Limited, Semi-Limited, null' });
      return;
    }

    const result = await pool.query(
      'UPDATE cards SET ban_status = $1 WHERE id = $2 RETURNING id, ban_status',
      [banStatus, cardId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Karte nicht gefunden' });
      return;
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=set_ban_status target=${cardId} status=${banStatus}`);

    await bumpDataVersion();
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Set ban status failed:', err);
    res.status(500).json({ error: 'Ban-Status konnte nicht gesetzt werden' });
  }
});

/**
 * DELETE /api/admin/cards/:id
 * Deletes a card from the database including all artworks, set entries, and image files.
 */
cardsRouter.delete('/:id', async (req, res) => {
  try {
    const cardId = parseInt(req.params.id, 10);
    if (isNaN(cardId)) {
      res.status(400).json({ error: 'Ungueltige Karten-ID' });
      return;
    }

    // Get artwork IDs before deletion (for file cleanup)
    const artworks = await pool.query(
      'SELECT artwork_id FROM card_artworks WHERE card_id = $1',
      [cardId]
    );
    const artworkIds = artworks.rows.map((r: { artwork_id: number }) => r.artwork_id);

    // Delete card (cascades to card_artworks, card_set_entries, user_cards, deck_cards)
    const result = await pool.query('DELETE FROM cards WHERE id = $1 RETURNING id', [cardId]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Karte nicht gefunden' });
      return;
    }

    // Delete image files
    const fs = await import('fs');
    const path = await import('path');
    const imageDir = path.default.join(process.cwd(), '..', 'public', 'images', 'cards');
    for (const artId of [cardId, ...artworkIds]) {
      const filePath = path.default.join(imageDir, `${artId}.jpg`);
      try { fs.default.unlinkSync(filePath); } catch { /* file may not exist */ }
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=delete_card target=${cardId} artworks=${artworkIds.length}`);

    await bumpDataVersion();
    res.json({ success: true, deletedArtworks: artworkIds.length });
  } catch (err) {
    console.error('Delete card failed:', err);
    res.status(500).json({ error: 'Karte konnte nicht geloescht werden' });
  }
});

/**
 * GET /api/admin/cards/search-api
 * Search YGOPRODeck API for cards (external, not our DB).
 * Used for importing new cards into our database.
 */
cardsRouter.get('/search-api', async (req, res) => {
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
cardsRouter.post('/import', async (req, res) => {
  try {
    const cardId = parseInt(req.body.cardId, 10);
    if (isNaN(cardId) || cardId <= 0 || cardId > 99999999) {
      res.status(400).json({ error: 'cardId muss eine gueltige positive Zahl sein' });
      return;
    }

    // Check if already exists
    const existing = await pool.query('SELECT id FROM cards WHERE id = $1', [cardId]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'Karte bereits importiert' });
      return;
    }

    // Fetch EN by id, then also by fname to get all artworks (API quirk: id returns fewer)
    const enRes = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${cardId}`);
    if (!enRes.ok) {
      res.status(404).json({ error: 'Karte nicht in YGOPRODeck gefunden' });
      return;
    }
    const enData = await enRes.json();
    const enCard = enData.data?.[0];
    if (!enCard) {
      res.status(404).json({ error: 'Kartendaten leer' });
      return;
    }

    // Fetch by exact name to get ALL artworks (fname with exact match returns more card_images)
    let allImages = enCard.card_images ?? [];
    try {
      const fnameRes = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(enCard.name)}`);
      if (fnameRes.ok) {
        const fnameData = await fnameRes.json();
        const fnameCard = fnameData.data?.[0];
        if (fnameCard?.card_images && fnameCard.card_images.length > allImages.length) {
          allImages = fnameCard.card_images;
        }
      }
    } catch { /* fallback to id-based images */ }

    // Fetch DE data for translations
    const deRes = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${cardId}&language=de`);
    const deCard = deRes.ok ? (await deRes.json()).data?.[0] : null;

    // Merge: EN for structure, fname for artworks, DE for translations
    const c = {
      ...enCard,
      card_images: allImages,
    };
    const nameDe = deCard?.name ?? c.misc_info?.[0]?.translated_name ?? c.name;
    const descDe = deCard?.desc ?? c.misc_info?.[0]?.translated_desc ?? c.desc;
    const typeDe = deCard?.type ?? c.type;
    const raceDe = deCard?.race ?? c.race;
    const banStatus = c.banlist_info?.ban_tcg ?? null;

    await pool.query(
      `INSERT INTO cards (id, name_de, name_en, desc_de, desc_en, type_de, type_en, frame_type, atk, def, level, race_de, race_en, attribute, archetype, image_path, ban_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [c.id, nameDe, c.name, descDe, c.desc, typeDe, c.type, c.frameType, c.atk ?? null, c.def ?? null, c.level ?? null, raceDe, c.race, c.attribute ?? null, c.archetype ?? null, `/images/cards/${c.id}.jpg`, banStatus]
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

      // Download image (SSRF-safe: only allow trusted hosts)
      try {
        if (!isSafeImageUrl(artwork.image_url)) {
          console.warn(`[ADMIN] Skipping untrusted image URL: ${artwork.image_url}`);
          continue;
        }
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
    await bumpDataVersion();
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
/**
 * GET /api/admin/cards/:id/artworks
 * List all artworks for a card from the card_artworks table.
 */
cardsRouter.get('/:id/artworks', async (req, res) => {
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
cardsRouter.put('/:id/artworks/:artworkId', async (req, res) => {
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

    await bumpDataVersion();
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin update artwork failed:', err);
    res.status(500).json({ error: 'Artwork konnte nicht aktualisiert werden' });
  }
});
