/**
 * Card set definitions — DM era through early GX.
 * These control which cards are available at each progression stage.
 *
 * Sets are ordered chronologically as released in the TCG.
 * To add new sets: simply add an entry with the correct TCG set name
 * (must match the name from the YGOPRODeck API exactly).
 */

export type SetCategory = 'starter' | 'booster' | 'special';

export interface CardSetDefinition {
  name: string;
  wave: number;
  category: SetCategory;
  description: string;
}

export const CARD_SETS: CardSetDefinition[] = [
  // ============================================================
  // Wave 0 — Starter Decks (initial)
  // ============================================================
  { name: 'Starter Deck: Yugi', wave: 0, category: 'starter', description: 'Yugis Starterdeck' },
  { name: 'Starter Deck: Kaiba', wave: 0, category: 'starter', description: 'Kaibas Starterdeck' },

  // ============================================================
  // Wave 1 — Early Duel Monsters
  // ============================================================
  { name: 'Legend of Blue Eyes White Dragon', wave: 1, category: 'booster', description: 'Das erste Booster-Set' },
  { name: 'Metal Raiders', wave: 1, category: 'booster', description: 'Neue Fallen und Effektmonster' },
  { name: 'Starter Deck: Joey', wave: 1, category: 'starter', description: 'Joeys Starterdeck' },

  // ============================================================
  // Wave 2 — Duelist Kingdom Era
  // ============================================================
  { name: 'Spell Ruler', wave: 2, category: 'booster', description: 'Ritualmonster und Schnellzauber' },
  { name: 'Pharaoh\'s Servant', wave: 2, category: 'booster', description: 'Neue Fusionen und starke Zauber' },
  { name: 'Starter Deck: Pegasus', wave: 2, category: 'starter', description: 'Pegasus\' Starterdeck' },

  // ============================================================
  // Wave 3 — Battle City Era
  // ============================================================
  { name: 'Labyrinth of Nightmare', wave: 3, category: 'booster', description: 'Flip-Effekte und neue Strategien' },
  { name: 'Legacy of Darkness', wave: 3, category: 'booster', description: 'Dunkle Mächte erwachen' },
  { name: 'Pharaonic Guardian', wave: 3, category: 'booster', description: 'Ägyptische Macht' },
  { name: 'Starter Deck: Yugi Evolution', wave: 3, category: 'starter', description: 'Yugis weiterentwickeltes Deck' },
  { name: 'Starter Deck: Kaiba Evolution', wave: 3, category: 'starter', description: 'Kaibas weiterentwickeltes Deck' },

  // ============================================================
  // Wave 4 — Battle City Finals
  // ============================================================
  { name: 'Magician\'s Force', wave: 4, category: 'booster', description: 'Magier-Unterstützung' },
  { name: 'Dark Crisis', wave: 4, category: 'booster', description: 'Dunkelheit breitet sich aus' },

  // ============================================================
  // Wave 5 — Post-Battle City
  // ============================================================
  { name: 'Invasion of Chaos', wave: 5, category: 'booster', description: 'Chaos-Monster erscheinen' },
  { name: 'Ancient Sanctuary', wave: 5, category: 'booster', description: 'Antike Relikte' },

  // ============================================================
  // Wave 6 — Late DM / Transition to GX
  // ============================================================
  { name: 'Soul of the Duelist', wave: 6, category: 'booster', description: 'Die Seele des Duellanten' },
  { name: 'Rise of Destiny', wave: 6, category: 'booster', description: 'Das Schicksal erhebt sich' },
  { name: 'Flaming Eternity', wave: 6, category: 'booster', description: 'Ewige Flammen' },

  // ============================================================
  // Wave 7 — Early GX
  // ============================================================
  { name: 'The Lost Millennium', wave: 7, category: 'booster', description: 'Ein neues Jahrtausend' },
  { name: 'Cybernetic Revolution', wave: 7, category: 'booster', description: 'Cyber-Drachen erscheinen' },
  { name: 'Elemental Energy', wave: 7, category: 'booster', description: 'Elementarhelden und Neos' },
  { name: 'Shadow of Infinity', wave: 7, category: 'booster', description: 'Schatten der Unendlichkeit' },
  { name: 'Starter Deck: Jaden Yuki', wave: 7, category: 'starter', description: 'Jadens Elementarhelden-Deck' },
  { name: 'Starter Deck: Syrus Truesdale', wave: 7, category: 'starter', description: 'Syrus\' Maschinendeck' },
];

/**
 * Returns all set names up to (and including) the given wave.
 */
export function getAvailableSetNames(currentWave: number): string[] {
  return CARD_SETS
    .filter((set) => set.wave <= currentWave)
    .map((set) => set.name);
}

/**
 * Returns only sets of a specific category up to the given wave.
 */
export function getSetsByCategory(currentWave: number, category: SetCategory): CardSetDefinition[] {
  return CARD_SETS.filter(
    (set) => set.wave <= currentWave && set.category === category
  );
}
