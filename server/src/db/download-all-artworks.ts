/**
 * Download ALL artworks for ALL cards — including alternative artworks.
 * Re-checks every card even if it already has an entry in card_artworks.
 * Downloads missing images and inserts missing artwork records.
 *
 * Run with: npx tsx src/db/download-all-artworks.ts
 */

import { pool } from '../config/db.js';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGE_DIR = resolve(__dirname, '../../../public/images/cards');
const API_BASE = 'https://db.ygoprodeck.com/api/v7';
const DELAY_MS = 100;
const LOG_INTERVAL = 50;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('=== Download ALL Artworks (including alternatives) ===\n');

  await mkdir(IMAGE_DIR, { recursive: true });

  // Get all card IDs
  const cardResult = await pool.query<{ id: number }>('SELECT id FROM cards ORDER BY id');
  const allCardIds = cardResult.rows.map((r) => r.id);
  console.log(`${allCardIds.length} cards in database.\n`);

  // Get all existing artwork IDs (to skip already-known artworks)
  const existingArtworks = await pool.query<{ artwork_id: number }>('SELECT artwork_id FROM card_artworks');
  const existingArtworkIds = new Set(existingArtworks.rows.map((r) => r.artwork_id));
  console.log(`${existingArtworkIds.size} artworks already in DB.\n`);

  let processed = 0;
  let newArtworks = 0;
  let newImages = 0;
  let cardsWithMultiple = 0;
  let failed = 0;

  for (const cardId of allCardIds) {
    try {
      const res = await fetch(`${API_BASE}/cardinfo.php?id=${cardId}`);
      if (!res.ok) {
        failed++;
        await sleep(DELAY_MS);
        processed++;
        continue;
      }

      const data = await res.json();
      const card = data.data?.[0];
      if (!card?.card_images) {
        failed++;
        await sleep(DELAY_MS);
        processed++;
        continue;
      }

      const images = card.card_images;
      if (images.length > 1) cardsWithMultiple++;

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const artworkId = img.id;

        // Skip if artwork already known
        if (existingArtworkIds.has(artworkId)) continue;

        const isDefault = i === 0;
        const label = i === 0 ? 'Original' : `Artwork ${i + 1}`;
        const imagePath = `/images/cards/${artworkId}.jpg`;

        // Insert artwork record
        await pool.query(
          `INSERT INTO card_artworks (card_id, artwork_id, label, image_path, is_default)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (artwork_id) DO NOTHING`,
          [cardId, artworkId, label, imagePath, isDefault]
        );
        existingArtworkIds.add(artworkId);
        newArtworks++;

        // Download image if not on disk
        const destPath = resolve(IMAGE_DIR, `${artworkId}.jpg`);
        if (!existsSync(destPath)) {
          try {
            const imgRes = await fetch(img.image_url);
            if (imgRes.ok) {
              const buffer = Buffer.from(await imgRes.arrayBuffer());
              await writeFile(destPath, buffer);
              newImages++;
            }
          } catch {
            // Skip failed image downloads
          }
        }
      }
    } catch {
      failed++;
    }

    processed++;
    if (processed % LOG_INTERVAL === 0) {
      console.log(`${processed}/${allCardIds.length} | +${newArtworks} artworks | +${newImages} images | ${cardsWithMultiple} multi-artwork cards`);
    }
    await sleep(DELAY_MS);
  }

  // Summary
  const totalArtworks = await pool.query('SELECT COUNT(*) as c FROM card_artworks');
  const multiCards = await pool.query('SELECT COUNT(*) as c FROM (SELECT card_id FROM card_artworks GROUP BY card_id HAVING COUNT(*) > 1) sub');

  console.log('\n=== Complete ===');
  console.log(`Processed:          ${processed} cards`);
  console.log(`New artworks:       ${newArtworks}`);
  console.log(`New images:         ${newImages}`);
  console.log(`Failed:             ${failed}`);
  console.log(`Total artworks DB:  ${totalArtworks.rows[0].c}`);
  console.log(`Multi-artwork cards: ${multiCards.rows[0].c}`);
  console.log('Done.');

  await pool.end();
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
