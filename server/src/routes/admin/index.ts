/**
 * Admin router — mounts all admin sub-routers with auth middleware.
 * Structure mirrors Flask blueprints: each domain gets its own router.
 */

import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import { dashboardRouter } from './dashboard.js';
import { setsRouter } from './sets.js';
import { cardsRouter } from './cards.js';
import { newsRouter } from './news.js';
import { roadmapRouter } from './roadmap.js';
import { usersRouter } from './users.js';
import { cosmeticsRouter } from './cosmetics.js';
import { featuredRouter } from './featured.js';
import { displaysRouter } from './displays.js';
import { releasesRouter } from './releases.js';

export const adminRouter = Router();

// Apply auth + admin middleware to every route
adminRouter.use(requireAuth, requireAdmin);

// Mount sub-routers at their respective path prefixes
adminRouter.use('/', dashboardRouter);       // GET /stats
adminRouter.use('/sets', setsRouter);         // /sets/*
adminRouter.use('/cards', cardsRouter);       // /cards/*
adminRouter.use('/displays', displaysRouter); // /displays/*
adminRouter.use('/news', newsRouter);         // /news/*
adminRouter.use('/roadmap', roadmapRouter);   // /roadmap/*
adminRouter.use('/users', usersRouter);       // /users/*
adminRouter.use('/cosmetics', cosmeticsRouter); // /cosmetics/*
adminRouter.use('/featured', featuredRouter);   // /featured/*
adminRouter.use('/releases', releasesRouter);   // /releases/*
