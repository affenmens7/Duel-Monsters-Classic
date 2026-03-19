/**
 * DMC Backend — Express server entry point.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/user.js';
import { shopRouter } from './routes/shop.js';
import { displaysRouter } from './routes/displays.js';
import { cardsRouter } from './routes/cards.js';
import { decksRouter } from './routes/decks.js';
import { adminRouter } from './routes/admin/index.js';
import { contentRouter } from './routes/content.js';
import { versionRouter } from './routes/version.js';
import { initScheduler } from './services/releaseScheduler.js';

const app = express();

// Security headers (XSS, Clickjacking, etc.)
app.use(helmet());

// CORS — only allow our frontend
app.use(cors({ origin: env.frontendUrl, credentials: true }));

// Body parser with size limit (prevent oversized requests)
app.use(express.json({ limit: '1mb' }));

// Rate limiting — global: 100 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen, bitte warte einen Moment.' },
});
app.use(globalLimiter);

// Stricter rate limit for auth routes: 10 attempts per minute per IP
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Login-Versuche, bitte warte eine Minute.' },
});

// Shop rate limiter — max 10 purchases per minute per IP
const shopLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Kaufanfragen, bitte warte einen Moment.' },
});

// Routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/user', userRouter);
app.use('/api/shop/buy', shopLimiter);
app.use('/api/shop/displays', displaysRouter);
app.use('/api/shop', shopRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/decks', decksRouter);
app.use('/api/admin', adminRouter);
app.use('/api/content', contentRouter);
app.use('/api/data-version', versionRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(env.port, () => {
  console.log(`DMC Server running on port ${env.port}`);
  initScheduler();
});
