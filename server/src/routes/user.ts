/**
 * User routes — profile, inventory.
 */

import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

export const userRouter = Router();

userRouter.get('/me', requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT u.id, u.username, u.tag, u.role, u.dp, u.created_at,
            s.duels_played, s.duels_won, s.story_chapter
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

/**
 * GET /api/user/collection/details — get full card data for owned cards,
 * including quantities and usage across decks.
 * Query params:
 *   excludeDeck (optional) — deck ID to exclude from usage calculation.
 */
userRouter.get('/collection/details', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const excludeDeckParam = req.query.excludeDeck;
    const excludeDeckId = excludeDeckParam ? parseInt(excludeDeckParam as string, 10) : null;

    if (excludeDeckParam && (isNaN(excludeDeckId!) || excludeDeckId! <= 0)) {
      res.status(400).json({ error: 'excludeDeck muss eine gueltige Deck-ID sein' });
      return;
    }

    const result = await pool.query(
      `SELECT c.*, uc.quantity as owned, uc.preferred_artwork_id,
        COALESCE(usage.used, 0) as used_in_decks,
        COALESCE(
          (SELECT JSON_AGG(DISTINCT uca.artwork_id ORDER BY uca.artwork_id)
           FROM user_card_artworks uca
           WHERE uca.user_id = $1 AND uca.card_id = c.id),
          '[]'::json
        ) as unlocked_artworks,
        COALESCE(
          (SELECT JSON_AGG(JSON_BUILD_OBJECT(
             'artworkId', uca2.artwork_id,
             'isGhost', uca2.is_ghost,
             'isMisprint', uca2.is_misprint,
             'misprintData', uca2.misprint_data
           ) ORDER BY uca2.artwork_id)
           FROM user_card_artworks uca2
           WHERE uca2.user_id = $1 AND uca2.card_id = c.id
             AND (uca2.is_ghost = TRUE OR uca2.is_misprint = TRUE)),
          '[]'::json
        ) as artwork_variants
       FROM user_cards uc
       JOIN cards c ON c.id = uc.card_id
       LEFT JOIN (
         SELECT dc.card_id, COUNT(*)::int as used
         FROM deck_cards dc
         JOIN decks d ON d.id = dc.deck_id
         WHERE d.user_id = $1
         AND ($2::int IS NULL OR dc.deck_id != $2)
         GROUP BY dc.card_id
       ) usage ON usage.card_id = c.id
       WHERE uc.user_id = $1
       ORDER BY c.name_en`,
      [userId, excludeDeckId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Load collection failed:', err);
    res.status(500).json({ error: 'Kartendetails konnten nicht geladen werden' });
  }
});

/**
 * PATCH /api/user/collection/:cardId/artwork
 * Set preferred artwork for a card in the user's collection.
 * Body: { artworkId: number }
 * The artwork must be unlocked (in user_card_artworks).
 */
userRouter.patch('/collection/:cardId/artwork', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const cardId = parseInt(req.params.cardId as string, 10);
    const { artworkId } = req.body;

    if (isNaN(cardId) || !artworkId) {
      res.status(400).json({ error: 'cardId und artworkId erforderlich' });
      return;
    }

    // Verify user owns this card
    const owned = await pool.query(
      'SELECT id FROM user_cards WHERE user_id = $1 AND card_id = $2',
      [userId, cardId]
    );
    if (owned.rows.length === 0) {
      res.status(404).json({ error: 'Karte nicht im Besitz' });
      return;
    }

    // Verify artwork is unlocked
    const unlocked = await pool.query(
      'SELECT id FROM user_card_artworks WHERE user_id = $1 AND artwork_id = $2',
      [userId, artworkId]
    );
    if (unlocked.rows.length === 0) {
      res.status(400).json({ error: 'Artwork nicht freigeschaltet' });
      return;
    }

    // Set preferred artwork
    await pool.query(
      'UPDATE user_cards SET preferred_artwork_id = $1 WHERE user_id = $2 AND card_id = $3',
      [artworkId, userId, cardId]
    );

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Artwork konnte nicht gesetzt werden' });
  }
});
