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
// Auto-activation: activate sets whose game_release_date has been reached.
// Runs at most once per hour (checked on every GET /products request).
// ---------------------------------------------------------------------------
let lastAutoActivateCheck = 0;
async function checkAutoActivation() {
  const now = Date.now();
  if (now - lastAutoActivateCheck < 3600000) return; // once per hour
  lastAutoActivateCheck = now;
  try {
    const result = await pool.query(`
      UPDATE card_sets cs SET active = TRUE
      FROM shop_set_config sc
      WHERE sc.set_name = cs.name
        AND sc.game_release_date IS NOT NULL
        AND sc.game_release_date <= CURRENT_DATE
        AND cs.active = FALSE
    `);
    if (result.rowCount && result.rowCount > 0) {
      console.log(`[AUTO-RELEASE] Activated ${result.rowCount} set(s)`);
      await pool.query('UPDATE data_version SET version = version + 1, updated_at = NOW() WHERE id = 1');
    }
  } catch (err) {
    console.error('[AUTO-RELEASE] Check failed:', err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/shop/products — public, no auth required
// Returns all shop products grouped by type (boosters, starters, cosmetics).
// ---------------------------------------------------------------------------
shopRouter.get('/products', async (_req, res) => {
  await checkAutoActivation();
  try {
    // Boosters: join card_sets + shop_set_config, count cards per set
    const boostersResult = await pool.query(`
      SELECT
        cs.name        AS "setName",
        cs.code,
        cs.wave,
        cs.active,
        sc.product_type AS "productType",
        sc.price_pack  AS "pricePack",
        sc.price_display AS "priceDisplay",
        sc.pack_size   AS "packSize",
        sc.display_size AS "displaySize",
        sc.desc_de     AS "descDe",
        sc.desc_en     AS "descEn",
        sc.featured,
        sc.showcase_card_ids AS "showcaseCardIds",
        COALESCE(sc.showcase_animated, FALSE) AS "showcaseAnimated",
        sc.display_showcase_card_ids AS "displayShowcaseCardIds",
        COALESCE(sc.display_showcase_animated, FALSE) AS "displayShowcaseAnimated",
        sc.game_release_date AS "gameReleaseDate",
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
        cs.active,
        sc.product_type AS "productType",
        sc.price_pack  AS "pricePack",
        sc.price_display AS "priceDisplay",
        sc.pack_size   AS "packSize",
        sc.display_size AS "displaySize",
        sc.desc_de     AS "descDe",
        sc.desc_en     AS "descEn",
        sc.featured,
        sc.showcase_card_ids AS "showcaseCardIds",
        COALESCE(sc.showcase_animated, FALSE) AS "showcaseAnimated",
        sc.display_showcase_card_ids AS "displayShowcaseCardIds",
        COALESCE(sc.display_showcase_animated, FALSE) AS "displayShowcaseAnimated",
        sc.game_release_date AS "gameReleaseDate",
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
           cse.set_name, cse.card_id
         FROM card_set_entries cse
         JOIN cards c ON c.id = cse.card_id
         CROSS JOIN LATERAL (
           SELECT CASE cse.rarity
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
        // Fill showcaseCardIds if empty
        if (!product.showcaseCardIds || product.showcaseCardIds.length === 0) {
          product.showcaseCardIds = autoMap.get(product.setName) ?? [];
        }
        // Always provide auto-picked 5 cards for display mode
        product.autoShowcaseCardIds = autoMap.get(product.setName) ?? [];
      }
    }

    res.json({
      boosters: boostersResult.rows,
      starters: startersResult.rows,
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
    // Set info + config
    const setResult = await pool.query(`
      SELECT
        cs.name        AS "setName",
        cs.code,
        cs.wave,
        cs.active,
        sc.product_type AS "productType",
        sc.price_pack  AS "pricePack",
        sc.price_display AS "priceDisplay",
        sc.pack_size   AS "packSize",
        sc.display_size AS "displaySize",
        sc.desc_de     AS "descDe",
        sc.desc_en     AS "descEn",
        sc.featured,
        sc.showcase_card_ids AS "showcaseCardIds",
        COALESCE(sc.showcase_animated, FALSE) AS "showcaseAnimated",
        sc.display_showcase_card_ids AS "displayShowcaseCardIds",
        COALESCE(sc.display_showcase_animated, FALSE) AS "displayShowcaseAnimated",
        sc.game_release_date AS "gameReleaseDate",
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

    // All unique cards in this set with rarity info + user ownership
    const cardsResult = await pool.query(`
      SELECT DISTINCT ON (cse.card_id)
        cse.card_id     AS "cardId",
        cse.rarity,
        cse.rarity_code AS "rarityCode",
        cse.artwork_id  AS "artworkId",
        COALESCE(uc.quantity, 0)::int AS "owned"
      FROM card_set_entries cse
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
  const { productId, productType } = req.body;
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

    // --- Pack / starter / display purchase ---
    // Load config from shop_set_config
    const configResult = await client.query(
      `SELECT product_type, price_pack, price_display, pack_size, display_size
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

    // Determine the actual price based on purchase type
    let price: number;
    if (productType === 'display') {
      if (config.price_display == null) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Display-Kauf fuer dieses Set nicht verfuegbar' });
        return;
      }
      price = config.price_display;
    } else {
      // booster or starter
      price = config.price_pack;
    }

    if (currentDp < price) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Nicht genug DP' });
      return;
    }

    // Deduct DP
    await client.query(
      'UPDATE users SET dp = dp - $1 WHERE id = $2',
      [price, userId]
    );

    let pulledCards: PulledCard[];

    if (productType === 'starter') {
      // Starter deck: give ALL cards in the set
      pulledCards = await getStarterDeckCards(client, productId);
    } else if (productType === 'display') {
      // Display: open displaySize packs
      const packCount = config.display_size ?? 24;
      const packSize = config.pack_size ?? 5;
      pulledCards = [];
      for (let i = 0; i < packCount; i++) {
        const packCards = await openBoosterPack(client, productId, packSize);
        pulledCards.push(...packCards);
      }
    } else {
      // Single booster pack
      const packSize = config.pack_size ?? 5;
      pulledCards = await openBoosterPack(client, productId, packSize);
    }

    // Add cards to user collection + unlock artworks
    await addCardsToCollection(client, userId, pulledCards);

    await client.query('COMMIT');

    res.json({
      success: true,
      type: productType,
      cards: pulledCards.map((c) => c.cardId),
      pulledCards,
      dpRemaining: currentDp - price,
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
}

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

  // Load all cards grouped by rarity (include artwork_id from set entry)
  const cardsResult = await client.query(
    `SELECT card_id, rarity, artwork_id FROM card_set_entries WHERE set_name = $1`,
    [setName]
  );

  if (cardsResult.rows.length === 0) {
    throw new Error(`No cards found in set: ${setName}`);
  }

  // Group cards by rarity (store card_id + artwork_id)
  const cardsByRarity: Record<string, Array<{ cardId: number; artworkId: number }>> = {};
  for (const row of cardsResult.rows) {
    const rarity = row.rarity ?? 'Common';
    if (!cardsByRarity[rarity]) {
      cardsByRarity[rarity] = [];
    }
    cardsByRarity[rarity].push({ cardId: row.card_id, artworkId: row.artwork_id ?? row.card_id });
  }

  // Build weighted rarity tiers from DB rates
  const rarityTiers: Array<{ rarity: string; weight: number }> = [];
  for (const row of ratesResult.rows) {
    rarityTiers.push({ rarity: row.rarity, weight: parseFloat(row.rate_pct) });
  }

  // If no rarity rates configured, fall back to uniform random
  if (rarityTiers.length === 0) {
    const allCards = cardsResult.rows.map((r: any) => ({ cardId: r.card_id, artworkId: r.artwork_id ?? r.card_id }));
    return pickRandomCards(allCards, packSize);
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
    if (pool && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      pulled.push(pool[idx]);
    } else {
      // Fallback: pick from any rarity if the chosen rarity has no cards
      const allCards = cardsResult.rows.map((r: any) => ({ cardId: r.card_id, artworkId: r.artwork_id ?? r.card_id }));
      const idx = Math.floor(Math.random() * allCards.length);
      pulled.push(allCards[idx]);
    }
  }

  return pulled;
}

// ---------------------------------------------------------------------------
// Helper: get all card IDs from a starter deck set
// ---------------------------------------------------------------------------
async function getStarterDeckCards(
  client: PgClient,
  setName: string,
): Promise<PulledCard[]> {
  const result = await client.query(
    'SELECT card_id, artwork_id, COALESCE(quantity, 1) AS quantity FROM card_set_entries WHERE set_name = $1',
    [setName]
  );
  const cards: PulledCard[] = [];
  for (const r of result.rows as any[]) {
    const entry = { cardId: r.card_id, artworkId: r.artwork_id ?? r.card_id };
    for (let i = 0; i < r.quantity; i++) cards.push(entry);
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
  for (const { cardId, artworkId } of cards) {
    // Add card to collection — set preferred_artwork_id on first acquisition
    await client.query(
      `INSERT INTO user_cards (user_id, card_id, quantity, preferred_artwork_id)
       VALUES ($1, $2, 1, $3)
       ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = user_cards.quantity + 1`,
      [userId, cardId, artworkId]
    );

    // Unlock the artwork for this user (idempotent)
    await client.query(
      `INSERT INTO user_card_artworks (user_id, card_id, artwork_id, source)
       VALUES ($1, $2, $3, 'shop')
       ON CONFLICT (user_id, artwork_id) DO NOTHING`,
      [userId, cardId, artworkId]
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: pick N random elements from an array (with replacement)
// ---------------------------------------------------------------------------
function pickRandomCards(items: PulledCard[], count: number): PulledCard[] {
  const result: PulledCard[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * items.length);
    result.push(items[idx]);
  }
  return result;
}
