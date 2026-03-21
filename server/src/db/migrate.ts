/**
 * Database migration — creates all tables.
 * Run with: npm run db:migrate
 *
 * NOTE: This schema was cleaned up after a full DB wipe (2026-03-20).
 * All columns are in CREATE TABLE directly — no ALTER TABLE blocks needed.
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
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(128) UNIQUE NOT NULL,
    code            VARCHAR(32),
    type            VARCHAR(32) DEFAULT 'booster',
    wave            INTEGER DEFAULT 0,
    og_release_date VARCHAR(32),
    image_path      VARCHAR(255)
  );

  -- Cards master table (rarity is per card, not per set)
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
    rarity        VARCHAR(64),
    rarity_code   VARCHAR(16),
    ban_status    VARCHAR(16) DEFAULT NULL,
    image_path    VARCHAR(255)
  );

  -- Card-to-set mapping (which cards are in which set — rarity lives on cards, not here)
  CREATE TABLE IF NOT EXISTS card_set_entries (
    id          SERIAL PRIMARY KEY,
    card_id     INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    set_name    VARCHAR(128) REFERENCES card_sets(name) ON DELETE CASCADE,
    set_code    VARCHAR(32),
    artwork_id  INTEGER,
    quantity    SMALLINT NOT NULL DEFAULT 1
  );

  -- Preferred effect per card (null = normal, 'ghost', 'misprint')
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_cards' AND column_name = 'preferred_effect') THEN
      ALTER TABLE user_cards ADD COLUMN preferred_effect VARCHAR(16) DEFAULT NULL;
    END IF;
  END $$;

  -- Add is_ghost / is_misprint to card_set_entries (admin can mark specific cards as guaranteed ghost/misprint)
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_set_entries' AND column_name = 'is_ghost') THEN
      ALTER TABLE card_set_entries ADD COLUMN is_ghost BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_set_entries' AND column_name = 'is_misprint') THEN
      ALTER TABLE card_set_entries ADD COLUMN is_misprint BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
  END $$;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_card_set_entries_unique
    ON card_set_entries (card_id, set_name);
  CREATE INDEX IF NOT EXISTS idx_card_set_entries_set_name
    ON card_set_entries (set_name);

  -- Shop product config per set (prices, pack size, description)
  CREATE TABLE IF NOT EXISTS shop_set_config (
    id                SERIAL PRIMARY KEY,
    set_name          VARCHAR(128) REFERENCES card_sets(name) ON DELETE CASCADE UNIQUE,
    product_type      VARCHAR(32) NOT NULL DEFAULT 'booster',
    price_pack        INTEGER NOT NULL DEFAULT 120,
    pack_size         INTEGER NOT NULL DEFAULT 5,
    desc_de           TEXT,
    desc_en           TEXT,
    featured          BOOLEAN DEFAULT FALSE,
    sort_order        INTEGER DEFAULT 0,
    showcase_card_ids INTEGER[],
    showcase_animated BOOLEAN NOT NULL DEFAULT FALSE,
    shop_visible      BOOLEAN NOT NULL DEFAULT TRUE,
    shop_active       BOOLEAN NOT NULL DEFAULT FALSE,
    ig_release_date   DATE,
    is_event          BOOLEAN NOT NULL DEFAULT FALSE
  );

  -- Rarity pull rates per set (for booster pack opening)
  CREATE TABLE IF NOT EXISTS shop_rarity_rates (
    id         SERIAL PRIMARY KEY,
    set_name   VARCHAR(128) REFERENCES card_sets(name) ON DELETE CASCADE,
    rarity     VARCHAR(64) NOT NULL,
    rate_pct   NUMERIC(5,2) NOT NULL,
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
    id                   SERIAL PRIMARY KEY,
    user_id              INTEGER REFERENCES users(id) ON DELETE CASCADE,
    card_id              INTEGER NOT NULL,
    quantity             INTEGER DEFAULT 1,
    preferred_artwork_id INTEGER,
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

  -- Cards in a deck (one row per copy, with artwork + effect variant selection)
  CREATE TABLE IF NOT EXISTS deck_cards (
    id             SERIAL PRIMARY KEY,
    deck_id        INTEGER REFERENCES decks(id) ON DELETE CASCADE,
    card_id        INTEGER NOT NULL,
    quantity       INTEGER DEFAULT 1,
    artwork_id     INTEGER,
    copy_index     SMALLINT NOT NULL DEFAULT 0,
    effect_variant VARCHAR(16) DEFAULT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_deck_cards_copy
    ON deck_cards (deck_id, card_id, copy_index);

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

  -- User owned artworks (unlocked via pulls, events, achievements)
  -- Ghost Rare and Misprint are bonus variants stored per artwork.
  -- Same user can own normal + ghost + misprint of the same artwork.
  CREATE TABLE IF NOT EXISTS user_card_artworks (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
    card_id       INTEGER NOT NULL,
    artwork_id    INTEGER NOT NULL REFERENCES card_artworks(artwork_id) ON DELETE CASCADE,
    source        VARCHAR(32) DEFAULT 'default',
    is_ghost      BOOLEAN DEFAULT FALSE,
    is_misprint   BOOLEAN DEFAULT FALSE,
    misprint_data JSONB,
    acquired_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, artwork_id, is_ghost, is_misprint)
  );

  -- User stats
  CREATE TABLE IF NOT EXISTS user_stats (
    user_id        INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    duels_played   INTEGER DEFAULT 0,
    duels_won      INTEGER DEFAULT 0,
    story_chapter  VARCHAR(32) DEFAULT 'chapter-1',
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

  -- Data version counter (for client-side cache invalidation)
  CREATE TABLE IF NOT EXISTS data_version (
    id          INTEGER PRIMARY KEY DEFAULT 1,
    version     INTEGER DEFAULT 1,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
  );

  INSERT INTO data_version (id) VALUES (1) ON CONFLICT DO NOTHING;

  -- Shop featured carousel (admin-managed rotating banners)
  CREATE TABLE IF NOT EXISTS shop_featured (
    id           SERIAL PRIMARY KEY,
    product_type VARCHAR(32) NOT NULL,
    product_id   VARCHAR(128) NOT NULL,
    title_de     VARCHAR(255) NOT NULL,
    title_en     VARCHAR(255),
    subtitle_de  TEXT,
    subtitle_en  TEXT,
    image_path   VARCHAR(255),
    active       BOOLEAN DEFAULT TRUE,
    sort_order   INTEGER DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW()
  );

  -- Shop displays (independent product that bundles multiple booster sets)
  CREATE TABLE IF NOT EXISTS shop_displays (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(128) UNIQUE NOT NULL,
    code              VARCHAR(32),
    price             INTEGER NOT NULL DEFAULT 0,
    desc_de           TEXT,
    desc_en           TEXT,
    showcase_card_ids INTEGER[],
    showcase_animated BOOLEAN NOT NULL DEFAULT FALSE,
    ig_release_date   DATE,
    og_release_date   VARCHAR(32),
    shop_active       BOOLEAN DEFAULT FALSE,
    shop_visible      BOOLEAN NOT NULL DEFAULT TRUE,
    is_event          BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order        INTEGER DEFAULT 0,
    wave              INTEGER DEFAULT 0,
    created_at        TIMESTAMPTZ DEFAULT NOW()
  );

  -- Display contents (which booster sets are included in a display)
  CREATE TABLE IF NOT EXISTS shop_display_contents (
    id               SERIAL PRIMARY KEY,
    display_id       INTEGER NOT NULL REFERENCES shop_displays(id) ON DELETE CASCADE,
    booster_set_name VARCHAR(128) NOT NULL REFERENCES card_sets(name) ON DELETE CASCADE,
    pack_count       INTEGER NOT NULL DEFAULT 24,
    UNIQUE(display_id, booster_set_name)
  );

  -- Release windows (scheduled availability for products)
  CREATE TABLE IF NOT EXISTS shop_release_windows (
    id           SERIAL PRIMARY KEY,
    product_type VARCHAR(32) NOT NULL,
    product_id   VARCHAR(128) NOT NULL,
    start_date   DATE NOT NULL,
    end_date     DATE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_release_windows_product
    ON shop_release_windows(product_type, product_id);
  CREATE INDEX IF NOT EXISTS idx_shop_display_contents_display
    ON shop_display_contents(display_id);
  CREATE INDEX IF NOT EXISTS idx_shop_display_contents_booster
    ON shop_display_contents(booster_set_name);
  CREATE INDEX IF NOT EXISTS idx_decks_user
    ON decks(user_id);

  -- Auto-create missing shop_set_config for any card_sets without one
  INSERT INTO shop_set_config (set_name, product_type, price_pack, pack_size)
  SELECT
    cs.name,
    CASE WHEN cs.type = 'starter' OR cs.name ILIKE '%starter%' OR cs.name ILIKE '%structure%' THEN 'starter' ELSE 'booster' END,
    CASE WHEN cs.type = 'starter' OR cs.name ILIKE '%starter%' OR cs.name ILIKE '%structure%' THEN 600 ELSE 120 END,
    CASE WHEN cs.type = 'starter' OR cs.name ILIKE '%starter%' OR cs.name ILIKE '%structure%' THEN 40 ELSE 5 END
  FROM card_sets cs
  LEFT JOIN shop_set_config sc ON sc.set_name = cs.name
  WHERE sc.set_name IS NULL;
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
