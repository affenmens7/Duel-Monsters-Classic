/**
 * Public content routes -- news and roadmap.
 * No authentication required.
 */

import { Router } from 'express';
import { pool } from '../config/db.js';

export const contentRouter = Router();

// ---------------------------------------------------------------------------
// News (public)
// ---------------------------------------------------------------------------

/**
 * GET /api/content/news
 * Returns all published news articles, ordered by sort_order DESC then created_at DESC.
 */
contentRouter.get('/news', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        id, slug, date_label, title_de, title_en,
        summary_de, summary_en, content_de, content_en,
        tag, sort_order, created_at
       FROM news
       WHERE published = TRUE
       ORDER BY sort_order DESC, created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load public news:', err);
    res.status(500).json({ error: 'News konnten nicht geladen werden' });
  }
});

/**
 * GET /api/content/news/:slug
 * Returns a single published news article by slug.
 */
contentRouter.get('/news/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(
      `SELECT
        id, slug, date_label, title_de, title_en,
        summary_de, summary_en, content_de, content_en,
        tag, sort_order, created_at
       FROM news
       WHERE slug = $1 AND published = TRUE`,
      [slug]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'News-Artikel nicht gefunden' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to load news article:', err);
    res.status(500).json({ error: 'News-Artikel konnte nicht geladen werden' });
  }
});

// ---------------------------------------------------------------------------
// Roadmap (public)
// ---------------------------------------------------------------------------

/**
 * GET /api/content/roadmap
 * Returns all roadmap phases, ordered by sort_order.
 */
contentRouter.get('/roadmap', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        id, slug, phase_label, title_de, title_en,
        desc_de, desc_en, status,
        features_de, features_en, detail_de, detail_en,
        sort_order
       FROM roadmap_phases
       ORDER BY sort_order`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Failed to load roadmap:', err);
    res.status(500).json({ error: 'Roadmap konnte nicht geladen werden' });
  }
});

/**
 * GET /api/content/roadmap/:slug
 * Returns a single roadmap phase by slug.
 */
contentRouter.get('/roadmap/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await pool.query(
      `SELECT
        id, slug, phase_label, title_de, title_en,
        desc_de, desc_en, status,
        features_de, features_en, detail_de, detail_en,
        sort_order
       FROM roadmap_phases
       WHERE slug = $1`,
      [slug]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Roadmap-Phase nicht gefunden' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to load roadmap phase:', err);
    res.status(500).json({ error: 'Roadmap-Phase konnte nicht geladen werden' });
  }
});
