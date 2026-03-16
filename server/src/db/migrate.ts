/**
 * Database migration — creates all tables.
 * Run with: npm run db:migrate
 */

import { pool } from '../config/db.js';

const schema = `
  -- Users (username + tag = display name like Discord: Michael#1234)
  CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(32) NOT NULL,
    tag           VARCHAR(4) NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(16) DEFAULT 'user',
    dp            INTEGER DEFAULT 1250,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(username, tag)
  );

  -- User card collection
  CREATE TABLE IF NOT EXISTS user_cards (
    id        SERIAL PRIMARY KEY,
    user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
    card_id   INTEGER NOT NULL,
    quantity  INTEGER DEFAULT 1,
    UNIQUE(user_id, card_id)
  );

  -- Decks
  CREATE TABLE IF NOT EXISTS decks (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(64) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
  );

  -- Cards in a deck
  CREATE TABLE IF NOT EXISTS deck_cards (
    id        SERIAL PRIMARY KEY,
    deck_id   INTEGER REFERENCES decks(id) ON DELETE CASCADE,
    card_id   INTEGER NOT NULL,
    quantity  INTEGER DEFAULT 1
  );

  -- User stats
  CREATE TABLE IF NOT EXISTS user_stats (
    user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    duels_played  INTEGER DEFAULT 0,
    duels_won     INTEGER DEFAULT 0,
    story_chapter VARCHAR(32) DEFAULT 'chapter-1'
  );
`;

async function migrate() {
  console.log('Running migrations...');
  await pool.query(schema);
  console.log('Migrations complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
