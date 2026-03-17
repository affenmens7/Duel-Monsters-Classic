/**
 * News entries — single source of truth.
 * Add new entries at the top (newest first).
 */

export interface NewsEntry {
  id: string;
  date: string;
  title: string;
  summary: string;
  content: string;
  tag: string;
}

export const NEWS: NewsEntry[] = [
  {
    id: 'starter-decks',
    date: 'Bald',
    title: 'Starter Deck Yugi und Kaiba',
    summary: 'Die ersten Starterdecks werden bald im Shop verfuegbar sein. Verdiene DP durch Duelle und kaufe Booster-Packs.',
    content: `Die ersten beiden Starterdecks kommen bald ins Spiel:

Starter Deck: Yugi
Das klassische Deck des Pharaos. Enthalten sind Karten wie Dunkler Magier, Mystischer Elf und Schwerter des Lichts. Ein ausgewogenes Deck fuer Einsteiger mit starken Zauberkarten.

Starter Deck: Kaiba
Das Kraftpaket von Seto Kaiba. Mit dem legendaeren Blauaeugigen Weissen Drachen, Kampfochse und maechtigen Fallenkarten. Ein aggressives Deck fuer Spieler die rohe Staerke bevorzugen.

Beide Decks werden im Shop fuer DP erhaeltlich sein. Verdiene DP durch Duelle und baue deine Sammlung auf.`,
    tag: 'Coming Soon',
  },
  {
    id: 'launch',
    date: '16.03.2026',
    title: 'Willkommen bei Duel Monsters Classic',
    summary: 'Das Projekt ist gestartet. Die ersten Karten aus der DM-Aera sind verfuegbar. Erkunde den Kartenbrowser und stelle dein erstes Deck zusammen.',
    content: `Duel Monsters Classic ist offiziell gestartet!

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
  },
  {
    id: 'patch-0-0-1',
    date: '16.03.2026',
    title: 'Patch v0.0.1 — Erster Release',
    summary: 'Kartenbrowser, Mehrsprachigkeit, Theme-System und die Home-Seite mit News, Roadmap und Community-Links.',
    content: `Patch Notes v0.0.1

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
  },
];

export function getNewsById(id: string): NewsEntry | undefined {
  return NEWS.find((n) => n.id === id);
}
