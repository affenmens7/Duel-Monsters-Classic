/**
 * User routes — profile, inventory, starter deck choice.
 */

import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { STARTER_DECKS } from '../config/starterDecks.js';

export const userRouter = Router();

userRouter.get('/me', requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT u.id, u.username, u.tag, u.role, u.dp, u.created_at,
            s.duels_played, s.duels_won, s.story_chapter, s.starter_chosen
     FROM users u
     LEFT JOIN user_stats s ON s.user_id = u.id
     WHERE u.id = $1`,
    [req.user!.userId]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'User nicht gefunden' });
    return;
  }

  res.json(result.rows[0]);
});

/**
 * POST /api/user/choose-starter — choose Yugi or Kaiba starter deck.
 * Body: { starter: 'yugi' | 'kaiba' }
 * Gives the user all cards from the deck + creates a ready deck.
 */
userRouter.post('/choose-starter', requireAuth, async (req, res) => {
  try {
    const { starter } = req.body as { starter: string };
    const userId = req.user!.userId;

    if (!starter || !STARTER_DECKS[starter]) {
      res.status(400).json({ error: 'Waehle "yugi" oder "kaiba"' });
      return;
    }

    // Check if already chosen
    const stats = await pool.query('SELECT starter_chosen FROM user_stats WHERE user_id = $1', [userId]);
    if (stats.rows[0]?.starter_chosen) {
      res.status(400).json({ error: 'Starter Deck wurde bereits gewaehlt' });
      return;
    }

    const deck = STARTER_DECKS[starter];

    // Count card quantities
    const counts = new Map<number, number>();
    for (const cardId of deck.cards) {
      counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
    }

    // Add cards to user inventory
    for (const [cardId, qty] of counts) {
      await pool.query(
        `INSERT INTO user_cards (user_id, card_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, card_id) DO UPDATE SET quantity = user_cards.quantity + $3`,
        [userId, cardId, qty]
      );
    }

    // Create the deck
    const deckResult = await pool.query(
      'INSERT INTO decks (user_id, name) VALUES ($1, $2) RETURNING id',
      [userId, deck.name]
    );
    const deckId = deckResult.rows[0].id;

    // Add cards to deck
    for (const [cardId, qty] of counts) {
      await pool.query(
        'INSERT INTO deck_cards (deck_id, card_id, quantity) VALUES ($1, $2, $3)',
        [deckId, cardId, qty]
      );
    }

    // Mark starter as chosen
    await pool.query('UPDATE user_stats SET starter_chosen = $1 WHERE user_id = $2', [starter, userId]);

    res.json({ success: true, starter, deckId: deckResult.rows[0].id, cardsReceived: deck.cards.length });
  } catch {
    res.status(500).json({ error: 'Starter Deck konnte nicht gewaehlt werden' });
  }
});

/**
 * GET /api/user/collection — get all cards the user owns.
 */
userRouter.get('/collection', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT card_id, quantity FROM user_cards WHERE user_id = $1',
      [req.user!.userId]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Sammlung konnte nicht geladen werden' });
  }
});
