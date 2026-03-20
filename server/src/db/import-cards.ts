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

const API_BASE = 'https://db.ygoprodeck.com/api/v7';

// All sets with code, type, wave and image info
interface SetDef {
  name: string;
  code: string;
  type: 'starter' | 'booster';
  wave: number;
}

const TARGET_SETS: SetDef[] = [
  // Wave 0 — Starter Decks (initial)
  { name: 'Starter Deck: Yugi', code: 'SDY', type: 'starter', wave: 0 },
  { name: 'Starter Deck: Kaiba', code: 'SDK', type: 'starter', wave: 0 },

  // Wave 1 — Early DM
  { name: 'Legend of Blue Eyes White Dragon', code: 'LOB', type: 'booster', wave: 1 },
  { name: 'Metal Raiders', code: 'MRD', type: 'booster', wave: 1 },
  { name: 'Starter Deck: Joey', code: 'SDJ', type: 'starter', wave: 1 },

  // Wave 2 — Duelist Kingdom
  { name: 'Spell Ruler', code: 'SRL', type: 'booster', wave: 2 },
  { name: 'Pharaoh\'s Servant', code: 'PSV', type: 'booster', wave: 2 },
  { name: 'Starter Deck: Pegasus', code: 'SDP', type: 'starter', wave: 2 },

  // Wave 3 — Battle City
  { name: 'Labyrinth of Nightmare', code: 'LON', type: 'booster', wave: 3 },
  { name: 'Legacy of Darkness', code: 'LOD', type: 'booster', wave: 3 },
  { name: 'Pharaonic Guardian', code: 'PGD', type: 'booster', wave: 3 },
  { name: 'Starter Deck: Yugi Evolution', code: 'SYE', type: 'starter', wave: 3 },
  { name: 'Starter Deck: Kaiba Evolution', code: 'SKE', type: 'starter', wave: 3 },

  // Wave 4 — Battle City Finals
  { name: 'Magician\'s Force', code: 'MFC', type: 'booster', wave: 4 },
  { name: 'Dark Crisis', code: 'DCR', type: 'booster', wave: 4 },

  // Wave 5 — Post-Battle City
  { name: 'Invasion of Chaos', code: 'IOC', type: 'booster', wave: 5 },
  { name: 'Ancient Sanctuary', code: 'AST', type: 'booster', wave: 5 },

  // Wave 6 — Late DM
  { name: 'Soul of the Duelist', code: 'SOD', type: 'booster', wave: 6 },
  { name: 'Rise of Destiny', code: 'RDS', type: 'booster', wave: 6 },
  { name: 'Flaming Eternity', code: 'FET', type: 'booster', wave: 6 },

  // Wave 7 — Early GX
  { name: 'The Lost Millennium', code: 'TLM', type: 'booster', wave: 7 },
  { name: 'Cybernetic Revolution', code: 'CRV', type: 'booster', wave: 7 },
  { name: 'Elemental Energy', code: 'EEN', type: 'booster', wave: 7 },
  { name: 'Shadow of Infinity', code: 'SOI', type: 'booster', wave: 7 },
  { name: 'Starter Deck: Jaden Yuki', code: 'YSDJ', type: 'starter', wave: 7 },
  { name: 'Starter Deck: Syrus Truesdale', code: 'YSDS', type: 'starter', wave: 7 },
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

  // 1. Register all target sets in DB
  console.log('Registering sets...');
  for (const set of TARGET_SETS) {
    await pool.query(
      `INSERT INTO card_sets (name, code, type, wave)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO UPDATE SET
         code = EXCLUDED.code, type = EXCLUDED.type, wave = EXCLUDED.wave`,
      [set.name, set.code, set.type, set.wave]
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
  const targetSetNames = new Set(TARGET_SETS.map((s) => s.name));

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

  // Rarity priority: highest rarity across all sets becomes the card's canonical rarity
  const RARITY_PRIORITY: Record<string, number> = {
    'Secret Rare': 0, 'Ultra Rare': 1, 'Super Rare': 2,
    'Rare': 3, 'Short Print': 5, 'Super Short Print': 5, 'Common': 5,
  };

  // Normalize Short Print / Super Short Print → Common
  function normalizeRarity(r: string): { rarity: string; rarity_code: string } {
    if (r === 'Short Print' || r === 'Super Short Print') return { rarity: 'Common', rarity_code: 'C' };
    return { rarity: r, rarity_code: '' };
  }

  function getHighestRarity(sets: { rarity: string; rarity_code: string }[]): { rarity: string; rarity_code: string } {
    let best = sets[0];
    for (const s of sets) {
      const cur = RARITY_PRIORITY[s.rarity] ?? 99;
      const prev = RARITY_PRIORITY[best.rarity] ?? 99;
      if (cur < prev) best = s;
    }
    return best;
  }

  // 4. Insert cards into DB + download images
  let imported = 0;
  for (const enCard of filteredCards) {
    const deCard = deCards.find((c) => c.id === enCard.id);
    const sets = cardSetMap.get(enCard.id) ?? [];
    const highest = getHighestRarity(sets);
    const normalized = normalizeRarity(highest.rarity);
    const rarity = normalized.rarity;
    const rarity_code = normalized.rarity_code || highest.rarity_code;

    await pool.query(
      `INSERT INTO cards (id, name_de, name_en, desc_de, desc_en, type_de, type_en, frame_type, atk, def, level, race_de, race_en, attribute, archetype, rarity, rarity_code, image_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (id) DO UPDATE SET
         name_de = EXCLUDED.name_de, name_en = EXCLUDED.name_en,
         desc_de = EXCLUDED.desc_de, desc_en = EXCLUDED.desc_en,
         type_de = EXCLUDED.type_de, type_en = EXCLUDED.type_en,
         frame_type = EXCLUDED.frame_type, atk = EXCLUDED.atk, def = EXCLUDED.def,
         level = EXCLUDED.level, race_de = EXCLUDED.race_de, race_en = EXCLUDED.race_en,
         attribute = EXCLUDED.attribute, archetype = EXCLUDED.archetype,
         rarity = EXCLUDED.rarity, rarity_code = EXCLUDED.rarity_code`,
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
        rarity,
        rarity_code,
        `/images/cards/${enCard.id}.jpg`,
      ]
    );

    // Insert set entries (no rarity here — lives on cards table)
    for (const s of sets) {
      await pool.query(
        `INSERT INTO card_set_entries (card_id, set_name, set_code)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [enCard.id, s.set_name, s.set_code]
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
  for (const setDef of TARGET_SETS) {
    const setName = setDef.name;
    const result = await pool.query(
      'SELECT COUNT(*) FROM card_set_entries WHERE set_name = $1',
      [setName]
    );
    console.log(`  ${setDef.name}: ${result.rows[0].count} cards`);
  }

  const totalCards = await pool.query('SELECT COUNT(*) FROM cards');
  console.log(`\nTotal: ${totalCards.rows[0].count} unique cards imported.`);

  // Rarity distribution
  console.log('\n--- Rarity distribution ---');
  const rarityDist = await pool.query(
    'SELECT rarity, COUNT(*) as count FROM cards GROUP BY rarity ORDER BY COUNT(*) DESC'
  );
  for (const row of rarityDist.rows) {
    console.log(`  ${row.rarity}: ${row.count}`);
  }

  console.log('Done!');

  await pool.end();
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
