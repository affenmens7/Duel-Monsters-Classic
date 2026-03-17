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
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(16) DEFAULT 'user',
    dp            INTEGER DEFAULT 1250,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(username, tag)
  );

  -- Card sets (booster packs, starter decks, etc.)
  CREATE TABLE IF NOT EXISTS card_sets (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(128) UNIQUE NOT NULL,
    code        VARCHAR(32),
    type        VARCHAR(32) DEFAULT 'booster',
    wave        INTEGER DEFAULT 0,
    active      BOOLEAN DEFAULT FALSE,
    release_date VARCHAR(32),
    image_path  VARCHAR(255)
  );

  -- Cards master table
  CREATE TABLE IF NOT EXISTS cards (
    id            INTEGER PRIMARY KEY,
    name_de       VARCHAR(255),
    name_en       VARCHAR(255) NOT NULL,
    desc_de       TEXT,
    desc_en       TEXT,
    type_de       VARCHAR(64),
    type_en       VARCHAR(64),
    frame_type    VARCHAR(32),
    atk           INTEGER,
    def           INTEGER,
    level         INTEGER,
    race_de       VARCHAR(64),
    race_en       VARCHAR(64),
    attribute     VARCHAR(16),
    archetype     VARCHAR(128),
    image_path    VARCHAR(255)
  );

  -- Card-to-set mapping (which cards are in which set)
  CREATE TABLE IF NOT EXISTS card_set_entries (
    id          SERIAL PRIMARY KEY,
    card_id     INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    set_name    VARCHAR(128) REFERENCES card_sets(name) ON DELETE CASCADE,
    set_code    VARCHAR(32),
    rarity      VARCHAR(64),
    rarity_code VARCHAR(16)
  );

  -- Unique index to prevent duplicate card-set entries
  CREATE UNIQUE INDEX IF NOT EXISTS idx_card_set_entries_unique
    ON card_set_entries (card_id, set_name);

  -- Add artwork_id column to card_set_entries (nullable, defaults to card's default artwork)
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_set_entries' AND column_name = 'artwork_id') THEN
      ALTER TABLE card_set_entries ADD COLUMN artwork_id INTEGER;
    END IF;
  END $$;

  -- Shop product config per set (prices, pack size, description)
  CREATE TABLE IF NOT EXISTS shop_set_config (
    id            SERIAL PRIMARY KEY,
    set_name      VARCHAR(128) REFERENCES card_sets(name) ON DELETE CASCADE UNIQUE,
    product_type  VARCHAR(32) NOT NULL DEFAULT 'booster',
    price_pack    INTEGER NOT NULL DEFAULT 120,
    price_display INTEGER,
    pack_size     INTEGER NOT NULL DEFAULT 5,
    display_size  INTEGER DEFAULT 24,
    desc_de       TEXT,
    desc_en       TEXT,
    featured      BOOLEAN DEFAULT FALSE,
    sort_order    INTEGER DEFAULT 0
  );

  -- Rarity pull rates per set (for display in shop)
  CREATE TABLE IF NOT EXISTS shop_rarity_rates (
    id        SERIAL PRIMARY KEY,
    set_name  VARCHAR(128) REFERENCES card_sets(name) ON DELETE CASCADE,
    rarity    VARCHAR(64) NOT NULL,
    rate_pct  NUMERIC(5,2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    UNIQUE(set_name, rarity)
  );

  -- Cosmetic products (themes, sleeves, playmats)
  CREATE TABLE IF NOT EXISTS shop_cosmetics (
    id            SERIAL PRIMARY KEY,
    item_type     VARCHAR(32) NOT NULL,
    item_id       VARCHAR(64) UNIQUE NOT NULL,
    name_de       VARCHAR(128) NOT NULL,
    name_en       VARCHAR(128) NOT NULL,
    desc_de       TEXT,
    desc_en       TEXT,
    price         INTEGER NOT NULL,
    preview_data  TEXT,
    available     BOOLEAN DEFAULT TRUE,
    sort_order    INTEGER DEFAULT 0
  );

  -- User owned cosmetics
  CREATE TABLE IF NOT EXISTS user_items (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item_type   VARCHAR(32) NOT NULL,
    item_id     VARCHAR(64) NOT NULL,
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_type, item_id)
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

  -- Verification and reset codes
  CREATE TABLE IF NOT EXISTS email_codes (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    code        VARCHAR(6) NOT NULL,
    type        VARCHAR(16) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );

  -- Card artworks (multiple artworks per card)
  CREATE TABLE IF NOT EXISTS card_artworks (
    id          SERIAL PRIMARY KEY,
    card_id     INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    artwork_id  INTEGER UNIQUE NOT NULL,
    label       VARCHAR(128),
    image_path  VARCHAR(255) NOT NULL,
    is_default  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_card_artworks_card ON card_artworks (card_id);

  -- User owned artworks (unlocked via events, achievements, shop)
  CREATE TABLE IF NOT EXISTS user_card_artworks (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    card_id     INTEGER NOT NULL,
    artwork_id  INTEGER NOT NULL REFERENCES card_artworks(artwork_id) ON DELETE CASCADE,
    source      VARCHAR(32) DEFAULT 'default',
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, artwork_id)
  );

  -- User stats
  CREATE TABLE IF NOT EXISTS user_stats (
    user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    duels_played  INTEGER DEFAULT 0,
    duels_won     INTEGER DEFAULT 0,
    story_chapter VARCHAR(32) DEFAULT 'chapter-1',
    starter_chosen VARCHAR(32) DEFAULT NULL
  );

  -- News articles (managed via admin UI)
  CREATE TABLE IF NOT EXISTS news (
    id            SERIAL PRIMARY KEY,
    slug          VARCHAR(128) UNIQUE NOT NULL,
    date_label    VARCHAR(32) NOT NULL,
    title_de      VARCHAR(255) NOT NULL,
    title_en      VARCHAR(255),
    summary_de    TEXT NOT NULL,
    summary_en    TEXT,
    content_de    TEXT NOT NULL,
    content_en    TEXT,
    tag           VARCHAR(64) NOT NULL,
    published     BOOLEAN DEFAULT TRUE,
    sort_order    INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
  );

  -- Roadmap phases (managed via admin UI)
  CREATE TABLE IF NOT EXISTS roadmap_phases (
    id            SERIAL PRIMARY KEY,
    slug          VARCHAR(128) UNIQUE NOT NULL,
    phase_label   VARCHAR(32) NOT NULL,
    title_de      VARCHAR(128) NOT NULL,
    title_en      VARCHAR(128),
    desc_de       TEXT,
    desc_en       TEXT,
    status        VARCHAR(16) NOT NULL DEFAULT 'upcoming',
    features_de   TEXT[],
    features_en   TEXT[],
    detail_de     TEXT,
    detail_en     TEXT,
    sort_order    INTEGER DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
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
