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
        cs.active,
        sc.price_pack  AS "pricePack",
        sc.price_display AS "priceDisplay",
        sc.pack_size   AS "packSize",
        sc.display_size AS "displaySize",
        sc.desc_de     AS "descDe",
        sc.desc_en     AS "descEn",
        sc.featured,
        cs.image_path  AS "imagePath",
        COALESCE(cnt.card_count, 0)::int AS "cardCount"
      FROM shop_set_config sc
      JOIN card_sets cs ON cs.name = sc.set_name
      LEFT JOIN (
        SELECT set_name, COUNT(DISTINCT card_id)::int AS card_count
        FROM card_set_entries
        GROUP BY set_name
      ) cnt ON cnt.set_name = cs.name
      WHERE sc.product_type = 'booster'
      ORDER BY sc.sort_order
    `);

    // Starters: same shape, different product_type
    const startersResult = await pool.query(`
      SELECT
        cs.name        AS "setName",
        cs.code,
        cs.wave,
        cs.active,
        sc.price_pack  AS "pricePack",
        sc.price_display AS "priceDisplay",
        sc.pack_size   AS "packSize",
        sc.display_size AS "displaySize",
        sc.desc_de     AS "descDe",
        sc.desc_en     AS "descEn",
        sc.featured,
        cs.image_path  AS "imagePath",
        COALESCE(cnt.card_count, 0)::int AS "cardCount"
      FROM shop_set_config sc
      JOIN card_sets cs ON cs.name = sc.set_name
      LEFT JOIN (
        SELECT set_name, COUNT(DISTINCT card_id)::int AS card_count
        FROM card_set_entries
        GROUP BY set_name
      ) cnt ON cnt.set_name = cs.name
      WHERE sc.product_type = 'starter'
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
        cs.image_path  AS "imagePath",
        COALESCE(cnt.card_count, 0)::int AS "cardCount"
      FROM shop_set_config sc
      JOIN card_sets cs ON cs.name = sc.set_name
      LEFT JOIN (
        SELECT set_name, COUNT(DISTINCT card_id)::int AS card_count
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

    let pulledCardIds: number[];

    if (productType === 'starter') {
      // Starter deck: give ALL cards in the set
      pulledCardIds = await getStarterDeckCards(client, productId);
    } else if (productType === 'display') {
      // Display: open displaySize packs
      const packCount = config.display_size ?? 24;
      const packSize = config.pack_size ?? 5;
      pulledCardIds = [];
      for (let i = 0; i < packCount; i++) {
        const packCards = await openBoosterPack(client, productId, packSize);
        pulledCardIds.push(...packCards);
      }
    } else {
      // Single booster pack
      const packSize = config.pack_size ?? 5;
      pulledCardIds = await openBoosterPack(client, productId, packSize);
    }

    // Add cards to user collection
    await addCardsToCollection(client, userId, pulledCardIds);

    await client.query('COMMIT');

    res.json({
      success: true,
      type: productType,
      cards: pulledCardIds,
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
async function openBoosterPack(
  client: PgClient,
  setName: string,
  packSize: number,
): Promise<number[]> {
  // Load rarity rates for this set
  const ratesResult = await client.query(
    `SELECT rarity, rate_pct FROM shop_rarity_rates WHERE set_name = $1`,
    [setName]
  );

  // Load all cards grouped by rarity
  const cardsResult = await client.query(
    `SELECT card_id, rarity FROM card_set_entries WHERE set_name = $1`,
    [setName]
  );

  if (cardsResult.rows.length === 0) {
    throw new Error(`No cards found in set: ${setName}`);
  }

  // Group cards by rarity
  const cardsByRarity: Record<string, number[]> = {};
  for (const row of cardsResult.rows) {
    const rarity = row.rarity ?? 'Common';
    if (!cardsByRarity[rarity]) {
      cardsByRarity[rarity] = [];
    }
    cardsByRarity[rarity].push(row.card_id);
  }

  // Build weighted rarity tiers from DB rates
  const rarityTiers: Array<{ rarity: string; weight: number }> = [];
  for (const row of ratesResult.rows) {
    rarityTiers.push({ rarity: row.rarity, weight: parseFloat(row.rate_pct) });
  }

  // If no rarity rates configured, fall back to uniform random
  if (rarityTiers.length === 0) {
    const allCardIds = cardsResult.rows.map((r: { card_id: number }) => r.card_id);
    return pickRandom(allCardIds, packSize);
  }

  const totalWeight = rarityTiers.reduce((sum, t) => sum + t.weight, 0);

  const pulled: number[] = [];
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
      const allCardIds = cardsResult.rows.map((r: { card_id: number }) => r.card_id);
      const idx = Math.floor(Math.random() * allCardIds.length);
      pulled.push(allCardIds[idx]);
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
): Promise<number[]> {
  const result = await client.query(
    'SELECT card_id FROM card_set_entries WHERE set_name = $1',
    [setName]
  );
  return result.rows.map((r: { card_id: number }) => r.card_id);
}

// ---------------------------------------------------------------------------
// Helper: add cards to a user's collection (upserts quantities)
// ---------------------------------------------------------------------------
async function addCardsToCollection(
  client: PgClient,
  userId: number,
  cardIds: number[],
) {
  for (const cardId of cardIds) {
    await client.query(
      `INSERT INTO user_cards (user_id, card_id, quantity)
       VALUES ($1, $2, 1)
       ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = user_cards.quantity + 1`,
      [userId, cardId]
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: pick N random elements from an array (with replacement)
// ---------------------------------------------------------------------------
function pickRandom(items: number[], count: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * items.length);
    result.push(items[idx]);
  }
  return result;
}
