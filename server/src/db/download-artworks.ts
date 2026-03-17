/**
 * Artwork download script -- fetches all card artworks from YGOPRODeck API,
 * inserts them into card_artworks table, and downloads images locally.
 *
 * Safe to re-run: uses ON CONFLICT (artwork_id) DO NOTHING.
 *
 * Run with: npx tsx src/db/download-artworks.ts
 */

import { pool } from '../config/db.js';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGE_DIR = resolve(__dirname, '../../../public/images/cards');
const API_BASE = 'https://db.ygoprodeck.com/api/v7';
const DELAY_MS = 100; // 100ms between API calls = max 10 req/s (well under 20/s limit)
const LOG_INTERVAL = 50;

interface ApiCardImage {
  id: number;
  image_url: string;
  image_url_small: string;
  image_url_cropped: string;
}

interface ApiCardResponse {
  data: Array<{
    id: number;
    name: string;
    card_images: ApiCardImage[];
  }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchCardInfo(cardId: number): Promise<ApiCardResponse | null> {
  const url = `${API_BASE}/cardinfo.php?id=${cardId}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  API returned ${res.status} for card ${cardId}, skipping.`);
      return null;
    }
    return (await res.json()) as ApiCardResponse;
  } catch (err) {
    console.warn(`  Fetch error for card ${cardId}: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

async function downloadImage(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  Image download failed (${res.status}): ${url}`);
      return false;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buffer);
    return true;
  } catch (err) {
    console.warn(`  Image download error: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

async function main() {
  console.log('=== Artwork Download Script ===\n');

  // Ensure image directory exists
  await mkdir(IMAGE_DIR, { recursive: true });

  // 1. Get all card IDs from the database
  const cardResult = await pool.query<{ id: number }>(
    'SELECT id FROM cards ORDER BY id'
  );
  const allCardIds = cardResult.rows.map((r) => r.id);
  console.log(`Found ${allCardIds.length} cards in database.\n`);

  // 2. Find which cards already have artworks in the DB
  const existingResult = await pool.query<{ card_id: number }>(
    'SELECT DISTINCT card_id FROM card_artworks'
  );
  const existingCardIds = new Set(existingResult.rows.map((r) => r.card_id));
  console.log(`${existingCardIds.size} cards already have artworks in DB.`);

  // Filter to cards that need processing
  const pendingCardIds = allCardIds.filter((id) => !existingCardIds.has(id));
  console.log(`${pendingCardIds.length} cards need artwork fetching.\n`);

  if (pendingCardIds.length === 0) {
    console.log('All cards already have artworks. Nothing to do.');
    await pool.end();
    return;
  }

  // 3. Process each card
  let processed = 0;
  let totalArtworksInserted = 0;
  let totalImagesDownloaded = 0;
  let failedCards = 0;

  for (const cardId of pendingCardIds) {
    try {
      // Fetch card info from API
      const data = await fetchCardInfo(cardId);
      if (!data || !data.data || data.data.length === 0) {
        failedCards++;
        await sleep(DELAY_MS);
        processed++;
        continue;
      }

      const card = data.data[0];
      const images = card.card_images;

      if (!images || images.length === 0) {
        failedCards++;
        processed++;
        await sleep(DELAY_MS);
        continue;
      }

      // Insert each artwork
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const isDefault = i === 0;
        const label = i === 0 ? 'Original' : `Artwork ${i + 1}`;
        const imagePath = `/images/cards/${img.id}.jpg`;

        // Insert into card_artworks (idempotent)
        const insertResult = await pool.query(
          `INSERT INTO card_artworks (card_id, artwork_id, label, image_path, is_default)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (artwork_id) DO NOTHING`,
          [cardId, img.id, label, imagePath, isDefault]
        );

        if (insertResult.rowCount && insertResult.rowCount > 0) {
          totalArtworksInserted++;
        }

        // Download image (use small version for consistency with existing images)
        const destPath = resolve(IMAGE_DIR, `${img.id}.jpg`);
        if (!existsSync(destPath)) {
          const downloaded = await downloadImage(img.image_url_small, destPath);
          if (downloaded) {
            totalImagesDownloaded++;
          }
        }
      }
    } catch (err) {
      console.warn(`  Error processing card ${cardId}: ${err instanceof Error ? err.message : err}`);
      failedCards++;
    }

    processed++;

    // Log progress
    if (processed % LOG_INTERVAL === 0) {
      console.log(
        `Progress: ${processed}/${pendingCardIds.length} cards processed | ` +
        `${totalArtworksInserted} artworks inserted | ` +
        `${totalImagesDownloaded} images downloaded | ` +
        `${failedCards} failed`
      );
    }

    // Rate limit: wait between API calls
    await sleep(DELAY_MS);
  }

  // 4. Final summary
  const totalArtworks = await pool.query('SELECT COUNT(*) FROM card_artworks');
  const totalCards = await pool.query('SELECT COUNT(DISTINCT card_id) FROM card_artworks');

  console.log('\n=== Download Complete ===');
  console.log(`Cards processed:       ${processed}`);
  console.log(`Artworks inserted:     ${totalArtworksInserted}`);
  console.log(`Images downloaded:     ${totalImagesDownloaded}`);
  console.log(`Failed cards:          ${failedCards}`);
  console.log(`Total artworks in DB:  ${totalArtworks.rows[0].count}`);
  console.log(`Cards with artworks:   ${totalCards.rows[0].count}`);
  console.log('Done.');

  await pool.end();
}

main().catch((err) => {
  console.error('Artwork download failed:', err);
  process.exit(1);
});
