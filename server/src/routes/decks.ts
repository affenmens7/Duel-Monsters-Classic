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

// Deck name: 1-32 chars, only letters (incl. umlauts), digits, hyphens, underscores. No spaces.
const DECK_NAME_REGEX = /^[A-Za-z0-9\u00C0-\u024F_-]{1,32}$/;

function validateDeckName(name: unknown): string | null {
  if (typeof name !== 'string' || name.trim().length === 0) return 'Name darf nicht leer sein';
  const trimmed = name.trim();
  if (trimmed.length > 32) return 'Name darf maximal 32 Zeichen lang sein';
  if (/\s/.test(trimmed)) return 'Leerzeichen sind nicht erlaubt';
  if (!DECK_NAME_REGEX.test(trimmed)) return 'Nur Buchstaben, Zahlen, Bindestrich und Unterstrich erlaubt';
  return null;
}

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
    if (isNaN(deckId) || deckId <= 0) {
      res.status(400).json({ error: 'Ungueltige Deck-ID' });
      return;
    }

    const deckResult = await pool.query(
      'SELECT * FROM decks WHERE id = $1 AND user_id = $2',
      [deckId, req.user!.userId]
    );

    if (deckResult.rows.length === 0) {
      res.status(404).json({ error: 'Deck nicht gefunden' });
      return;
    }

    const cardsResult = await pool.query(
      `SELECT dc.card_id, dc.copy_index, dc.artwork_id, c.name_de, c.name_en, c.frame_type,
              c.atk, c.def, c.level, c.attribute, c.race_en, c.image_path
       FROM deck_cards dc
       JOIN cards c ON c.id = dc.card_id
       WHERE dc.deck_id = $1
       ORDER BY dc.card_id, dc.copy_index`,
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
    const nameError = validateDeckName(name);
    if (nameError) {
      res.status(400).json({ error: nameError });
      return;
    }

    const trimmed = (name as string).trim();

    // Check for duplicate name (same user)
    const dupCheck = await pool.query(
      'SELECT id FROM decks WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
      [req.user!.userId, trimmed]
    );
    if (dupCheck.rows.length > 0) {
      res.status(409).json({ error: 'Ein Deck mit diesem Namen existiert bereits', code: 'DUPLICATE_NAME' });
      return;
    }

    const result = await pool.query(
      'INSERT INTO decks (user_id, name) VALUES ($1, $2) RETURNING id, name, created_at',
      [req.user!.userId, trimmed]
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
    if (isNaN(deckId) || deckId <= 0) {
      res.status(400).json({ error: 'Ungueltige Deck-ID' });
      return;
    }
    const { name } = req.body;
    const nameError = validateDeckName(name);
    if (nameError) {
      res.status(400).json({ error: nameError });
      return;
    }

    const trimmed = (name as string).trim();

    // Check for duplicate name (same user, excluding this deck)
    const dupCheck = await pool.query(
      'SELECT id FROM decks WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id != $3',
      [req.user!.userId, trimmed, deckId]
    );
    if (dupCheck.rows.length > 0) {
      res.status(409).json({ error: 'Ein Deck mit diesem Namen existiert bereits', code: 'DUPLICATE_NAME' });
      return;
    }

    const result = await pool.query(
      'UPDATE decks SET name = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [trimmed, deckId, req.user!.userId]
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
    if (isNaN(deckId) || deckId <= 0) {
      res.status(400).json({ error: 'Ungueltige Deck-ID' });
      return;
    }

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
 * Body: { mainDeck: {cardId, artworkId?}[], extraDeck: {cardId, artworkId?}[] }
 * Each array entry is one copy. Per-copy artwork support.
 * Backwards compatible: bare number entries are normalized to {cardId, artworkId: null}.
 * Validates: main deck <= 60 cards, extra deck <= 15, max 3 copies per card,
 *            ownership, active sets, artwork ownership.
 */
decksRouter.put('/:id/cards', async (req, res) => {
  try {
    const deckId = parseInt(req.params.id, 10);
    if (isNaN(deckId) || deckId <= 0) {
      res.status(400).json({ error: 'Ungueltige Deck-ID' });
      return;
    }

    const rawMain = req.body.mainDeck as Array<number | { cardId: number; artworkId?: number }>;
    const rawExtra = req.body.extraDeck as Array<number | { cardId: number; artworkId?: number }>;

    if (!Array.isArray(rawMain ?? []) || !Array.isArray(rawExtra ?? [])) {
      res.status(400).json({ error: 'mainDeck und extraDeck muessen Arrays sein' });
      return;
    }

    // Normalize to per-copy {cardId, artworkId} format
    type CopyEntry = { cardId: number; artworkId: number | null };
    const normalize = (arr: typeof rawMain): CopyEntry[] =>
      (arr ?? []).map((e) => typeof e === 'number'
        ? { cardId: e, artworkId: null }
        : { cardId: e.cardId, artworkId: e.artworkId ?? null });

    const mainCopies = normalize(rawMain);
    const extraCopies = normalize(rawExtra);
    const allCopies = [...mainCopies, ...extraCopies];

    // Validate all cardIds and artworkIds
    for (const copy of allCopies) {
      if (typeof copy.cardId !== 'number' || !Number.isInteger(copy.cardId) || copy.cardId <= 0) {
        res.status(400).json({ error: 'Ungueltige cardId' });
        return;
      }
      if (copy.artworkId != null && (typeof copy.artworkId !== 'number' || !Number.isInteger(copy.artworkId) || copy.artworkId <= 0)) {
        res.status(400).json({ error: 'artworkId muss eine positive ganze Zahl sein' });
        return;
      }
    }

    // Validate deck sizes
    if (mainCopies.length > 60) {
      res.status(400).json({ error: 'Hauptdeck darf maximal 60 Karten haben' });
      return;
    }
    if (extraCopies.length > 15) {
      res.status(400).json({ error: 'Extra Deck darf maximal 15 Karten haben' });
      return;
    }

    // Count copies per card across both decks
    const counts = new Map<number, number>();
    for (const copy of allCopies) {
      counts.set(copy.cardId, (counts.get(copy.cardId) ?? 0) + 1);
    }

    for (const [cardId, count] of counts) {
      if (count > 3) {
        res.status(400).json({ error: `Karte ${cardId} ist mehr als 3 mal im Deck` });
        return;
      }
    }

    // Check deck ownership
    const deckResult = await pool.query(
      'SELECT id FROM decks WHERE id = $1 AND user_id = $2',
      [deckId, req.user!.userId]
    );
    if (deckResult.rows.length === 0) {
      res.status(404).json({ error: 'Deck nicht gefunden' });
      return;
    }

    // Verify all cards exist and are assigned to at least one set
    const cardIds = [...new Set(allCopies.map((c) => c.cardId))];
    const cardsResult = await pool.query(
      `SELECT DISTINCT c.id, c.frame_type FROM cards c
       JOIN card_set_entries cse ON cse.card_id = c.id
       WHERE c.id = ANY($1)`,
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
    for (const copy of extraCopies) {
      if (validCards.get(copy.cardId) !== 'fusion') {
        res.status(400).json({ error: 'Extra Deck darf nur Fusionsmonster enthalten' });
        return;
      }
    }

    // Verify card ownership
    const ownedResult = await pool.query(
      'SELECT card_id, quantity FROM user_cards WHERE user_id = $1 AND card_id = ANY($2)',
      [req.user!.userId, cardIds]
    );
    const ownedMap = new Map<number, number>(
      ownedResult.rows.map((r: { card_id: number; quantity: number }) => [r.card_id, r.quantity])
    );

    for (const [cardId, quantity] of counts) {
      const owned = ownedMap.get(cardId) ?? 0;
      if (owned === 0) {
        res.status(400).json({ error: 'Du besitzt diese Karte nicht', card_id: cardId });
        return;
      }
      if (quantity > Math.min(3, owned)) {
        res.status(400).json({ error: 'Du besitzt nicht genug Kopien dieser Karte', card_id: cardId });
        return;
      }
    }

    // Verify artwork ownership for all non-null artworkIds
    const artworkIds = [...new Set(allCopies.filter((c) => c.artworkId != null).map((c) => c.artworkId!))];
    if (artworkIds.length > 0) {
      const ownedArtworks = await pool.query(
        'SELECT artwork_id FROM user_card_artworks WHERE user_id = $1 AND artwork_id = ANY($2)',
        [req.user!.userId, artworkIds]
      );
      const ownedArtSet = new Set(ownedArtworks.rows.map((r: { artwork_id: number }) => r.artwork_id));
      for (const artId of artworkIds) {
        if (!ownedArtSet.has(artId)) {
          res.status(400).json({ error: 'Du besitzt dieses Artwork nicht', artwork_id: artId });
          return;
        }
      }
    }

    // Save — delete old, insert per-copy rows
    await pool.query('DELETE FROM deck_cards WHERE deck_id = $1', [deckId]);

    // Track copy_index per cardId (0, 1, 2)
    const copyIndexMap = new Map<number, number>();
    for (const copy of allCopies) {
      const idx = copyIndexMap.get(copy.cardId) ?? 0;
      await pool.query(
        'INSERT INTO deck_cards (deck_id, card_id, copy_index, artwork_id, quantity) VALUES ($1, $2, $3, $4, 1)',
        [deckId, copy.cardId, idx, copy.artworkId]
      );
      copyIndexMap.set(copy.cardId, idx + 1);
    }

    await pool.query('UPDATE decks SET updated_at = NOW() WHERE id = $1', [deckId]);

    res.json({ success: true, mainDeckSize: mainCopies.length, extraDeckSize: extraCopies.length });
  } catch {
    res.status(500).json({ error: 'Deck konnte nicht gespeichert werden' });
  }
});
