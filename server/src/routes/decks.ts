/**
 * Deck routes — create, read, update, delete decks.
 * Main deck: exactly 40 cards. Extra deck: up to 15 fusion monsters.
 * Max 3 copies per card.
 */

import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

export const decksRouter = Router();

decksRouter.use(requireAuth);

/**
 * GET /api/decks — list all decks of the current user.
 */
decksRouter.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.id, d.name, d.created_at, d.updated_at,
              (SELECT COUNT(*) FROM deck_cards dc WHERE dc.deck_id = d.id) as card_count
       FROM decks d
       WHERE d.user_id = $1
       ORDER BY d.updated_at DESC`,
      [req.user!.userId]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Decks konnten nicht geladen werden' });
  }
});

/**
 * GET /api/decks/:id — get a single deck with all cards.
 */
decksRouter.get('/:id', async (req, res) => {
  try {
    const deckId = parseInt(req.params.id, 10);

    const deckResult = await pool.query(
      'SELECT * FROM decks WHERE id = $1 AND user_id = $2',
      [deckId, req.user!.userId]
    );

    if (deckResult.rows.length === 0) {
      res.status(404).json({ error: 'Deck nicht gefunden' });
      return;
    }

    const cardsResult = await pool.query(
      `SELECT dc.card_id, dc.quantity, c.name_de, c.name_en, c.frame_type,
              c.atk, c.def, c.level, c.attribute, c.race_en, c.image_path
       FROM deck_cards dc
       JOIN cards c ON c.id = dc.card_id
       WHERE dc.deck_id = $1`,
      [deckId]
    );

    res.json({
      ...deckResult.rows[0],
      cards: cardsResult.rows,
    });
  } catch {
    res.status(500).json({ error: 'Deck konnte nicht geladen werden' });
  }
});

/**
 * POST /api/decks — create a new deck.
 * Body: { name: string }
 */
decksRouter.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length < 1 || name.length > 64) {
      res.status(400).json({ error: 'Name muss zwischen 1 und 64 Zeichen lang sein' });
      return;
    }

    const result = await pool.query(
      'INSERT INTO decks (user_id, name) VALUES ($1, $2) RETURNING id, name, created_at',
      [req.user!.userId, name.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Deck konnte nicht erstellt werden' });
  }
});

/**
 * PUT /api/decks/:id — update deck name.
 * Body: { name: string }
 */
decksRouter.put('/:id', async (req, res) => {
  try {
    const deckId = parseInt(req.params.id, 10);
    const { name } = req.body;

    if (!name || name.trim().length < 1 || name.length > 64) {
      res.status(400).json({ error: 'Name muss zwischen 1 und 64 Zeichen lang sein' });
      return;
    }

    const result = await pool.query(
      'UPDATE decks SET name = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [name.trim(), deckId, req.user!.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Deck nicht gefunden' });
      return;
    }

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Deck konnte nicht aktualisiert werden' });
  }
});

/**
 * DELETE /api/decks/:id — delete a deck.
 */
decksRouter.delete('/:id', async (req, res) => {
  try {
    const deckId = parseInt(req.params.id, 10);

    const result = await pool.query(
      'DELETE FROM decks WHERE id = $1 AND user_id = $2 RETURNING id',
      [deckId, req.user!.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Deck nicht gefunden' });
      return;
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Deck konnte nicht geloescht werden' });
  }
});

/**
 * PUT /api/decks/:id/cards — save all cards in a deck (replaces existing).
 * Body: { mainDeck: number[], extraDeck: number[] }
 * Validates: main deck = 40 cards, extra deck <= 15, max 3 copies.
 */
decksRouter.put('/:id/cards', async (req, res) => {
  try {
    const deckId = parseInt(req.params.id, 10);
    const { mainDeck, extraDeck } = req.body as { mainDeck: number[]; extraDeck: number[] };

    // Check deck ownership
    const deckResult = await pool.query(
      'SELECT id FROM decks WHERE id = $1 AND user_id = $2',
      [deckId, req.user!.userId]
    );

    if (deckResult.rows.length === 0) {
      res.status(404).json({ error: 'Deck nicht gefunden' });
      return;
    }

    if (!Array.isArray(mainDeck) || !Array.isArray(extraDeck)) {
      res.status(400).json({ error: 'mainDeck und extraDeck muessen Arrays sein' });
      return;
    }

    // Validate main deck size (max 40)
    if (mainDeck.length > 40) {
      res.status(400).json({ error: 'Hauptdeck darf maximal 40 Karten haben' });
      return;
    }

    // Validate extra deck size
    if (extraDeck.length > 15) {
      res.status(400).json({ error: 'Extra Deck darf maximal 15 Karten haben' });
      return;
    }

    // Count copies across both decks
    const allCards = [...mainDeck, ...extraDeck];
    const counts = new Map<number, number>();
    for (const cardId of allCards) {
      counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
    }

    for (const [cardId, count] of counts) {
      if (count > 3) {
        res.status(400).json({ error: `Karte ${cardId} ist mehr als 3 mal im Deck` });
        return;
      }
    }

    // Verify all cards exist and are from active sets
    const cardIds = [...new Set(allCards)];
    const cardsResult = await pool.query(
      `SELECT DISTINCT c.id, c.frame_type FROM cards c
       JOIN card_set_entries cse ON cse.card_id = c.id
       JOIN card_sets cs ON cs.name = cse.set_name
       WHERE c.id = ANY($1) AND cs.active = TRUE`,
      [cardIds]
    );

    const validCards = new Map(cardsResult.rows.map((r: { id: number; frame_type: string }) => [r.id, r.frame_type]));

    for (const cardId of cardIds) {
      if (!validCards.has(cardId)) {
        res.status(400).json({ error: `Karte ${cardId} ist nicht verfuegbar` });
        return;
      }
    }

    // Verify extra deck only contains fusion monsters
    for (const cardId of extraDeck) {
      if (validCards.get(cardId) !== 'fusion') {
        res.status(400).json({ error: 'Extra Deck darf nur Fusionsmonster enthalten' });
        return;
      }
    }

    // Save — delete old cards, insert new
    await pool.query('DELETE FROM deck_cards WHERE deck_id = $1', [deckId]);

    for (const [cardId, quantity] of counts) {
      await pool.query(
        'INSERT INTO deck_cards (deck_id, card_id, quantity) VALUES ($1, $2, $3)',
        [deckId, cardId, quantity]
      );
    }

    await pool.query('UPDATE decks SET updated_at = NOW() WHERE id = $1', [deckId]);

    res.json({ success: true, mainDeckSize: mainDeck.length, extraDeckSize: extraDeck.length });
  } catch {
    res.status(500).json({ error: 'Deck konnte nicht gespeichert werden' });
  }
});
