/**
 * Seed news + roadmap data — inserts existing hardcoded entries into the database.
 * Run with: npx tsx src/db/seed-news-roadmap.ts
 * Safe to re-run (uses ON CONFLICT DO UPDATE).
 */

import { pool } from '../config/db.js';

// News entries (German text only, English columns left NULL)
const newsEntries = [
  {
    slug: 'starter-decks',
    dateLabel: 'Bald',
    titleDe: 'Starter Deck Yugi und Kaiba',
    summaryDe: 'Die ersten Starterdecks werden bald im Shop verfuegbar sein. Verdiene DP durch Duelle und kaufe Booster-Packs.',
    contentDe: `Die ersten beiden Starterdecks kommen bald ins Spiel:

Starter Deck: Yugi
Das klassische Deck des Pharaos. Enthalten sind Karten wie Dunkler Magier, Mystischer Elf und Schwerter des Lichts. Ein ausgewogenes Deck fuer Einsteiger mit starken Zauberkarten.

Starter Deck: Kaiba
Das Kraftpaket von Seto Kaiba. Mit dem legendaeren Blauaeugigen Weissen Drachen, Kampfochse und maechtigen Fallenkarten. Ein aggressives Deck fuer Spieler die rohe Staerke bevorzugen.

Beide Decks werden im Shop fuer DP erhaeltlich sein. Verdiene DP durch Duelle und baue deine Sammlung auf.`,
    tag: 'Coming Soon',
    sort: 0,
  },
  {
    slug: 'launch',
    dateLabel: '16.03.2026',
    titleDe: 'Willkommen bei Duel Monsters Classic',
    summaryDe: 'Das Projekt ist gestartet. Die ersten Karten aus der DM-Aera sind verfuegbar. Erkunde den Kartenbrowser und stelle dein erstes Deck zusammen.',
    contentDe: `Duel Monsters Classic ist offiziell gestartet!

Was ist Duel Monsters Classic?
Ein Fan-Projekt das die goldene Aera von Yu-Gi-Oh! wiederaufleben laesst. Von den ersten Starter Decks bis hin zu den Elementarhelden — erlebe die Entwicklung des Kartenspiels wie im Anime.

Was ist bereits verfuegbar?
- Kartenbrowser mit allen Karten der DM- und fruehen GX-Aera
- Suche und Filter in Deutsch und Englisch
- Theme-System mit dem Orichalcos Gold Design
- Einstellungen fuer Sprache und Theme

Was kommt als naechstes?
Der Deckbuilder, das Account-System und der Shop stehen als naechstes auf der Roadmap. Schau auf der Home-Seite unter Roadmap fuer alle geplanten Features.`,
    tag: 'Launch',
    sort: 1,
  },
  {
    slug: 'patch-0-0-1',
    dateLabel: '16.03.2026',
    titleDe: 'Patch v0.0.1 — Erster Release',
    summaryDe: 'Kartenbrowser, Mehrsprachigkeit, Theme-System und die Home-Seite mit News, Roadmap und Community-Links.',
    contentDe: `Patch Notes v0.0.1

Neu:
- Kartenbrowser mit Suche und Filtern
- Zweisprachig: Deutsch und Englisch
- Karten werden in der gewaehlten Sprache angezeigt
- Suche findet Karten in beiden Sprachen
- Theme-System (Orichalcos Gold)
- Einstellungen-Modal mit Sprachauswahl und Theme-Wechsel
- Home-Seite mit News, Roadmap, Changelog, Stats und Community
- Server-Status Anzeige
- Floating Cards Hintergrund-Animation
- TitleScreen mit Login und Gast-Modus

Bekannte Einschraenkungen:
- Login ist noch nicht mit einem Backend verbunden
- DP und Stats sind noch Platzhalter
- Duell-Server noch nicht verfuegbar`,
    tag: 'Patch Notes',
    sort: 2,
  },
];

// Roadmap phases (German text only, English columns left NULL)
const roadmapPhases = [
  {
    slug: 'phase-1',
    phaseLabel: 'Phase 1',
    titleDe: 'Grundgeruest',
    descDe: 'Kartendatenbank und UI-Basis',
    status: 'done',
    featuresDe: ['Kartenbrowser', 'Suche und Filter', 'Mehrsprachigkeit DE/EN', 'Theme-System'],
    detailDe: `Phase 1 ist abgeschlossen.

Kartenbrowser
Alle Karten der DM- und fruehen GX-Aera sind im Browser verfuegbar. Ueber 1700 Karten koennen durchsucht und gefiltert werden.

Suche und Filter
Die Suche funktioniert in beiden Sprachen — du kannst "Dunkler Magier" oder "Dark Magician" eingeben und findest die Karte. Filter nach Typ (Monster, Zauber, Fallen) sind ebenfalls verfuegbar.

Mehrsprachigkeit
Die gesamte Oberflaeche ist auf Deutsch und Englisch verfuegbar. Kartennamen und Effekttexte werden in der gewaehlten Sprache angezeigt. Die jeweils andere Sprache wird als Zweitname angezeigt.

Theme-System
Das Orichalcos Gold Theme ist das Standard-Design. Weitere Themes koennen spaeter im Shop freigeschaltet werden.`,
    sort: 1,
  },
  {
    slug: 'phase-2',
    phaseLabel: 'Phase 2',
    titleDe: 'Deckbuilder und Accounts',
    descDe: 'Decks erstellen und Spielerprofile',
    status: 'active',
    featuresDe: ['Deckbuilder', 'Login / Register', 'Spielerprofil', 'Deck-Verwaltung'],
    detailDe: `Phase 2 ist aktuell in Arbeit.

Deckbuilder
Ein vollstaendiger Deckbuilder mit dem du Decks aus deiner Kartensammlung zusammenstellen kannst. Drag and Drop, Mana-Kurve und Deck-Validierung sind geplant.

Account-System
Registrierung und Login ueber den VPS-Server. Deine Decks, Sammlung und Fortschritt werden gespeichert.

Spielerprofil
Zeigt deine Stats, Sammlung und Decks an. Spaeter auch fuer andere Spieler sichtbar.

Deck-Verwaltung
Mehrere Decks speichern, umbenennen und loeschen. Import/Export im YDK-Format.`,
    sort: 2,
  },
  {
    slug: 'phase-3',
    phaseLabel: 'Phase 3',
    titleDe: 'Shop und Waehrung',
    descDe: 'DP verdienen und Karten sammeln',
    status: 'upcoming',
    featuresDe: ['DP-System', 'Booster-Packs', 'Starter Decks', 'Kartensammlung'],
    detailDe: `Phase 3 — Shop und Waehrung.

DP (Duell-Punkte)
Die In-Game-Waehrung. Verdiene DP durch Duelle, Story-Fortschritt und taegliche Quests.

Booster-Packs
Kaufe Booster-Packs mit DP. Jedes Pack enthaelt 5 Karten mit zufaelliger Seltenheit. Die Packs folgen den echten TCG-Sets.

Starter Decks
Vorgefertigte Decks wie Starter Deck Yugi und Starter Deck Kaiba. Ideal fuer den Einstieg.

Kartensammlung
Du kannst nur Karten in Decks verwenden die du auch besitzt. Sammle alle Karten der DM-Aera.`,
    sort: 3,
  },
  {
    slug: 'phase-4',
    phaseLabel: 'Phase 4',
    titleDe: 'Duell-Engine',
    descDe: 'Duelle gegen KI-Gegner',
    status: 'upcoming',
    featuresDe: ['Spielfeld', 'DM-Aera Regeln', 'KI-Gegner', 'Fusion und Ritual'],
    detailDe: `Phase 4 — Duell-Engine.

Die Duell-Engine basiert auf ygopro-core und laeuft auf dem VPS. Alle Regeln der DM-Aera werden unterstuetzt: Normal Summon, Tribute, Fusion, Ritual, Zauber, Fallen und Ketten.

KI-Gegner mit verschiedenen Decks und Schwierigkeitsgraden stehen als Sparringspartner bereit.`,
    sort: 4,
  },
  {
    slug: 'phase-5',
    phaseLabel: 'Phase 5',
    titleDe: 'Story und Quests',
    descDe: 'Anime-Progression erleben',
    status: 'upcoming',
    featuresDe: ['Story-Kapitel', 'Charakter-Duelle', 'Set-Progression', 'Taegliche Quests'],
    detailDe: `Phase 5 — Story-Modus und Quests.

Erlebe die Geschichte wie im Anime. Starte mit den Starter Decks und arbeite dich durch Duelist Kingdom, Battle City und weiter bis zur GX-Aera.

Taegliche und woechentliche Quests geben dir Ziele und belohnen dich mit DP.`,
    sort: 5,
  },
  {
    slug: 'phase-6',
    phaseLabel: 'Phase 6',
    titleDe: 'Online Multiplayer',
    descDe: 'Spieler gegen Spieler',
    status: 'upcoming',
    featuresDe: ['PvP-Duelle', 'Rangliste', 'Turniere', 'Freundesliste'],
    detailDe: `Phase 6 — Online Multiplayer.

Tritt gegen andere Spieler an. Ranglisten-Duelle, Freundschaftsspiele und Community-Turniere.`,
    sort: 6,
  },
];

async function seedNewsAndRoadmap() {
  console.log('Seeding news and roadmap data...');

  // Insert news entries
  for (const entry of newsEntries) {
    await pool.query(
      `INSERT INTO news (slug, date_label, title_de, summary_de, content_de, tag, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (slug) DO UPDATE SET
         date_label = EXCLUDED.date_label,
         title_de   = EXCLUDED.title_de,
         summary_de = EXCLUDED.summary_de,
         content_de = EXCLUDED.content_de,
         tag        = EXCLUDED.tag,
         sort_order = EXCLUDED.sort_order,
         updated_at = NOW()`,
      [entry.slug, entry.dateLabel, entry.titleDe, entry.summaryDe, entry.contentDe, entry.tag, entry.sort]
    );
  }
  console.log(`  ${newsEntries.length} news entries inserted/updated`);

  // Insert roadmap phases
  for (const phase of roadmapPhases) {
    await pool.query(
      `INSERT INTO roadmap_phases (slug, phase_label, title_de, desc_de, status, features_de, detail_de, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (slug) DO UPDATE SET
         phase_label = EXCLUDED.phase_label,
         title_de    = EXCLUDED.title_de,
         desc_de     = EXCLUDED.desc_de,
         status      = EXCLUDED.status,
         features_de = EXCLUDED.features_de,
         detail_de   = EXCLUDED.detail_de,
         sort_order  = EXCLUDED.sort_order,
         updated_at  = NOW()`,
      [phase.slug, phase.phaseLabel, phase.titleDe, phase.descDe, phase.status, phase.featuresDe, phase.detailDe, phase.sort]
    );
  }
  console.log(`  ${roadmapPhases.length} roadmap phases inserted/updated`);

  console.log('News and roadmap seeding complete.');
  await pool.end();
}

seedNewsAndRoadmap().catch((err) => {
  console.error('News/roadmap seeding failed:', err);
  process.exit(1);
});
