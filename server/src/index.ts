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
import { cardsRouter } from './routes/cards.js';

const app = express();

// Security headers (XSS, Clickjacking, etc.)
app.use(helmet());

// CORS — only allow our frontend
app.use(cors({ origin: 'http://localhost:5173' }));

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

// Routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/user', userRouter);
app.use('/api/shop', shopRouter);
app.use('/api/cards', cardsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.0.1' });
});

app.listen(env.port, () => {
  console.log(`DMC Server running on port ${env.port}`);
});
