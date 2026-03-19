/**
 * Auth service — handles user registration and login.
 * Passwords are hashed with bcrypt, tokens are JWT.
 * Users get a Discord-style tag: Username#1234
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import type { AuthPayload } from '../middleware/auth.js';

const SALT_ROUNDS = 12;
const MAX_TAG_ATTEMPTS = 20;

interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

interface LoginInput {
  login: string;
  password: string;
}

function createToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });
}

function generateTag(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function registerUser({ username, email, password }: RegisterInput) {
  // Username: 3-32 chars, letters (incl. umlauts), numbers, underscore, hyphen, dot
  const usernamePattern = /^[a-zA-Z0-9_\-.\u00C0-\u024F]{3,32}$/;
  if (!username || !usernamePattern.test(username)) {
    throw new Error('Username: 3-32 Zeichen, nur Buchstaben, Zahlen, _ - .');
  }
  // Email: basic format check
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!email || !emailPattern.test(email)) {
    throw new Error('Ungueltige E-Mail-Adresse');
  }
  if (!password || password.length < 8) {
    throw new Error('Passwort muss mindestens 8 Zeichen lang sein');
  }

  // Check if email already exists
  const existingEmail = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  if (existingEmail.rows.length > 0) {
    throw new Error('E-Mail bereits vergeben');
  }

  // Generate unique tag for this username
  let tag = '';
  for (let i = 0; i < MAX_TAG_ATTEMPTS; i++) {
    const candidate = generateTag();
    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1 AND tag = $2',
      [username, candidate]
    );
    if (existing.rows.length === 0) {
      tag = candidate;
      break;
    }
  }
  if (!tag) {
    throw new Error('Dieser Username ist leider nicht mehr verfuegbar');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO users (username, tag, email, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, tag, role, dp`,
    [username, tag, email, passwordHash]
  );

  const user = result.rows[0];
  const displayName = `${user.username}#${user.tag}`;

  await pool.query(
    'INSERT INTO user_stats (user_id) VALUES ($1)',
    [user.id]
  );

  const token = createToken({
    userId: user.id,
    username: displayName,
    role: user.role,
  });

  return {
    token,
    user: { id: user.id, username: user.username, tag: user.tag, displayName, role: user.role, dp: user.dp },
  };
}

export async function loginUser({ login, password }: LoginInput) {
  if (!login || !password) {
    throw new Error('Username/E-Mail und Passwort erforderlich');
  }

  // Login via email, username#tag, or just username (picks first match)
  let query: string;
  let params: string[];

  if (login.includes('@')) {
    query = 'SELECT u.id, u.username, u.tag, u.password_hash, u.role, u.dp FROM users u WHERE u.email = $1';
    params = [login];
  } else if (login.includes('#')) {
    const [name, tag] = login.split('#');
    query = 'SELECT u.id, u.username, u.tag, u.password_hash, u.role, u.dp FROM users u WHERE u.username = $1 AND u.tag = $2';
    params = [name, tag];
  } else {
    query = 'SELECT u.id, u.username, u.tag, u.password_hash, u.role, u.dp FROM users u WHERE u.username = $1 ORDER BY u.id LIMIT 1';
    params = [login];
  }

  const result = await pool.query(query, params);

  if (result.rows.length === 0) {
    throw new Error('Login oder Passwort falsch');
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    throw new Error('Login oder Passwort falsch');
  }

  const displayName = `${user.username}#${user.tag}`;

  const token = createToken({
    userId: user.id,
    username: displayName,
    role: user.role,
  });

  return {
    token,
    user: { id: user.id, username: user.username, tag: user.tag, displayName, role: user.role, dp: user.dp },
  };
}
