/**
 * Admin News routes — CRUD for news articles.
 */

import { Router } from 'express';
import { pool } from '../../config/db.js';
import { bumpDataVersion } from '../../services/versionService.js';

export const newsRouter = Router();

/** GET / — list all news articles (including unpublished). */
newsRouter.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM news ORDER BY sort_order DESC, created_at DESC'
    );
    console.log(`[ADMIN] user=${req.user!.userId} action=list_news`);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin list news failed:', err);
    res.status(500).json({ error: 'News konnten nicht geladen werden' });
  }
});

/** POST / — create a news article. */
newsRouter.post('/', async (req, res) => {
  try {
    const {
      slug, dateLabel, titleDe, titleEn,
      summaryDe, summaryEn, contentDe, contentEn,
      tag, published, sortOrder,
    } = req.body;

    if (!slug || !dateLabel || !titleDe || !summaryDe || !contentDe || !tag) {
      res.status(400).json({ error: 'Pflichtfelder: slug, dateLabel, titleDe, summaryDe, contentDe, tag' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO news
        (slug, date_label, title_de, title_en, summary_de, summary_en, content_de, content_en, tag, published, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        slug, dateLabel, titleDe, titleEn ?? null,
        summaryDe, summaryEn ?? null, contentDe, contentEn ?? null,
        tag, published ?? true, sortOrder ?? 0,
      ]
    );

    console.log(`[ADMIN] user=${req.user!.userId} action=create_news target=${slug}`);
    await bumpDataVersion();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Admin create news failed:', err);
    res.status(500).json({ error: 'News konnte nicht erstellt werden' });
  }
});

/** PUT /:id — update a news article by ID. */
newsRouter.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungueltige News-ID' });
      return;
    }

    const {
      slug, dateLabel, titleDe, titleEn,
      summaryDe, summaryEn, contentDe, contentEn,
      tag, published, sortOrder,
    } = req.body;

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (slug !== undefined) { updates.push(`slug = $${idx++}`); params.push(slug); }
    if (dateLabel !== undefined) { updates.push(`date_label = $${idx++}`); params.push(dateLabel); }
    if (titleDe !== undefined) { updates.push(`title_de = $${idx++}`); params.push(titleDe); }
    if (titleEn !== undefined) { updates.push(`title_en = $${idx++}`); params.push(titleEn); }
    if (summaryDe !== undefined) { updates.push(`summary_de = $${idx++}`); params.push(summaryDe); }
    if (summaryEn !== undefined) { updates.push(`summary_en = $${idx++}`); params.push(summaryEn); }
    if (contentDe !== undefined) { updates.push(`content_de = $${idx++}`); params.push(contentDe); }
    if (contentEn !== undefined) { updates.push(`content_en = $${idx++}`); params.push(contentEn); }
    if (tag !== undefined) { updates.push(`tag = $${idx++}`); params.push(tag); }
    if (published !== undefined) { updates.push(`published = $${idx++}`); params.push(Boolean(published)); }
    if (sortOrder !== undefined) { updates.push(`sort_order = $${idx++}`); params.push(Number(sortOrder)); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Keine Felder zum Aktualisieren angegeben' });
      return;
    }

    updates.push(`updated_at = NOW()`);

    params.push(id);
    const result = await pool.query(
      `UPDATE news SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'News nicht gefunden' });
      return;
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=update_news target=${id}`);
    await bumpDataVersion();
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin update news failed:', err);
    res.status(500).json({ error: 'News konnte nicht aktualisiert werden' });
  }
});

/** DELETE /:id — delete a news article by ID. */
newsRouter.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungueltige News-ID' });
      return;
    }

    const result = await pool.query(
      'DELETE FROM news WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'News nicht gefunden' });
      return;
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=delete_news target=${id}`);
    await bumpDataVersion();
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete news failed:', err);
    res.status(500).json({ error: 'News konnte nicht geloescht werden' });
  }
});
