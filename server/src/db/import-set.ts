/**
 * Import all cards of a set from YGOPRODeck API.
 * - Adds cards to `cards` table (skips existing)
 * - Downloads ALL artworks per card
 * - Creates card_set_entries with correct rarity
 *
 * Usage: npx tsx src/db/import-set.ts "Legend of Blue Eyes White Dragon"
 */

import { pool } from '../config/db.js';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { bumpDataVersion } from '../services/versionService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGE_DIR = resolve(__dirname, '../../../public/images/cards');
const API_BASE = 'https://db.ygoprodeck.com/api/v7';
const DELAY_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const setName = process.argv[2];
  if (!setName) {
    console.error('Usage: npx tsx src/db/import-set.ts "Set Name"');
    process.exit(1);
  }

  console.log(`\n=== Importing cards for: ${setName} ===\n`);

  // Check set exists in our DB
  const setCheck = await pool.query('SELECT name, code FROM card_sets WHERE name = $1', [setName]);
  if (setCheck.rows.length === 0) {
    console.error(`Set "${setName}" not found in card_sets table.`);
    await pool.end();
    process.exit(1);
  }
  console.log(`Set found: ${setCheck.rows[0].name} (${setCheck.rows[0].code})\n`);

  await mkdir(IMAGE_DIR, { recursive: true });

  // Fetch EN data first (has correct English names), then DE for translations
  console.log('Fetching English card data...');
  const enRes = await fetch(`${API_BASE}/cardinfo.php?cardset=${encodeURIComponent(setName)}`);
  if (!enRes.ok) {
    console.error(`EN API returned ${enRes.status}`);
    await pool.end();
    process.exit(1);
  }
  const enData = await enRes.json();
  const enCards = enData.data ?? [];

  console.log('Fetching German card data...');
  const deRes = await fetch(`${API_BASE}/cardinfo.php?cardset=${encodeURIComponent(setName)}&language=de`);
  const deData = deRes.ok ? await deRes.json() : { data: [] };
  const deCards = deData.data ?? [];

  // Build DE lookup by card ID
  const deMap = new Map<number, any>();
  for (const c of deCards) {
    deMap.set(c.id, c);
  }

  const apiCards = enCards;
  console.log(`API returned ${apiCards.length} cards (EN), ${deCards.length} cards (DE).\n`);

  let cardsInserted = 0;
  let cardsSkipped = 0;
  let artworksInserted = 0;
  let imagesDownloaded = 0;
  let setEntriesInserted = 0;

  for (let i = 0; i < apiCards.length; i++) {
    const c = apiCards[i];
    const cardId = c.id;
    const de = deMap.get(cardId);
    const nameEn = c.name;
    const nameDe = de?.name ?? c.misc_info?.[0]?.translated_name ?? nameEn;
    const descEn = c.desc;
    const descDe = de?.desc ?? c.misc_info?.[0]?.translated_desc ?? descEn;
    const typeEn = c.type;
    const typeDe = de?.type ?? typeEn;
    const raceEn = c.race;
    const raceDe = de?.race ?? raceEn;

    // 1. Insert card (skip if exists)
    const banStatus = c.banlist_info?.ban_tcg ?? null;
    const existing = await pool.query('SELECT id FROM cards WHERE id = $1', [cardId]);
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO cards (id, name_de, name_en, desc_de, desc_en, type_de, type_en, frame_type, atk, def, level, race_de, race_en, attribute, archetype, image_path, ban_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [cardId, nameDe, nameEn, descDe, descEn, typeDe, typeEn, c.frameType,
         c.atk ?? null, c.def ?? null, c.level ?? null,
         raceDe, raceEn, c.attribute ?? null, c.archetype ?? null,
         `/images/cards/${cardId}.jpg`, banStatus]
      );
      cardsInserted++;
    } else {
      cardsSkipped++;
    }

    // 2. Download ALL artworks
    const images = c.card_images ?? [];
    for (let j = 0; j < images.length; j++) {
      const img = images[j];
      const artworkId = img.id;
      const isDefault = j === 0;
      const label = j === 0 ? 'Original' : `Artwork ${j + 1}`;

      // Insert artwork record
      const artResult = await pool.query(
        `INSERT INTO card_artworks (card_id, artwork_id, label, image_path, is_default)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (artwork_id) DO NOTHING
         RETURNING id`,
        [cardId, artworkId, label, `/images/cards/${artworkId}.jpg`, isDefault]
      );
      if (artResult.rowCount && artResult.rowCount > 0) artworksInserted++;

      // Download image if not on disk
      const destPath = resolve(IMAGE_DIR, `${artworkId}.jpg`);
      if (!existsSync(destPath)) {
        try {
          const imgRes = await fetch(img.image_url);
          if (imgRes.ok) {
            const buffer = Buffer.from(await imgRes.arrayBuffer());
            await writeFile(destPath, buffer);
            imagesDownloaded++;
          }
        } catch { /* skip */ }
      }
    }

    // 3. Create set entry with rarity from API
    const cardSets = c.card_sets ?? [];
    const setEntry = cardSets.find((s: any) => s.set_name === setName);
    const rarity = setEntry?.set_rarity ?? 'Common';
    const rarityCode = setEntry?.set_rarity_code ?? 'C';
    const setCode = setEntry?.set_code ?? null;
    const defaultArtworkId = images.length > 0 ? images[0].id : null;

    await pool.query(
      `INSERT INTO card_set_entries (card_id, set_name, set_code, rarity, rarity_code, artwork_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (card_id, set_name) DO UPDATE SET rarity = EXCLUDED.rarity, rarity_code = EXCLUDED.rarity_code, artwork_id = EXCLUDED.artwork_id`,
      [cardId, setName, setCode, rarity, rarityCode, defaultArtworkId]
    );
    setEntriesInserted++;

    if ((i + 1) % 10 === 0) {
      console.log(`  ${i + 1}/${apiCards.length} — ${c.name}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n=== Import Complete: ${setName} ===`);
  console.log(`Cards inserted:      ${cardsInserted} (${cardsSkipped} already existed)`);
  console.log(`Artworks inserted:   ${artworksInserted}`);
  console.log(`Images downloaded:   ${imagesDownloaded}`);
  console.log(`Set entries created: ${setEntriesInserted}`);

  await bumpDataVersion();
  console.log('Data version bumped.');
  console.log('Done.\n');

  await pool.end();
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
