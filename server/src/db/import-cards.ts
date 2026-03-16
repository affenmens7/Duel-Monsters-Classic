/**
 * Card import script — downloads all DM/GX-era cards from YGOPRODeck API,
 * stores them in our database, and downloads card images locally.
 *
 * Run with: npx tsx src/db/import-cards.ts
 */

import { pool } from '../config/db.js';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGE_DIR = resolve(__dirname, '../../../public/images/cards');
const SET_IMAGE_DIR = resolve(__dirname, '../../../public/images/sets');

const API_BASE = 'https://db.ygoprodeck.com/api/v7';

// Our DM → GX sets (must match config/sets.ts)
const TARGET_SETS = [
  'Starter Deck: Yugi',
  'Starter Deck: Kaiba',
  'Starter Deck: Joey',
  'Starter Deck: Pegasus',
  'Starter Deck: Yugi Evolution',
  'Starter Deck: Kaiba Evolution',
  'Starter Deck: Jaden Yuki',
  'Starter Deck: Syrus Truesdale',
  'Legend of Blue Eyes White Dragon',
  'Metal Raiders',
  'Spell Ruler',
  'Pharaoh\'s Servant',
  'Labyrinth of Nightmare',
  'Legacy of Darkness',
  'Pharaonic Guardian',
  'Magician\'s Force',
  'Dark Crisis',
  'Invasion of Chaos',
  'Ancient Sanctuary',
  'Soul of the Duelist',
  'Rise of Destiny',
  'Flaming Eternity',
  'The Lost Millennium',
  'Cybernetic Revolution',
  'Elemental Energy',
  'Shadow of Infinity',
];

const ALLOWED_FRAMES = new Set(['normal', 'effect', 'ritual', 'fusion', 'spell', 'trap']);

interface ApiCard {
  id: number;
  name: string;
  type: string;
  frameType: string;
  desc: string;
  atk?: number;
  def?: number;
  level?: number;
  race: string;
  attribute?: string;
  archetype?: string;
  card_sets?: { set_name: string; set_code: string; set_rarity: string; set_rarity_code: string }[];
  card_images: { id: number; image_url: string; image_url_small: string }[];
}

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url} (${res.status})`);
  return res.json();
}

async function downloadImage(url: string, dest: string) {
  if (existsSync(dest)) return;
  const res = await fetch(url);
  if (!res.ok) return;
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buffer);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('Creating image directories...');
  await mkdir(IMAGE_DIR, { recursive: true });
  await mkdir(SET_IMAGE_DIR, { recursive: true });

  // 1. Register all target sets in DB
  console.log('Registering sets...');
  for (const setName of TARGET_SETS) {
    const type = setName.startsWith('Starter Deck') ? 'starter' : 'booster';
    await pool.query(
      `INSERT INTO card_sets (name, type) VALUES ($1, $2)
       ON CONFLICT (name) DO NOTHING`,
      [setName, type]
    );
  }

  // 2. Fetch all cards in both languages
  console.log('Fetching DE cards from API...');
  const deData = await fetchJson(`${API_BASE}/cardinfo.php?language=de`);
  const deCards: ApiCard[] = deData.data;

  console.log('Fetching EN cards from API...');
  const enData = await fetchJson(`${API_BASE}/cardinfo.php`);
  const enCards: ApiCard[] = enData.data;

  const enMap = new Map(enCards.map((c) => [c.id, c]));
  const targetSetNames = new Set(TARGET_SETS);

  // 3. Filter to DM/GX era
  const filteredCards: ApiCard[] = [];
  const cardSetMap = new Map<number, { set_name: string; set_code: string; rarity: string; rarity_code: string }[]>();

  for (const enCard of enCards) {
    if (!ALLOWED_FRAMES.has(enCard.frameType)) continue;
    if (!enCard.card_sets) continue;

    const matchingSets = enCard.card_sets.filter((s) => targetSetNames.has(s.set_name));
    if (matchingSets.length === 0) continue;

    filteredCards.push(enCard);
    cardSetMap.set(enCard.id, matchingSets.map((s) => ({
      set_name: s.set_name,
      set_code: s.set_code,
      rarity: s.set_rarity,
      rarity_code: s.set_rarity_code,
    })));
  }

  console.log(`Found ${filteredCards.length} cards in DM/GX era sets.`);

  // 4. Insert cards into DB + download images
  let imported = 0;
  for (const enCard of filteredCards) {
    const deCard = deCards.find((c) => c.id === enCard.id);

    await pool.query(
      `INSERT INTO cards (id, name_de, name_en, desc_de, desc_en, type_de, type_en, frame_type, atk, def, level, race_de, race_en, attribute, archetype, image_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (id) DO UPDATE SET
         name_de = EXCLUDED.name_de, name_en = EXCLUDED.name_en,
         desc_de = EXCLUDED.desc_de, desc_en = EXCLUDED.desc_en,
         type_de = EXCLUDED.type_de, type_en = EXCLUDED.type_en,
         frame_type = EXCLUDED.frame_type, atk = EXCLUDED.atk, def = EXCLUDED.def,
         level = EXCLUDED.level, race_de = EXCLUDED.race_de, race_en = EXCLUDED.race_en,
         attribute = EXCLUDED.attribute, archetype = EXCLUDED.archetype`,
      [
        enCard.id,
        deCard?.name ?? enCard.name,
        enCard.name,
        deCard?.desc ?? enCard.desc,
        enCard.desc,
        deCard?.type ?? enCard.type,
        enCard.type,
        enCard.frameType,
        enCard.atk ?? null,
        enCard.def ?? null,
        enCard.level ?? null,
        deCard?.race ?? enCard.race,
        enCard.race,
        enCard.attribute ?? null,
        enCard.archetype ?? null,
        `/images/cards/${enCard.id}.jpg`,
      ]
    );

    // Insert set entries
    const sets = cardSetMap.get(enCard.id) ?? [];
    for (const s of sets) {
      await pool.query(
        `INSERT INTO card_set_entries (card_id, set_name, set_code, rarity, rarity_code)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [enCard.id, s.set_name, s.set_code, s.rarity, s.rarity_code]
      );
    }

    // Download card image (small version)
    const imageUrl = enCard.card_images[0]?.image_url_small;
    if (imageUrl) {
      const imagePath = resolve(IMAGE_DIR, `${enCard.id}.jpg`);
      await downloadImage(imageUrl, imagePath);
    }

    imported++;
    if (imported % 100 === 0) {
      console.log(`  ${imported}/${filteredCards.length} cards imported...`);
      await sleep(500); // Rate limit respect
    }
  }

  // 5. Summary per set
  console.log('\n--- Cards per set ---');
  for (const setName of TARGET_SETS) {
    const result = await pool.query(
      'SELECT COUNT(*) FROM card_set_entries WHERE set_name = $1',
      [setName]
    );
    console.log(`  ${setName}: ${result.rows[0].count} cards`);
  }

  const totalCards = await pool.query('SELECT COUNT(*) FROM cards');
  console.log(`\nTotal: ${totalCards.rows[0].count} unique cards imported.`);
  console.log('Done!');

  await pool.end();
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
