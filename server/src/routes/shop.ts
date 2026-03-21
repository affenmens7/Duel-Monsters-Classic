/**
 * Shop routes -- fully database-driven.
 * Products, rarity rates, and cosmetics are loaded from DB tables
 * (shop_set_config, shop_rarity_rates, shop_cosmetics).
 */

import { Router } from 'express';
import pg from 'pg';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

type PgClient = pg.PoolClient;

export const shopRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/shop/products — public, no auth required
// Returns all shop products grouped by type (boosters, starters, cosmetics).
// ---------------------------------------------------------------------------
shopRouter.get('/products', async (_req, res) => {
  try {
    // Boosters: join card_sets + shop_set_config, count cards per set
    const boostersResult = await pool.query(`
      SELECT
        cs.name        AS "setName",
        cs.code,
        cs.wave,
        COALESCE(sc.shop_active, FALSE) AS "active",
        sc.product_type AS "productType",
        sc.price_pack  AS "pricePack",
        sc.pack_size   AS "packSize",
        sc.desc_de     AS "descDe",
        sc.desc_en     AS "descEn",
        sc.featured,
        sc.showcase_card_ids AS "showcaseCardIds",
        COALESCE(sc.showcase_animated, FALSE) AS "showcaseAnimated",
        sc.ig_release_date AS "igReleaseDate",
        COALESCE(sc.is_event, FALSE) AS "isEvent",
        COALESCE(cnt.card_count, 0)::int AS "cardCount"
      FROM shop_set_config sc
      JOIN card_sets cs ON cs.name = sc.set_name
      LEFT JOIN (
        SELECT set_name, COALESCE(SUM(quantity), COUNT(DISTINCT card_id))::int AS card_count
        FROM card_set_entries
        GROUP BY set_name
      ) cnt ON cnt.set_name = cs.name
      WHERE sc.product_type = 'booster' AND sc.shop_visible = TRUE
      ORDER BY sc.sort_order
    `);

    // Starters: same shape, different product_type
    const startersResult = await pool.query(`
      SELECT
        cs.name        AS "setName",
        cs.code,
        cs.wave,
        COALESCE(sc.shop_active, FALSE) AS "active",
        sc.product_type AS "productType",
        sc.price_pack  AS "pricePack",
        sc.pack_size   AS "packSize",
        sc.desc_de     AS "descDe",
        sc.desc_en     AS "descEn",
        sc.featured,
        sc.showcase_card_ids AS "showcaseCardIds",
        COALESCE(sc.showcase_animated, FALSE) AS "showcaseAnimated",
        sc.ig_release_date AS "igReleaseDate",
        COALESCE(sc.is_event, FALSE) AS "isEvent",
        COALESCE(cnt.card_count, 0)::int AS "cardCount"
      FROM shop_set_config sc
      JOIN card_sets cs ON cs.name = sc.set_name
      LEFT JOIN (
        SELECT set_name, COALESCE(SUM(quantity), COUNT(DISTINCT card_id))::int AS card_count
        FROM card_set_entries
        GROUP BY set_name
      ) cnt ON cnt.set_name = cs.name
      WHERE sc.product_type = 'starter' AND sc.shop_visible = TRUE
      ORDER BY sc.sort_order
    `);

    // Cosmetics
    const cosmeticsResult = await pool.query(`
      SELECT
        item_type   AS "itemType",
        item_id     AS "itemId",
        name_de     AS "nameDe",
        name_en     AS "nameEn",
        desc_de     AS "descDe",
        desc_en     AS "descEn",
        price,
        preview_data AS "previewData",
        available
      FROM shop_cosmetics
      ORDER BY item_type, sort_order
    `);

    // Auto-pick showcase cards for all sets (used as fallback for displays)
    const allProducts = [...boostersResult.rows, ...startersResult.rows];
    const allSetNames = allProducts.map((p: any) => p.setName);

    if (allSetNames.length > 0) {
      const autoResult = await pool.query(
        `SELECT DISTINCT ON (cse.set_name, rarity_rank)
           cse.set_name, COALESCE(cse.artwork_id, cse.card_id) AS card_id
         FROM card_set_entries cse
         JOIN cards c ON c.id = cse.card_id
         CROSS JOIN LATERAL (
           SELECT CASE c.rarity
             WHEN 'Secret Rare' THEN 1 WHEN 'Ultra Rare' THEN 2
             WHEN 'Super Rare' THEN 3 WHEN 'Rare' THEN 4
             ELSE 5 END AS rarity_rank
         ) rr
         WHERE cse.set_name = ANY($1) AND c.frame_type IN ('normal', 'effect', 'fusion', 'ritual')
         ORDER BY cse.set_name, rarity_rank, RANDOM()
         `,
        [allSetNames]
      );

      const autoMap = new Map<string, number[]>();
      for (const row of autoResult.rows as any[]) {
        const list = autoMap.get(row.set_name) ?? [];
        if (list.length < 5) list.push(row.card_id);
        autoMap.set(row.set_name, list);
      }

      for (const product of allProducts as any[]) {
        if (!product.showcaseCardIds || product.showcaseCardIds.length === 0) {
          product.showcaseCardIds = autoMap.get(product.setName) ?? [];
        }
      }
    }

    // Displays: independent products from shop_displays table
    // shop_active = purchasable in shop
    const displaysResult = await pool.query(`
      SELECT
        d.id, d.name, d.price,
        d.desc_de AS "descDe", d.desc_en AS "descEn",
        d.showcase_card_ids AS "showcaseCardIds",
        COALESCE(d.showcase_animated, FALSE) AS "showcaseAnimated",
        d.ig_release_date AS "igReleaseDate",
        COALESCE(d.is_event, FALSE) AS "isEvent",
        COALESCE(d.shop_active, FALSE) AS "active",
        d.wave, d.sort_order AS "sortOrder",
        (SELECT COALESCE(SUM(dc.pack_count), 0)::int
         FROM shop_display_contents dc WHERE dc.display_id = d.id) AS "totalPacks",
        (SELECT COALESCE(SUM(cnt.card_count), 0)::int
         FROM shop_display_contents dc2
         JOIN (SELECT set_name, COUNT(DISTINCT card_id)::int AS card_count
               FROM card_set_entries GROUP BY set_name) cnt
         ON cnt.set_name = dc2.booster_set_name
         WHERE dc2.display_id = d.id) AS "cardCount"
      FROM shop_displays d
      WHERE d.shop_visible = TRUE
      ORDER BY d.sort_order, d.id
    `);

    // Fetch contents for all displays
    const displayIds = displaysResult.rows.map((d: any) => d.id);
    let displayContents: any[] = [];
    if (displayIds.length > 0) {
      const dcResult = await pool.query(`
        SELECT dc.display_id, dc.booster_set_name AS "boosterSetName",
               dc.pack_count AS "packCount"
        FROM shop_display_contents dc
        WHERE dc.display_id = ANY($1)
      `, [displayIds]);
      displayContents = dcResult.rows;
    }

    const displays = displaysResult.rows.map((d: any) => ({
      ...d,
      contents: displayContents
        .filter((c: any) => c.display_id === d.id)
        .map(({ boosterSetName, packCount }: any) => ({ boosterSetName, packCount })),
    }));

    // Auto-pick showcase cards for displays without manually set ones
    const displaysNeedAuto = displays.filter((d: any) => !d.showcaseCardIds || d.showcaseCardIds.length === 0);
    if (displaysNeedAuto.length > 0) {
      const displayBoosterNames = [...new Set(displaysNeedAuto.flatMap((d: any) => d.contents.map((c: any) => c.boosterSetName)))];
      if (displayBoosterNames.length > 0) {
        const autoDisplayResult = await pool.query(
          `SELECT DISTINCT ON (cse.set_name, rarity_rank)
             cse.set_name, COALESCE(cse.artwork_id, cse.card_id) AS card_id
           FROM card_set_entries cse
           JOIN cards c ON c.id = cse.card_id
           CROSS JOIN LATERAL (
             SELECT CASE c.rarity
               WHEN 'Secret Rare' THEN 1 WHEN 'Ultra Rare' THEN 2
               WHEN 'Super Rare' THEN 3 WHEN 'Rare' THEN 4
               ELSE 5 END AS rarity_rank
           ) rr
           WHERE cse.set_name = ANY($1) AND c.frame_type IN ('normal', 'effect', 'fusion', 'ritual')
           ORDER BY cse.set_name, rarity_rank, RANDOM()`,
          [displayBoosterNames]
        );

        const autoDisplayMap = new Map<string, number[]>();
        for (const row of autoDisplayResult.rows as any[]) {
          const list = autoDisplayMap.get(row.set_name) ?? [];
          if (list.length < 5) list.push(row.card_id);
          autoDisplayMap.set(row.set_name, list);
        }

        for (const display of displaysNeedAuto as any[]) {
          const allCardIds: number[] = [];
          for (const content of display.contents) {
            const cards = autoDisplayMap.get(content.boosterSetName) ?? [];
            for (const cardId of cards) {
              if (!allCardIds.includes(cardId) && allCardIds.length < 5) allCardIds.push(cardId);
            }
          }
          display.showcaseCardIds = allCardIds;
        }
      }
    }

    res.json({
      boosters: boostersResult.rows,
      starters: startersResult.rows,
      displays,
      cosmetics: cosmeticsResult.rows,
    });
  } catch (err) {
    console.error('Failed to load shop products:', err);
    res.status(500).json({ error: 'Shop-Produkte konnten nicht geladen werden' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/shop/featured — public, returns active featured carousel items
// ---------------------------------------------------------------------------
shopRouter.get('/featured', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT sf.id, sf.product_type, sf.product_id,
              sf.title_de, sf.title_en, sf.subtitle_de, sf.subtitle_en,
              sf.image_path, sf.sort_order,
              cs.code AS set_code
       FROM shop_featured sf
       LEFT JOIN card_sets cs ON cs.name = sf.product_id
       WHERE sf.active = TRUE
       ORDER BY sf.sort_order, sf.id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load featured items:', err);
    res.status(500).json({ error: 'Featured-Produkte konnten nicht geladen werden' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/shop/products/:setName — requires auth
// Returns detail for one set: config, rarity rates, and all card IDs.
// ---------------------------------------------------------------------------
shopRouter.get('/products/:setName', requireAuth, async (req, res) => {
  const { setName } = req.params;
  const userId = req.user!.userId;

  try {
    // Set info + config (shop_active = purchasable)
    const setResult = await pool.query(`
      SELECT
        cs.name        AS "setName",
        cs.code,
        cs.wave,
        COALESCE(sc.shop_active, FALSE) AS "active",
        sc.product_type AS "productType",
        sc.price_pack  AS "pricePack",
        sc.pack_size   AS "packSize",
        sc.desc_de     AS "descDe",
        sc.desc_en     AS "descEn",
        sc.featured,
        sc.showcase_card_ids AS "showcaseCardIds",
        COALESCE(sc.showcase_animated, FALSE) AS "showcaseAnimated",
        sc.ig_release_date AS "igReleaseDate",
        COALESCE(cnt.card_count, 0)::int AS "cardCount"
      FROM shop_set_config sc
      JOIN card_sets cs ON cs.name = sc.set_name
      LEFT JOIN (
        SELECT set_name, COALESCE(SUM(quantity), COUNT(DISTINCT card_id))::int AS card_count
        FROM card_set_entries
        GROUP BY set_name
      ) cnt ON cnt.set_name = cs.name
      WHERE cs.name = $1
    `, [setName]);

    if (setResult.rows.length === 0) {
      res.status(404).json({ error: 'Set nicht gefunden' });
      return;
    }

    // Rarity rates for the set
    const rarityResult = await pool.query(`
      SELECT rarity, rate_pct AS "ratePct"
      FROM shop_rarity_rates
      WHERE set_name = $1
      ORDER BY sort_order
    `, [setName]);

    // All unique cards in this set with rarity info + user ownership (rarity from cards table)
    const cardsResult = await pool.query(`
      SELECT DISTINCT ON (cse.card_id)
        cse.card_id     AS "cardId",
        c.rarity,
        c.rarity_code   AS "rarityCode",
        cse.artwork_id  AS "artworkId",
        COALESCE(uc.quantity, 0)::int AS "owned"
      FROM card_set_entries cse
      JOIN cards c ON c.id = cse.card_id
      LEFT JOIN user_cards uc ON uc.card_id = cse.card_id AND uc.user_id = $2
      WHERE cse.set_name = $1
      ORDER BY cse.card_id
    `, [setName, userId]);

    res.json({
      set: setResult.rows[0],
      rarityRates: rarityResult.rows,
      cards: cardsResult.rows,
    });
  } catch (err) {
    console.error('Failed to load set detail:', err);
    res.status(500).json({ error: 'Set-Details konnten nicht geladen werden' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/shop/buy — requires auth
// Body: { productId: string, productType: 'booster' | 'display' | 'starter' | 'cosmetic' }
// productId is the set_name (for packs/starters) or item_id (for cosmetics).
// ---------------------------------------------------------------------------
shopRouter.post('/buy', requireAuth, async (req, res) => {
  const { productId, productType, quantity: rawQty } = req.body;
  const quantity = productType === 'booster' ? Math.max(1, Math.floor(Number(rawQty) || 1)) : 1;
  const userId = req.user!.userId;

  if (!productId || !productType) {
    res.status(400).json({ error: 'productId und productType erforderlich' });
    return;
  }

  const validTypes = ['booster', 'display', 'starter', 'cosmetic'];
  if (!validTypes.includes(productType)) {
    res.status(400).json({ error: 'Ungueltiger productType' });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock user row and read current DP
    const userResult = await client.query(
      'SELECT dp FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'User nicht gefunden' });
      return;
    }

    const currentDp: number = userResult.rows[0].dp;

    // --- Cosmetic purchase ---
    if (productType === 'cosmetic') {
      const cosmeticResult = await client.query(
        'SELECT item_type, price, available FROM shop_cosmetics WHERE item_id = $1',
        [productId]
      );

      if (cosmeticResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Kosmetik-Produkt nicht gefunden' });
        return;
      }

      const cosmetic = cosmeticResult.rows[0];
      if (!cosmetic.available) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Produkt nicht verfuegbar' });
        return;
      }

      if (currentDp < cosmetic.price) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Nicht genug DP' });
        return;
      }

      // Prevent double-buy
      const existingItem = await client.query(
        `SELECT id FROM user_items
         WHERE user_id = $1 AND item_id = $2`,
        [userId, productId]
      );
      if (existingItem.rows.length > 0) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Bereits gekauft' });
        return;
      }

      // Deduct DP
      await client.query(
        'UPDATE users SET dp = dp - $1 WHERE id = $2',
        [cosmetic.price, userId]
      );

      const itemType = cosmetic.item_type;

      await client.query(
        `INSERT INTO user_items (user_id, item_type, item_id)
         VALUES ($1, $2, $3)`,
        [userId, itemType, productId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        type: 'cosmetic',
        productId,
        dpRemaining: currentDp - cosmetic.price,
      });
      return;
    }

    // --- Display purchase (independent product) ---
    if (productType === 'display') {
      const displayId = parseInt(productId, 10);
      if (isNaN(displayId)) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Ungueltige Display-ID' });
        return;
      }

      const displayResult = await client.query(
        'SELECT id, price, shop_active FROM shop_displays WHERE id = $1',
        [displayId]
      );
      if (displayResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({ error: 'Display nicht gefunden' });
        return;
      }

      const display = displayResult.rows[0];
      if (!display.shop_active) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Display nicht verfuegbar' });
        return;
      }

      if (currentDp < display.price) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Nicht genug DP' });
        return;
      }

      // Deduct DP
      await client.query(
        'UPDATE users SET dp = dp - $1 WHERE id = $2',
        [display.price, userId]
      );

      // Load display contents (which booster sets, how many packs each)
      const contentsResult = await client.query(
        `SELECT dc.booster_set_name, dc.pack_count,
                COALESCE(sc.pack_size, 5) AS pack_size
         FROM shop_display_contents dc
         JOIN shop_set_config sc ON sc.set_name = dc.booster_set_name
         WHERE dc.display_id = $1`,
        [displayId]
      );

      const pulledCards: PulledCard[] = [];
      for (const content of contentsResult.rows as any[]) {
        for (let i = 0; i < content.pack_count; i++) {
          const packCards = await openBoosterPack(client, content.booster_set_name, content.pack_size);
          pulledCards.push(...packCards);
        }
      }

      // Add cards to user collection + unlock artworks
      await addCardsToCollection(client, userId, pulledCards);
      await client.query('COMMIT');

      res.json({
        success: true,
        type: 'display',
        cards: pulledCards.map((c) => c.cardId),
        pulledCards,
        dpRemaining: currentDp - display.price,
      });
      return;
    }

    // --- Pack / starter purchase ---
    const configResult = await client.query(
      `SELECT product_type, price_pack, pack_size, shop_active
       FROM shop_set_config
       WHERE set_name = $1`,
      [productId]
    );

    if (configResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Set nicht im Shop konfiguriert' });
      return;
    }

    const config = configResult.rows[0];

    if (!config.shop_active) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Produkt nicht verfuegbar' });
      return;
    }

    const price: number = config.price_pack;
    const totalCost = price * quantity;

    if (currentDp < totalCost) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Nicht genug DP' });
      return;
    }

    // Deduct DP
    await client.query(
      'UPDATE users SET dp = dp - $1 WHERE id = $2',
      [totalCost, userId]
    );

    let pulledCards: PulledCard[];

    if (productType === 'starter') {
      // Starter deck: give ALL cards in the set
      pulledCards = await getStarterDeckCards(client, productId);
    } else {
      // Booster packs: open N packs
      const packSize = config.pack_size ?? 5;
      const allPulled: PulledCard[] = [];
      for (let i = 0; i < quantity; i++) {
        const pack = await openBoosterPack(client, productId, packSize);
        allPulled.push(...pack);
      }
      pulledCards = allPulled;
    }

    // Add cards to user collection + unlock artworks
    await addCardsToCollection(client, userId, pulledCards);

    await client.query('COMMIT');

    res.json({
      success: true,
      type: productType,
      cards: pulledCards.map((c) => c.cardId),
      pulledCards,
      dpRemaining: currentDp - totalCost,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Purchase failed:', err);
    res.status(500).json({ error: 'Kauf fehlgeschlagen' });
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// Helper: open a booster pack using weighted rarity selection
// ---------------------------------------------------------------------------
interface PulledCard {
  cardId: number;
  artworkId: number;
  rarity: string;
  isGhost: boolean;
  isMisprint: boolean;
  misprintData: object | null;
}

// Rarities eligible for Ghost Rare roll
const GHOST_ELIGIBLE = new Set(['Super Rare', 'Ultra Rare', 'Secret Rare']);
const GHOST_CHANCE = 1 / 1024;
const MISPRINT_CHANCE = 1 / 4096;

async function openBoosterPack(
  client: PgClient,
  setName: string,
  packSize: number,
): Promise<PulledCard[]> {
  // Load rarity rates for this set
  const ratesResult = await client.query(
    `SELECT rarity, rate_pct FROM shop_rarity_rates WHERE set_name = $1`,
    [setName]
  );

  // Load all cards grouped by rarity (rarity from cards table)
  const cardsResult = await client.query(
    `SELECT cse.card_id, c.rarity, cse.artwork_id,
            COALESCE(cse.is_ghost, FALSE) AS is_ghost_forced,
            COALESCE(cse.is_misprint, FALSE) AS is_misprint_forced
     FROM card_set_entries cse
     JOIN cards c ON c.id = cse.card_id
     WHERE cse.set_name = $1`,
    [setName]
  );

  if (cardsResult.rows.length === 0) {
    throw new Error(`No cards found in set: ${setName}`);
  }

  // Group cards by rarity (store card_id + artwork_id + forced ghost/misprint flags)
  const cardsByRarity: Record<string, Array<{ cardId: number; artworkId: number; rarity: string; isGhostForced: boolean; isMisprintForced: boolean }>> = {};
  for (const row of cardsResult.rows) {
    const rarity = row.rarity ?? 'Common';
    if (!cardsByRarity[rarity]) {
      cardsByRarity[rarity] = [];
    }
    cardsByRarity[rarity].push({
      cardId: row.card_id,
      artworkId: row.artwork_id ?? row.card_id,
      rarity,
      isGhostForced: row.is_ghost_forced,
      isMisprintForced: row.is_misprint_forced,
    });
  }

  // Build weighted rarity tiers from DB rates
  const rarityTiers: Array<{ rarity: string; weight: number }> = [];
  for (const row of ratesResult.rows) {
    rarityTiers.push({ rarity: row.rarity, weight: parseFloat(row.rate_pct) });
  }

  // If no rarity rates configured, fall back to uniform random
  if (rarityTiers.length === 0) {
    const allCards = cardsResult.rows.map((r: any) => ({
      cardId: r.card_id, artworkId: r.artwork_id ?? r.card_id, rarity: r.rarity ?? 'Common',
      isGhostForced: r.is_ghost_forced, isMisprintForced: r.is_misprint_forced,
    }));
    return pickRandomCards(allCards, packSize).map(applyBonusRolls);
  }

  const totalWeight = rarityTiers.reduce((sum, t) => sum + t.weight, 0);

  const pulled: PulledCard[] = [];
  for (let i = 0; i < packSize; i++) {
    // Pick a rarity tier via weighted random
    const roll = Math.random() * totalWeight;
    let cumulative = 0;
    let chosenRarity = rarityTiers[0].rarity;
    for (const tier of rarityTiers) {
      cumulative += tier.weight;
      if (roll < cumulative) {
        chosenRarity = tier.rarity;
        break;
      }
    }

    // Pick a random card from that rarity tier
    const pool = cardsByRarity[chosenRarity];
    let card: { cardId: number; artworkId: number; rarity: string; isGhostForced: boolean; isMisprintForced: boolean };
    if (pool && pool.length > 0) {
      card = pool[Math.floor(Math.random() * pool.length)];
    } else {
      const allCards = cardsResult.rows.map((r: any) => ({
        cardId: r.card_id, artworkId: r.artwork_id ?? r.card_id, rarity: r.rarity ?? 'Common',
        isGhostForced: r.is_ghost_forced, isMisprintForced: r.is_misprint_forced,
      }));
      card = allCards[Math.floor(Math.random() * allCards.length)];
    }

    pulled.push(applyBonusRolls(card));
  }

  return pulled;
}

// Roll for Ghost Rare and Misprint bonuses (independent rolls, skip if admin-forced)
function applyBonusRolls(card: { cardId: number; artworkId: number; rarity: string; isGhostForced?: boolean; isMisprintForced?: boolean }): PulledCard {
  const isGhost = card.isGhostForced
    ? true
    : GHOST_ELIGIBLE.has(card.rarity) && Math.random() < GHOST_CHANCE;
  const isMisprint = card.isMisprintForced
    ? true
    : Math.random() < MISPRINT_CHANCE;
  return {
    cardId: card.cardId,
    artworkId: card.artworkId,
    rarity: card.rarity,
    isGhost,
    isMisprint,
    misprintData: isMisprint ? generateMisprintData() : null,
  };
}

// Generate random misprint distortion data (stored permanently as JSONB)
function generateMisprintData(): object {
  const r = (min: number, max: number) => Math.random() * (max - min) + min;
  const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  // Always: shift + ghost-double. Plus 1-3 random extras.
  const extras = ['print-lines', 'print-lines-cross', 'glitch-band', 'ink-bleed', 'scratch'];
  const shuffled = extras.sort(() => Math.random() - 0.5);
  const extraCount = Math.floor(r(1, 4));
  const defects = ['heavy-shift', 'ghost-double', ...shuffled.slice(0, extraCount)];

  const data: Record<string, any> = { defects };

  // Base filter (minimal color distortion)
  data.baseHue = r(-8, 8);
  data.baseSat = r(0.85, 1.15);
  data.baseBrt = r(0.92, 1.08);

  // Heavy shift
  data.shiftX = r(-15, 15);
  data.shiftY = r(-12, 12);
  data.shiftOpacity = r(0.25, 0.55);
  data.shiftHue = r(-15, 15);

  // Ghost double
  data.ghostOpacity = r(0.15, 0.4);
  data.ghostTranslateX = r(-18, 18);
  data.ghostTranslateY = r(-14, 14);
  data.ghostScale = r(1.03, 1.12);
  data.ghostSkew = r(-8, 8);
  data.ghostRotate = r(-5, 5);
  data.ghostBlur = r(0.5, 3);
  data.ghostBrt = r(1.0, 1.4);
  data.ghostCon = r(0.5, 0.9);

  for (const defect of defects) {
    switch (defect) {
      case 'print-lines': {
        data.linesAngle = pick([0, 90, 45, -45, 30, -30]);
        data.linesSpacing = r(6, 25);
        data.linesWidth = r(0.5, 3);
        data.linesGlittery = Math.random() < 0.5;
        data.linesColorR = r(180, 255);
        data.linesColorG = r(180, 255);
        data.linesColorB = r(200, 255);
        data.linesAlpha = r(0.06, 0.2);
        data.linesOpacity = r(0.6, 1);
        break;
      }
      case 'print-lines-cross': {
        data.linesAngle = pick([0, 45, -45, 30]);
        data.linesAngle2 = data.linesAngle + pick([60, 90, 45]);
        data.linesSpacing = r(8, 20);
        data.linesSpacing2 = r(10, 30);
        data.linesAlpha = r(0.06, 0.15);
        data.linesAlpha2 = r(0.08, 0.2);
        data.linesOpacity = r(0.5, 1);
        data.linesGlittery = true;
        break;
      }
      case 'glitch-band': {
        data.glitch1Y = r(8, 80);
        data.glitch1H = r(3, 12);
        data.glitch1Bg = pick(['rgba(255,255,255,0.2)', 'rgba(200,200,255,0.25)', 'rgba(255,200,255,0.2)']);
        data.glitch1Opacity = r(0.5, 1);
        data.glitch1Skew = r(-20, 20);
        data.glitch1Blend = pick(['screen', 'overlay', 'color-dodge']);
        data.glitch2Y = r(15, 85);
        data.glitch2H = r(1, 8);
        data.glitch2Opacity = r(0.4, 0.9);
        data.glitch2Skew = r(-12, 12);
        break;
      }
      case 'ink-bleed': {
        data.inkColor = pick(['rgba(200,200,255,0.3)', 'rgba(180,220,255,0.25)', 'rgba(255,220,255,0.25)']);
        data.inkW = r(50, 120);
        data.inkH = r(50, 140);
        data.inkX = r(5, 65);
        data.inkY = r(10, 70);
        data.inkRot = r(-45, 45);
        break;
      }
      case 'scratch': {
        data.scratchY = r(10, 80);
        data.scratchRot = r(-12, 12);
        data.scratchH = pick([1, 2, 3, 4]);
        break;
      }
    }
  }

  return data;
}

// ---------------------------------------------------------------------------
// Helper: get all card IDs from a starter deck set
// ---------------------------------------------------------------------------
async function getStarterDeckCards(
  client: PgClient,
  setName: string,
): Promise<PulledCard[]> {
  const result = await client.query(
    `SELECT cse.card_id, cse.artwork_id, COALESCE(cse.quantity, 1) AS quantity, c.rarity
     FROM card_set_entries cse
     JOIN cards c ON c.id = cse.card_id
     WHERE cse.set_name = $1`,
    [setName]
  );
  const cards: PulledCard[] = [];
  for (const r of result.rows as any[]) {
    const base = { cardId: r.card_id, artworkId: r.artwork_id ?? r.card_id, rarity: r.rarity ?? 'Common' };
    for (let i = 0; i < r.quantity; i++) {
      cards.push(applyBonusRolls(base));
    }
  }
  return cards;
}

// ---------------------------------------------------------------------------
// Helper: add cards to a user's collection (upserts quantities)
// ---------------------------------------------------------------------------
async function addCardsToCollection(
  client: PgClient,
  userId: number,
  cards: PulledCard[],
) {
  for (const { cardId, artworkId, isGhost, isMisprint, misprintData } of cards) {
    // Add card to collection — set preferred_artwork_id on first acquisition
    await client.query(
      `INSERT INTO user_cards (user_id, card_id, quantity, preferred_artwork_id)
       VALUES ($1, $2, 1, $3)
       ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = user_cards.quantity + 1`,
      [userId, cardId, artworkId]
    );

    // Always unlock the normal artwork (is_ghost=false, is_misprint=false)
    await client.query(
      `INSERT INTO user_card_artworks (user_id, card_id, artwork_id, source, is_ghost, is_misprint)
       VALUES ($1, $2, $3, 'shop', FALSE, FALSE)
       ON CONFLICT (user_id, artwork_id, is_ghost, is_misprint) DO NOTHING`,
      [userId, cardId, artworkId]
    );

    // If ghost: unlock ghost variant of this artwork
    if (isGhost) {
      await client.query(
        `INSERT INTO user_card_artworks (user_id, card_id, artwork_id, source, is_ghost, is_misprint)
         VALUES ($1, $2, $3, 'shop', TRUE, FALSE)
         ON CONFLICT (user_id, artwork_id, is_ghost, is_misprint) DO NOTHING`,
        [userId, cardId, artworkId]
      );
    }

    // If misprint: unlock misprint variant with unique data
    if (isMisprint) {
      await client.query(
        `INSERT INTO user_card_artworks (user_id, card_id, artwork_id, source, is_ghost, is_misprint, misprint_data)
         VALUES ($1, $2, $3, 'shop', FALSE, TRUE, $4)
         ON CONFLICT (user_id, artwork_id, is_ghost, is_misprint) DO NOTHING`,
        [userId, cardId, artworkId, JSON.stringify(misprintData)]
      );
    }

    // If both ghost+misprint: unlock the combined variant too
    if (isGhost && isMisprint) {
      await client.query(
        `INSERT INTO user_card_artworks (user_id, card_id, artwork_id, source, is_ghost, is_misprint, misprint_data)
         VALUES ($1, $2, $3, 'shop', TRUE, TRUE, $4)
         ON CONFLICT (user_id, artwork_id, is_ghost, is_misprint) DO NOTHING`,
        [userId, cardId, artworkId, JSON.stringify(misprintData)]
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Helper: pick N random elements from an array (with replacement)
// ---------------------------------------------------------------------------
function pickRandomCards(items: Array<{ cardId: number; artworkId: number; rarity: string }>, count: number) {
  const result: Array<{ cardId: number; artworkId: number; rarity: string }> = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * items.length);
    result.push(items[idx]);
  }
  return result;
}
