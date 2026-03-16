/**
 * English translations.
 */

export const en = {
  // Title Screen
  title: {
    gameName: 'Duel Monsters',
    subtitle: 'Classic',
    tagline: 'DM — GX Era',
    flavor: 'The shadows awaken. The fate of the duelists lies in your hands.',
    login: 'Sign In',
    guestEnter: 'Continue as Guest',
    enter: 'Enter',
    back: 'Back',
    username: 'Username',
    password: 'Password',
    version: 'v{{version}}',
    credit: 'A Fan Project',
  },

  // Navigation
  nav: {
    home: 'Home',
    cards: 'Cards',
    deckbuilder: 'Deck Builder',
    shop: 'Shop',
    duel: 'Duel',
    story: 'Story',
    quests: 'Quests',
  },

  // Card Browser
  cards: {
    searchPlaceholder: 'Search cards...',
    allTypes: 'All Types',
    normalMonster: 'Normal Monster',
    effectMonster: 'Effect Monster',
    ritualMonster: 'Ritual Monster',
    fusionMonster: 'Fusion Monster',
    spellCards: 'Spell Cards',
    trapCards: 'Trap Cards',
    cardCount: '{{count}} Cards',
    noResults: 'No cards found.',
    loading: 'Loading card data...',
    errorTitle: 'Error loading data',
    retry: 'Retry',
  },

  // Card Detail
  cardDetail: {
    attribute: 'Attribute',
    level: 'Level',
    type: 'Type',
    containedIn: 'Contained in:',
    more: '+{{count}} more',
  },

  // Settings
  settings: {
    title: 'Settings',
    language: 'Language',
    theme: 'Theme',
    german: 'Deutsch',
    english: 'English',
  },

  // Themes
  themes: {
    orichalcosGold: 'Orichalcos Gold',
    millenniumStone: 'Millennium Stone',
    shadowRealm: 'Shadow Realm',
    masterDuel: 'Master Duel',
    duelLinks: 'Duel Links',
    egyptianGold: 'Egyptian Gold',
    cleanModern: 'Modern',
    locked: 'Locked',
    unlockInShop: 'Unlock in Shop',
    equipped: 'Active',
  },

  // Common
  common: {
    dp: 'DP',
    close: 'Close',
    save: 'Save',
    cancel: 'Cancel',
  },
} as const;
