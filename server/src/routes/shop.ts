/**
 * Shop routes — buy booster packs, starter decks, displays, cosmetics.
 */

import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

export const shopRouter = Router();

// All shop routes require authentication
shopRouter.use(requireAuth);

/**
 * POST /api/shop/buy
 * Body: { productId: string }
 * Deducts DP, adds cards to collection (for packs/decks) or unlocks cosmetic.
 */
shopRouter.post('/buy', async (req, res) => {
  const { productId } = req.body;
  const userId = req.user!.userId;

  if (!productId) {
    res.status(400).json({ error: 'productId erforderlich' });
    return;
  }

  // Get current DP
  const userResult = await pool.query('SELECT dp FROM users WHERE id = $1', [userId]);
  if (userResult.rows.length === 0) {
    res.status(404).json({ error: 'User nicht gefunden' });
    return;
  }

  const currentDp = userResult.rows[0].dp;

  // Product definitions (server-side, not from client)
  const products: Record<string, { price: number; type: string; setName?: string; boosterCount?: number }> = {
    'starter-yugi': { price: 600, type: 'starter-deck', setName: 'Starter Deck: Yugi' },
    'starter-kaiba': { price: 600, type: 'starter-deck', setName: 'Starter Deck: Kaiba' },
    'booster-lob': { price: 120, type: 'booster', setName: 'Legend of Blue Eyes White Dragon' },
    'booster-mrd': { price: 120, type: 'booster', setName: 'Metal Raiders' },
    'display-lob': { price: 2400, type: 'display', setName: 'Legend of Blue Eyes White Dragon', boosterCount: 24 },
    'display-mrd': { price: 2400, type: 'display', setName: 'Metal Raiders', boosterCount: 24 },
    'theme-shadow-realm': { price: 500, type: 'cosmetic' },
    'theme-master-duel': { price: 750, type: 'cosmetic' },
    'theme-egyptian-gold': { price: 500, type: 'cosmetic' },
    'theme-duel-links': { price: 750, type: 'cosmetic' },
  };

  const product = products[productId];
  if (!product) {
    res.status(400).json({ error: 'Produkt nicht gefunden' });
    return;
  }

  if (currentDp < product.price) {
    res.status(400).json({ error: 'Nicht genug DP' });
    return;
  }

  // Deduct DP
  await pool.query('UPDATE users SET dp = dp - $1 WHERE id = $2', [product.price, userId]);

  // Handle purchase based on type
  if (product.type === 'cosmetic') {
    // Just deduct DP — theme unlock is handled client-side via localStorage for now
    res.json({ success: true, type: 'cosmetic', productId, dpRemaining: currentDp - product.price });
    return;
  }

  if (product.type === 'booster') {
    const cards = await openBoosterPack(product.setName!, 5);
    await addCardsToCollection(userId, cards);
    res.json({ success: true, type: 'booster', cards, dpRemaining: currentDp - product.price });
    return;
  }

  if (product.type === 'display') {
    const allCards: number[] = [];
    for (let i = 0; i < (product.boosterCount ?? 24); i++) {
      const packCards = await openBoosterPack(product.setName!, 5);
      allCards.push(...packCards);
    }
    await addCardsToCollection(userId, allCards);
    res.json({ success: true, type: 'display', cards: allCards, dpRemaining: currentDp - product.price });
    return;
  }

  if (product.type === 'starter-deck') {
    const cards = await getStarterDeckCards(product.setName!);
    await addCardsToCollection(userId, cards);
    res.json({ success: true, type: 'starter-deck', cards, dpRemaining: currentDp - product.price });
    return;
  }

  res.status(400).json({ error: 'Unbekannter Produkttyp' });
});

/**
 * GET /api/shop/collection
 * Returns the user's card collection.
 */
shopRouter.get('/collection', async (req, res) => {
  const result = await pool.query(
    'SELECT card_id, quantity FROM user_cards WHERE user_id = $1',
    [req.user!.userId]
  );
  res.json(result.rows);
});

/**
 * Opens a booster pack — returns random card IDs from our own database.
 */
async function openBoosterPack(setName: string, count: number): Promise<number[]> {
  const result = await pool.query(
    'SELECT card_id FROM card_set_entries WHERE set_name = $1',
    [setName]
  );

  const allCards = result.rows.map((r) => r.card_id as number);

  if (allCards.length === 0) {
    throw new Error('Keine Karten in diesem Set gefunden');
  }

  const picked: number[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * allCards.length);
    picked.push(allCards[idx]);
  }

  return picked;
}

/**
 * Returns all card IDs from a starter deck set (from our own database).
 */
async function getStarterDeckCards(setName: string): Promise<number[]> {
  const result = await pool.query(
    'SELECT card_id FROM card_set_entries WHERE set_name = $1',
    [setName]
  );

  return result.rows.map((r) => r.card_id as number);
}

/**
 * Adds cards to a user's collection (upserts quantities).
 */
async function addCardsToCollection(userId: number, cardIds: number[]) {
  for (const cardId of cardIds) {
    await pool.query(
      `INSERT INTO user_cards (user_id, card_id, quantity)
       VALUES ($1, $2, 1)
       ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = user_cards.quantity + 1`,
      [userId, cardId]
    );
  }
}
