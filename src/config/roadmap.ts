/**
 * Roadmap phases — single source of truth.
 * Each phase can have its own detail page via /app/roadmap/:id
 */

export type PhaseStatus = 'done' | 'active' | 'upcoming';

export interface RoadmapPhase {
  id: string;
  phase: string;
  title: string;
  desc: string;
  status: PhaseStatus;
  features: string[];
  detailContent: string;
}

export const ROADMAP_PHASES: RoadmapPhase[] = [
  {
    id: 'phase-1',
    phase: 'Phase 1',
    title: 'Grundgeruest',
    desc: 'Kartendatenbank und UI-Basis',
    status: 'done',
    features: ['Kartenbrowser', 'Suche und Filter', 'Mehrsprachigkeit DE/EN', 'Theme-System'],
    detailContent: `Phase 1 ist abgeschlossen.

Kartenbrowser
Alle Karten der DM- und fruehen GX-Aera sind im Browser verfuegbar. Ueber 1700 Karten koennen durchsucht und gefiltert werden.

Suche und Filter
Die Suche funktioniert in beiden Sprachen — du kannst "Dunkler Magier" oder "Dark Magician" eingeben und findest die Karte. Filter nach Typ (Monster, Zauber, Fallen) sind ebenfalls verfuegbar.

Mehrsprachigkeit
Die gesamte Oberflaeche ist auf Deutsch und Englisch verfuegbar. Kartennamen und Effekttexte werden in der gewaehlten Sprache angezeigt. Die jeweils andere Sprache wird als Zweitname angezeigt.

Theme-System
Das Orichalcos Gold Theme ist das Standard-Design. Weitere Themes koennen spaeter im Shop freigeschaltet werden.`,
  },
  {
    id: 'phase-2',
    phase: 'Phase 2',
    title: 'Deckbuilder und Accounts',
    desc: 'Decks erstellen und Spielerprofile',
    status: 'active',
    features: ['Deckbuilder', 'Login / Register', 'Spielerprofil', 'Deck-Verwaltung'],
    detailContent: `Phase 2 ist aktuell in Arbeit.

Deckbuilder
Ein vollstaendiger Deckbuilder mit dem du Decks aus deiner Kartensammlung zusammenstellen kannst. Drag and Drop, Mana-Kurve und Deck-Validierung sind geplant.

Account-System
Registrierung und Login ueber den VPS-Server. Deine Decks, Sammlung und Fortschritt werden gespeichert.

Spielerprofil
Zeigt deine Stats, Sammlung und Decks an. Spaeter auch fuer andere Spieler sichtbar.

Deck-Verwaltung
Mehrere Decks speichern, umbenennen und loeschen. Import/Export im YDK-Format.`,
  },
  {
    id: 'phase-3',
    phase: 'Phase 3',
    title: 'Shop und Waehrung',
    desc: 'DP verdienen und Karten sammeln',
    status: 'upcoming',
    features: ['DP-System', 'Booster-Packs', 'Starter Decks', 'Kartensammlung'],
    detailContent: `Phase 3 — Shop und Waehrung.

DP (Duell-Punkte)
Die In-Game-Waehrung. Verdiene DP durch Duelle, Story-Fortschritt und taegliche Quests.

Booster-Packs
Kaufe Booster-Packs mit DP. Jedes Pack enthaelt 5 Karten mit zufaelliger Seltenheit. Die Packs folgen den echten TCG-Sets.

Starter Decks
Vorgefertigte Decks wie Starter Deck Yugi und Starter Deck Kaiba. Ideal fuer den Einstieg.

Kartensammlung
Du kannst nur Karten in Decks verwenden die du auch besitzt. Sammle alle Karten der DM-Aera.`,
  },
  {
    id: 'phase-4',
    phase: 'Phase 4',
    title: 'Duell-Engine',
    desc: 'Duelle gegen KI-Gegner',
    status: 'upcoming',
    features: ['Spielfeld', 'DM-Aera Regeln', 'KI-Gegner', 'Fusion und Ritual'],
    detailContent: `Phase 4 — Duell-Engine.

Die Duell-Engine basiert auf ygopro-core und laeuft auf dem VPS. Alle Regeln der DM-Aera werden unterstuetzt: Normal Summon, Tribute, Fusion, Ritual, Zauber, Fallen und Ketten.

KI-Gegner mit verschiedenen Decks und Schwierigkeitsgraden stehen als Sparringspartner bereit.`,
  },
  {
    id: 'phase-5',
    phase: 'Phase 5',
    title: 'Story und Quests',
    desc: 'Anime-Progression erleben',
    status: 'upcoming',
    features: ['Story-Kapitel', 'Charakter-Duelle', 'Set-Progression', 'Taegliche Quests'],
    detailContent: `Phase 5 — Story-Modus und Quests.

Erlebe die Geschichte wie im Anime. Starte mit den Starter Decks und arbeite dich durch Duelist Kingdom, Battle City und weiter bis zur GX-Aera.

Taegliche und woechentliche Quests geben dir Ziele und belohnen dich mit DP.`,
  },
  {
    id: 'phase-6',
    phase: 'Phase 6',
    title: 'Online Multiplayer',
    desc: 'Spieler gegen Spieler',
    status: 'upcoming',
    features: ['PvP-Duelle', 'Rangliste', 'Turniere', 'Freundesliste'],
    detailContent: `Phase 6 — Online Multiplayer.

Tritt gegen andere Spieler an. Ranglisten-Duelle, Freundschaftsspiele und Community-Turniere.`,
  },
];

export function getPhaseById(id: string): RoadmapPhase | undefined {
  return ROADMAP_PHASES.find((p) => p.id === id);
}
