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

  // Shop
  shop: {
    title: 'Card Shop',
    starterDecks: 'Starter Decks',
    boosters: 'Booster Packs',
    displays: 'Displays',
    cosmetics: 'Cosmetics',
    buy: 'Buy',
    bought: 'Owned',
    notAvailable: 'Coming soon',
    notEnoughDp: 'Not enough DP',
    cards: '{{count}} Cards',
    contains: 'Contains',
    starterYugi: 'Starter Deck: Yugi',
    starterYugiDesc: 'The classic Pharaoh deck with Dark Magician and powerful spells.',
    starterKaiba: 'Starter Deck: Kaiba',
    starterKaibaDesc: 'Seto Kaiba\'s powerhouse with Blue-Eyes White Dragon.',
    starterJoey: 'Starter Deck: Joey',
    starterJoeyDesc: 'Joey Wheeler\'s deck with Red-Eyes Black Dragon and warriors.',
    boosterLOB: 'Legend of Blue Eyes',
    boosterLOBDesc: 'The very first booster set. Contains legendary cards.',
    boosterMRD: 'Metal Raiders',
    boosterMRDDesc: 'Powerful traps and new effect monsters.',
    boosterSRL: 'Spell Ruler',
    boosterSRLDesc: 'Ritual monsters and mighty quick-play spells.',
    boosterPSV: 'Pharaohs Servant',
    boosterPSVDesc: 'New fusions and support cards.',
    displayLOB: 'Display: Legend of Blue Eyes',
    displayLOBDesc: '24 Booster Packs at a discount. 120 cards!',
    displayMRD: 'Display: Metal Raiders',
    displayMRDDesc: '24 Booster Packs at a discount. 120 cards!',
    themeShadowRealmDesc: 'Dark theme with red accents from the Shadow Realm.',
    themeMasterDuelDesc: 'Modern blue design in Master Duel style.',
    themeEgyptianGoldDesc: 'Egyptian gold on deep black.',
    themeDuelLinksDesc: 'Vibrant design with orange accents.',
    packOpening: 'Pack opened!',
    cardsReceived: 'You received the following cards:',
  },

  // Common
  common: {
    dp: 'DP',
    close: 'Close',
    save: 'Save',
    cancel: 'Cancel',
  },
} as const;
