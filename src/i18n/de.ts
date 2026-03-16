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

  // Shop
  shop: {
    title: 'Kartenladen',
    starterDecks: 'Starter Decks',
    boosters: 'Booster Packs',
    displays: 'Displays',
    cosmetics: 'Kosmetik',
    buy: 'Kaufen',
    bought: 'Gekauft',
    notAvailable: 'Bald verfuegbar',
    notEnoughDp: 'Nicht genug DP',
    cards: '{{count}} Karten',
    contains: 'Enthaelt',
    starterYugi: 'Starter Deck: Yugi',
    starterYugiDesc: 'Das klassische Deck des Pharaos mit Dunkler Magier und starken Zauberkarten.',
    starterKaiba: 'Starter Deck: Kaiba',
    starterKaibaDesc: 'Seto Kaibas Kraftpaket mit dem Blauaeugigen Weissen Drachen.',
    starterJoey: 'Starter Deck: Joey',
    starterJoeyDesc: 'Joey Wheelers Deck mit Rotaeugigem Schwarzen Drachen und Kriegern.',
    boosterLOB: 'Legend of Blue Eyes',
    boosterLOBDesc: 'Das allererste Booster-Set. Enthaelt legendaere Karten.',
    boosterMRD: 'Metal Raiders',
    boosterMRDDesc: 'Starke Fallen und neue Effektmonster.',
    boosterSRL: 'Spell Ruler',
    boosterSRLDesc: 'Ritualmonster und maechtige Schnellzauber.',
    boosterPSV: 'Pharaohs Servant',
    boosterPSVDesc: 'Neue Fusionen und Unterstuetzungskarten.',
    displayLOB: 'Display: Legend of Blue Eyes',
    displayLOBDesc: '24 Booster Packs zum Vorteilspreis. 120 Karten!',
    displayMRD: 'Display: Metal Raiders',
    displayMRDDesc: '24 Booster Packs zum Vorteilspreis. 120 Karten!',
    themeShadowRealmDesc: 'Dunkles Theme mit roten Akzenten aus dem Schattenreich.',
    themeMasterDuelDesc: 'Modernes blaues Design im Master Duel Stil.',
    themeEgyptianGoldDesc: 'Aegyptisches Gold auf tiefem Schwarz.',
    themeDuelLinksDesc: 'Lebhaftes Design mit Orange-Akzenten.',
    packOpening: 'Pack geoeffnet!',
    cardsReceived: 'Du hast folgende Karten erhalten:',
  },

  // Common
  common: {
    dp: 'DP',
    close: 'Schließen',
    save: 'Speichern',
    cancel: 'Abbrechen',
  },
} as const;
