/**
 * Seed shop data — inserts shop configuration for existing card sets + cosmetics.
 * Run with: npx tsx src/db/seed-shop.ts
 * Safe to re-run (uses ON CONFLICT DO UPDATE).
 */

import { pool } from '../config/db.js';

async function seedShop() {
  console.log('Seeding shop data...');

  // Shop config for card sets (booster packs + starter decks)
  const setConfigs = [
    { setName: 'Legend of Blue Eyes White Dragon', type: 'booster', pricePack: 120, packSize: 5, descDe: 'Das allererste Booster-Set. Blue-Eyes White Dragon, Dark Magician und Exodia warten auf dich.', descEn: 'The very first booster set. Blue-Eyes White Dragon, Dark Magician and Exodia await you.', featured: true, sort: 1 },
    { setName: 'Metal Raiders', type: 'booster', pricePack: 120, packSize: 5, descDe: 'Neue Fallen, Fusionsmonster und starke Effektmonster. Mirror Force und Gate Guardian!', descEn: 'New traps, fusion monsters and powerful effect monsters. Mirror Force and Gate Guardian!', featured: false, sort: 2 },
    { setName: 'Spell Ruler', type: 'booster', pricePack: 130, packSize: 5, descDe: 'Maechtige Zauberkarten und Ritualmonster. Relinquished und Thousand-Eyes Restrict!', descEn: 'Powerful spell cards and ritual monsters. Relinquished and Thousand-Eyes Restrict!', featured: false, sort: 3 },
    { setName: "Pharaoh's Servant", type: 'booster', pricePack: 130, packSize: 5, descDe: 'Jinzo, Imperial Order und staerkere Strategien fuer jeden Spieler.', descEn: 'Jinzo, Imperial Order and stronger strategies for every player.', featured: false, sort: 4 },
    { setName: 'Labyrinth of Nightmare', type: 'booster', pricePack: 130, packSize: 5, descDe: 'Spirit-Monster und neue Fallen aus dem Labyrinth der Albtraeume.', descEn: 'Spirit monsters and new traps from the Labyrinth of Nightmare.', featured: false, sort: 5 },
    { setName: 'Legacy of Darkness', type: 'booster', pricePack: 130, packSize: 5, descDe: 'Dunkle Krieger und Untote aus dem Vermaechtnis der Finsternis.', descEn: 'Dark warriors and undead from the Legacy of Darkness.', featured: false, sort: 6 },
    { setName: 'Dark Crisis', type: 'booster', pricePack: 140, packSize: 5, descDe: 'Die dunkle Krise bringt maechtige Krieger und neue Fusionsmonster.', descEn: 'The Dark Crisis brings powerful warriors and new fusion monsters.', featured: false, sort: 7 },
    { setName: 'Starter Deck: Yugi', type: 'starter', pricePack: 600, packSize: 40, descDe: 'Dark Magician, Summoned Skull und maechtige Zauberkarten. Ein vielseitiges Deck mit starker Magie.', descEn: 'Dark Magician, Summoned Skull and powerful spells. A versatile deck with strong magic.', featured: false, sort: 1 },
    { setName: 'Starter Deck: Kaiba', type: 'starter', pricePack: 600, packSize: 40, descDe: 'Blue-Eyes White Dragon und starke Krieger. Ein aggressives Deck mit roher Kraft.', descEn: 'Blue-Eyes White Dragon and strong warriors. An aggressive deck with raw power.', featured: false, sort: 2 },
  ];

  for (const cfg of setConfigs) {
    await pool.query(
      `INSERT INTO shop_set_config (set_name, product_type, price_pack, pack_size, desc_de, desc_en, featured, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (set_name) DO UPDATE SET
         product_type = EXCLUDED.product_type,
         price_pack = EXCLUDED.price_pack,
         pack_size = EXCLUDED.pack_size,
         desc_de = EXCLUDED.desc_de,
         desc_en = EXCLUDED.desc_en,
         featured = EXCLUDED.featured,
         sort_order = EXCLUDED.sort_order`,
      [cfg.setName, cfg.type, cfg.pricePack, cfg.packSize, cfg.descDe, cfg.descEn, cfg.featured, cfg.sort]
    );
  }
  console.log(`  ${setConfigs.length} set configs inserted/updated`);

  // Rarity pull rates (for each booster set)
  const defaultRates = [
    { rarity: 'Common', rate: 55, sort: 1 },
    { rarity: 'Rare', rate: 25, sort: 2 },
    { rarity: 'Super Rare', rate: 12, sort: 3 },
    { rarity: 'Ultra Rare', rate: 6, sort: 4 },
    { rarity: 'Secret Rare', rate: 2, sort: 5 },
  ];

  const boosterSets = setConfigs.filter((c) => c.type === 'booster');
  for (const set of boosterSets) {
    for (const rate of defaultRates) {
      await pool.query(
        `INSERT INTO shop_rarity_rates (set_name, rarity, rate_pct, sort_order)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (set_name, rarity) DO UPDATE SET
           rate_pct = EXCLUDED.rate_pct,
           sort_order = EXCLUDED.sort_order`,
        [set.setName, rate.rarity, rate.rate, rate.sort]
      );
    }
  }
  console.log(`  Rarity rates seeded for ${boosterSets.length} sets`);

  // Cosmetics
  const cosmetics = [
    { type: 'theme', id: 'shadow-realm', nameDe: 'Shadow Realm', nameEn: 'Shadow Realm', descDe: 'Dunkles Schattenreich-Theme', descEn: 'Dark Shadow Realm theme', price: 500, preview: 'linear-gradient(135deg, #1a0a2e, #0a0a1a)', sort: 1 },
    { type: 'theme', id: 'egyptian-gold', nameDe: 'Egyptian Gold', nameEn: 'Egyptian Gold', descDe: 'Goldenes aegyptisches Theme', descEn: 'Golden Egyptian theme', price: 500, preview: 'linear-gradient(135deg, #201a0a, #100e06)', sort: 2 },
    { type: 'theme', id: 'master-duel', nameDe: 'Master Duel', nameEn: 'Master Duel', descDe: 'Modernes Master Duel Theme', descEn: 'Modern Master Duel theme', price: 750, preview: 'linear-gradient(135deg, #0a1020, #060818)', sort: 3 },
    { type: 'theme', id: 'duel-links', nameDe: 'Duel Links', nameEn: 'Duel Links', descDe: 'Buntes Duel Links Theme', descEn: 'Colorful Duel Links theme', price: 750, preview: 'linear-gradient(135deg, #1a1030, #0a0818)', sort: 4 },
    { type: 'sleeve', id: 'millennium-puzzle', nameDe: 'Millennium Puzzle', nameEn: 'Millennium Puzzle', descDe: 'Goldenes Millennium-Puzzle Design', descEn: 'Golden Millennium Puzzle design', price: 300, preview: 'linear-gradient(135deg, #2a2010, #1a1508)', sort: 1 },
    { type: 'sleeve', id: 'blue-eyes', nameDe: 'Blue-Eyes White Dragon', nameEn: 'Blue-Eyes White Dragon', descDe: 'Blue-Eyes White Dragon Kartenhuelle', descEn: 'Blue-Eyes White Dragon card sleeve', price: 400, preview: 'linear-gradient(135deg, #101830, #080e1a)', sort: 2 },
    { type: 'sleeve', id: 'dark-magician', nameDe: 'Dark Magician', nameEn: 'Dark Magician', descDe: 'Dark Magician Kartenhuelle', descEn: 'Dark Magician card sleeve', price: 400, preview: 'linear-gradient(135deg, #1a0a30, #0e0620)', sort: 3 },
    { type: 'playmat', id: 'orichalcos-arena', nameDe: 'Orichalcos Arena', nameEn: 'Orichalcos Arena', descDe: 'Spielmatte mit Orichalcos-Siegel', descEn: 'Playmat with Orichalcos seal', price: 800, preview: 'linear-gradient(135deg, #0a1a18, #061210)', sort: 1 },
    { type: 'playmat', id: 'duelist-kingdom', nameDe: 'Duelist Kingdom', nameEn: 'Duelist Kingdom', descDe: 'Pegasus Insel-Arena Spielmatte', descEn: "Pegasus' island arena playmat", price: 800, preview: 'linear-gradient(135deg, #1a1a0a, #10100a)', sort: 2 },
  ];

  for (const c of cosmetics) {
    await pool.query(
      `INSERT INTO shop_cosmetics (item_type, item_id, name_de, name_en, desc_de, desc_en, price, preview_data, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (item_id) DO UPDATE SET
         item_type = EXCLUDED.item_type,
         name_de = EXCLUDED.name_de,
         name_en = EXCLUDED.name_en,
         desc_de = EXCLUDED.desc_de,
         desc_en = EXCLUDED.desc_en,
         price = EXCLUDED.price,
         preview_data = EXCLUDED.preview_data,
         sort_order = EXCLUDED.sort_order`,
      [c.type, c.id, c.nameDe, c.nameEn, c.descDe, c.descEn, c.price, c.preview, c.sort]
    );
  }
  console.log(`  ${cosmetics.length} cosmetics inserted/updated`);

  console.log('Shop seeding complete.');
  await pool.end();
}

seedShop().catch((err) => {
  console.error('Shop seeding failed:', err);
  process.exit(1);
});
