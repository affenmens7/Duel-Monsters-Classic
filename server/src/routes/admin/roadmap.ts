/**
 * Admin Roadmap routes — CRUD for roadmap phases.
 */

import { Router } from 'express';
import { pool } from '../../config/db.js';
import { bumpDataVersion } from '../../services/versionService.js';

export const roadmapRouter = Router();

/** GET / — list all roadmap phases. */
roadmapRouter.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM roadmap_phases ORDER BY sort_order'
    );
    console.log(`[ADMIN] user=${req.user!.userId} action=list_roadmap`);
    res.json(result.rows);
  } catch (err) {
    console.error('Admin list roadmap failed:', err);
    res.status(500).json({ error: 'Roadmap konnte nicht geladen werden' });
  }
});

/** POST / — create a roadmap phase. */
roadmapRouter.post('/', async (req, res) => {
  try {
    const {
      slug, phaseLabel, titleDe, titleEn,
      descDe, descEn, status,
      featuresDe, featuresEn, detailDe, detailEn,
      sortOrder,
    } = req.body;

    if (!slug || !phaseLabel || !titleDe || !status) {
      res.status(400).json({ error: 'Pflichtfelder: slug, phaseLabel, titleDe, status' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO roadmap_phases
        (slug, phase_label, title_de, title_en, desc_de, desc_en, status, features_de, features_en, detail_de, detail_en, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        slug, phaseLabel, titleDe, titleEn ?? null,
        descDe ?? null, descEn ?? null, status,
        featuresDe ?? null, featuresEn ?? null,
        detailDe ?? null, detailEn ?? null,
        sortOrder ?? 0,
      ]
    );

    console.log(`[ADMIN] user=${req.user!.userId} action=create_roadmap target=${slug}`);
    await bumpDataVersion();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Admin create roadmap failed:', err);
    res.status(500).json({ error: 'Roadmap-Phase konnte nicht erstellt werden' });
  }
});

/** PUT /:id — update a roadmap phase by ID. */
roadmapRouter.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungueltige Roadmap-ID' });
      return;
    }

    const {
      slug, phaseLabel, titleDe, titleEn,
      descDe, descEn, status,
      featuresDe, featuresEn, detailDe, detailEn,
      sortOrder,
    } = req.body;

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (slug !== undefined) { updates.push(`slug = $${idx++}`); params.push(slug); }
    if (phaseLabel !== undefined) { updates.push(`phase_label = $${idx++}`); params.push(phaseLabel); }
    if (titleDe !== undefined) { updates.push(`title_de = $${idx++}`); params.push(titleDe); }
    if (titleEn !== undefined) { updates.push(`title_en = $${idx++}`); params.push(titleEn); }
    if (descDe !== undefined) { updates.push(`desc_de = $${idx++}`); params.push(descDe); }
    if (descEn !== undefined) { updates.push(`desc_en = $${idx++}`); params.push(descEn); }
    if (status !== undefined) { updates.push(`status = $${idx++}`); params.push(status); }
    if (featuresDe !== undefined) { updates.push(`features_de = $${idx++}`); params.push(featuresDe); }
    if (featuresEn !== undefined) { updates.push(`features_en = $${idx++}`); params.push(featuresEn); }
    if (detailDe !== undefined) { updates.push(`detail_de = $${idx++}`); params.push(detailDe); }
    if (detailEn !== undefined) { updates.push(`detail_en = $${idx++}`); params.push(detailEn); }
    if (sortOrder !== undefined) { updates.push(`sort_order = $${idx++}`); params.push(Number(sortOrder)); }

    if (updates.length === 0) {
      res.status(400).json({ error: 'Keine Felder zum Aktualisieren angegeben' });
      return;
    }

    updates.push(`updated_at = NOW()`);

    params.push(id);
    const result = await pool.query(
      `UPDATE roadmap_phases SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Roadmap-Phase nicht gefunden' });
      return;
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=update_roadmap target=${id}`);
    await bumpDataVersion();
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin update roadmap failed:', err);
    res.status(500).json({ error: 'Roadmap-Phase konnte nicht aktualisiert werden' });
  }
});

/** DELETE /:id — delete a roadmap phase by ID. */
roadmapRouter.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Ungueltige Roadmap-ID' });
      return;
    }

    const result = await pool.query(
      'DELETE FROM roadmap_phases WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Roadmap-Phase nicht gefunden' });
      return;
    }

    console.log(`[ADMIN] user=${req.user!.userId} action=delete_roadmap target=${id}`);
    await bumpDataVersion();
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete roadmap failed:', err);
    res.status(500).json({ error: 'Roadmap-Phase konnte nicht geloescht werden' });
  }
});
