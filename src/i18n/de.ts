/**
 * German translations — default language.
 */

export const de = {
  // Title Screen
  title: {
    gameName: 'Duell Monsters',
    subtitle: 'Classic',
    tagline: 'DM — GX Era',
    flavor: 'Die Schatten erwachen. Das Schicksal der Duellanten liegt in deinen Händen.',
    login: 'Anmelden',
    guestEnter: 'Als Gast fortfahren',
    enter: 'Eintreten',
    back: 'Zurück',
    username: 'Benutzername',
    password: 'Passwort',
    version: 'v{{version}}',
    credit: 'Ein Fan-Projekt',
  },

  // Navigation
  nav: {
    home: 'Home',
    cards: 'Karten',
    deckbuilder: 'Deckbuilder',
    shop: 'Shop',
    duel: 'Duell',
    story: 'Story',
    quests: 'Quests',
  },

  // Card Browser
  cards: {
    searchPlaceholder: 'Karte suchen...',
    allTypes: 'Alle Typen',
    normalMonster: 'Normal Monster',
    effectMonster: 'Effekt Monster',
    ritualMonster: 'Ritual Monster',
    fusionMonster: 'Fusion Monster',
    spellCards: 'Zauberkarten',
    trapCards: 'Fallenkarten',
    cardCount: '{{count}} Karten',
    noResults: 'Keine Karten gefunden.',
    loading: 'Lade Kartendaten...',
    errorTitle: 'Fehler beim Laden',
    retry: 'Erneut versuchen',
  },

  // Card Detail
  cardDetail: {
    attribute: 'Attribut',
    level: 'Level',
    type: 'Typ',
    containedIn: 'Enthalten in:',
    more: '+{{count}} weitere',
  },

  // Settings
  settings: {
    title: 'Einstellungen',
    language: 'Sprache',
    theme: 'Theme',
    german: 'Deutsch',
    english: 'English',
  },

  // Themes
  themes: {
    orichalcosGold: 'Orichalcos Gold',
    millenniumStone: 'Millennium Stone',
    shadowRealm: 'Schattenreich',
    masterDuel: 'Master Duel',
    duelLinks: 'Duel Links',
    egyptianGold: 'Ägyptisches Gold',
    cleanModern: 'Modern',
    locked: 'Gesperrt',
    unlockInShop: 'Im Shop freischaltbar',
    equipped: 'Aktiv',
  },

  // Common
  common: {
    dp: 'DP',
    close: 'Schließen',
    save: 'Speichern',
    cancel: 'Abbrechen',
  },
} as const;
