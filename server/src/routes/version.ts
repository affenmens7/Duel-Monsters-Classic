/**
 * Version route — returns the current data version for cache invalidation.
 * Public endpoint, no auth required.
 */

import { Router } from 'express';
import { getDataVersion } from '../services/versionService.js';

export const versionRouter = Router();

/**
 * GET /api/data-version
 * Returns { version: "v42-1719" }
 */
versionRouter.get('/', async (_req, res) => {
  try {
    const version = await getDataVersion();
    res.set('Cache-Control', 'no-cache, no-store');
    res.json({ version });
  } catch {
    res.status(500).json({ error: 'Version konnte nicht geladen werden' });
  }
});
