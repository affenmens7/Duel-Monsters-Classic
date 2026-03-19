/**
 * Auth routes — register, login, verify email, password reset
 */

import { Router } from 'express';
import { randomInt } from 'crypto';
import { registerUser, loginUser } from '../services/authService.js';
import { pool } from '../config/db.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../services/emailService.js';
import { requireAuth } from '../middleware/auth.js';
import bcrypt from 'bcrypt';

export const authRouter = Router();

/** Generates a cryptographically secure 6-digit code. */
function generateCode(): string {
  return String(randomInt(100000, 1000000));
}

// Register
authRouter.post('/register', async (req, res) => {
  try {
    const result = await registerUser(req.body);

    // Send verification + welcome email
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const lang = req.body.lang === 'en' ? 'en' : 'de';

    await pool.query(
      'INSERT INTO email_codes (user_id, code, type, expires_at) VALUES ($1, $2, $3, $4)',
      [result.user.id, code, 'verify', expiresAt]
    );

    try {
      await sendWelcomeEmail(req.body.email, result.user.username, result.user.displayName, lang);
      setTimeout(async () => {
        try {
          await sendVerificationEmail(req.body.email, result.user.username, code, lang);
        } catch { /* ignore */ }
      }, 10000);
    } catch {
      // Email send failed — user is still created, can resend later
    }

    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registrierung fehlgeschlagen';
    res.status(400).json({ error: message });
  }
});

// Login
authRouter.post('/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const result = await loginUser({ login: username ?? email, password });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login fehlgeschlagen';
    res.status(401).json({ error: message });
  }
});

// Verify email
authRouter.post('/verify-email', requireAuth, async (req, res) => {
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: 'Code erforderlich' });
    return;
  }

  const result = await pool.query(
    `SELECT id FROM email_codes
     WHERE user_id = $1 AND code = $2 AND type = 'verify' AND used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [req.user!.userId, code]
  );

  if (result.rows.length === 0) {
    res.status(400).json({ error: 'Code ungueltig oder abgelaufen' });
    return;
  }

  await pool.query('UPDATE email_codes SET used = TRUE WHERE id = $1', [result.rows[0].id]);
  await pool.query('UPDATE users SET email_verified = TRUE WHERE id = $1', [req.user!.userId]);

  res.json({ success: true });
});

// Resend verification email
authRouter.post('/resend-verification', requireAuth, async (req, res) => {
  const userResult = await pool.query(
    'SELECT email, username, email_verified FROM users WHERE id = $1',
    [req.user!.userId]
  );

  if (userResult.rows.length === 0) {
    res.status(404).json({ error: 'User nicht gefunden' });
    return;
  }

  if (userResult.rows[0].email_verified) {
    res.json({ success: true, message: 'Bereits verifiziert' });
    return;
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await pool.query(
    'INSERT INTO email_codes (user_id, code, type, expires_at) VALUES ($1, $2, $3, $4)',
    [req.user!.userId, code, 'verify', expiresAt]
  );

  await sendVerificationEmail(userResult.rows[0].email, userResult.rows[0].username, code);
  res.json({ success: true });
});

// Request password reset
authRouter.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'E-Mail erforderlich' });
    return;
  }

  const userResult = await pool.query(
    'SELECT id, username FROM users WHERE email = $1',
    [email]
  );

  // Always respond success (don't reveal if email exists)
  if (userResult.rows.length === 0) {
    res.json({ success: true });
    return;
  }

  const user = userResult.rows[0];
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await pool.query(
    'INSERT INTO email_codes (user_id, code, type, expires_at) VALUES ($1, $2, $3, $4)',
    [user.id, code, 'reset', expiresAt]
  );

  await sendPasswordResetEmail(email, user.username, code);
  res.json({ success: true });
});

// Reset password with code
authRouter.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    res.status(400).json({ error: 'Alle Felder erforderlich' });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
    return;
  }

  const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

  if (userResult.rows.length === 0) {
    res.status(400).json({ error: 'Code ungueltig oder abgelaufen' });
    return;
  }

  const userId = userResult.rows[0].id;

  const codeResult = await pool.query(
    `SELECT id FROM email_codes
     WHERE user_id = $1 AND code = $2 AND type = 'reset' AND used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId, code]
  );

  if (codeResult.rows.length === 0) {
    res.status(400).json({ error: 'Code ungueltig oder abgelaufen' });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await pool.query('UPDATE email_codes SET used = TRUE WHERE id = $1', [codeResult.rows[0].id]);
  await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);

  res.json({ success: true });
});
