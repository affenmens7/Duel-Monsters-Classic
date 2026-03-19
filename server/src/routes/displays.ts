/**
 * Public display routes — storefront listing and detail view.
 * Displays are independent products that bundle multiple booster sets.
 */

import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

export const displaysRouter = Router();

/**
 * GET /api/shop/displays
 * List all shop-visible displays for storefront.
 */
displaysRouter.get('/', async (_req, res) => {
  try {
    const displaysResult = await pool.query(`
      SELECT
        d.id, d.name, d.price,
        d.desc_de AS "descDe", d.desc_en AS "descEn",
        d.showcase_card_ids AS "showcaseCardIds",
        COALESCE(d.showcase_animated, FALSE) AS "showcaseAnimated",
        d.ig_release_date AS "igReleaseDate",
        d.active, d.wave, d.sort_order AS "sortOrder",
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

    const displayIds = displaysResult.rows.map((d: any) => d.id);

    let contentsRows: any[] = [];
    if (displayIds.length > 0) {
      const contentsResult = await pool.query(`
        SELECT dc.display_id, dc.booster_set_name AS "boosterSetName",
               dc.pack_count AS "packCount"
        FROM shop_display_contents dc
        WHERE dc.display_id = ANY($1)
      `, [displayIds]);
      contentsRows = contentsResult.rows;
    }

    // Attach contents array to each display
    const displays = displaysResult.rows.map((d: any) => ({
      ...d,
      contents: contentsRows.filter((c: any) => c.display_id === d.id)
        .map(({ boosterSetName, packCount }: any) => ({ boosterSetName, packCount })),
    }));

    res.json(displays);
  } catch (err) {
    console.error('Failed to load displays:', err);
    res.status(500).json({ error: 'Displays konnten nicht geladen werden' });
  }
});

/**
 * GET /api/shop/displays/:id
 * Display detail with rarity rates and cards + ownership. Requires auth.
 */
displaysRouter.get('/:id', requireAuth, async (req, res) => {
  const displayId = parseInt(req.params.id as string, 10);
  const userId = req.user!.userId;

  if (isNaN(displayId)) {
    res.status(400).json({ error: 'Ungueltige Display-ID' });
    return;
  }

  try {
    // Display info
    const displayResult = await pool.query(`
      SELECT
        d.id, d.name, d.price,
        d.desc_de AS "descDe", d.desc_en AS "descEn",
        d.showcase_card_ids AS "showcaseCardIds",
        COALESCE(d.showcase_animated, FALSE) AS "showcaseAnimated",
        d.ig_release_date AS "igReleaseDate",
        d.active, d.wave, d.sort_order AS "sortOrder",
        (SELECT COALESCE(SUM(dc.pack_count), 0)::int
         FROM shop_display_contents dc WHERE dc.display_id = d.id) AS "totalPacks",
        (SELECT COALESCE(SUM(cnt.card_count), 0)::int
         FROM shop_display_contents dc2
         JOIN (SELECT set_name, COUNT(DISTINCT card_id)::int AS card_count
               FROM card_set_entries GROUP BY set_name) cnt
         ON cnt.set_name = dc2.booster_set_name
         WHERE dc2.display_id = d.id) AS "cardCount"
      FROM shop_displays d
      WHERE d.id = $1
    `, [displayId]);

    if (displayResult.rows.length === 0) {
      res.status(404).json({ error: 'Display nicht gefunden' });
      return;
    }

    // Contents
    const contentsResult = await pool.query(`
      SELECT dc.booster_set_name AS "boosterSetName", dc.pack_count AS "packCount"
      FROM shop_display_contents dc
      WHERE dc.display_id = $1
    `, [displayId]);

    // Rarity rates aggregated from all constituent boosters
    const rarityResult = await pool.query(`
      SELECT cse.rarity, COUNT(*)::int AS count
      FROM card_set_entries cse
      JOIN shop_display_contents dc ON dc.booster_set_name = cse.set_name
      WHERE dc.display_id = $1
      GROUP BY cse.rarity
      ORDER BY CASE cse.rarity
        WHEN 'Common' THEN 5
        WHEN 'Rare' THEN 4
        WHEN 'Super Rare' THEN 3
        WHEN 'Ultra Rare' THEN 2
        WHEN 'Secret Rare' THEN 1
        ELSE 6
      END
    `, [displayId]);

    // Convert counts to percentages
    const totalCards = rarityResult.rows.reduce((sum: number, r: any) => sum + r.count, 0);
    const rarityRates = rarityResult.rows.map((r: any) => ({
      rarity: r.rarity,
      ratePct: totalCards > 0 ? ((r.count / totalCards) * 100).toFixed(2) : '0.00',
    }));

    // Cards with ownership — include set_name for grouping
    const cardsResult = await pool.query(`
      SELECT cse.card_id AS "cardId",
             COALESCE(cse.artwork_id, cse.card_id) AS "artworkId",
             cse.set_name AS "setName",
             cse.rarity,
             cse.rarity_code AS "rarityCode",
             COALESCE(uc.quantity, 0)::int AS owned
      FROM card_set_entries cse
      JOIN shop_display_contents dc ON dc.booster_set_name = cse.set_name
      LEFT JOIN user_cards uc ON uc.card_id = cse.card_id AND uc.user_id = $2
      WHERE dc.display_id = $1
      ORDER BY dc.booster_set_name, cse.card_id
    `, [displayId, userId]);

    const display = {
      ...displayResult.rows[0],
      contents: contentsResult.rows,
    };

    res.json({
      display,
      rarityRates,
      cards: cardsResult.rows,
    });
  } catch (err) {
    console.error('Failed to load display detail:', err);
    res.status(500).json({ error: 'Display-Details konnten nicht geladen werden' });
  }
});
