/**
 * Theme registry — metadata only.
 * Die CSS-Variablen selbst leben in styles/themes/{id}/variables.css.
 * Neues Theme = 1) Ordner + CSS anlegen, 2) hier registrieren, 3) in global.css importieren.
 */

export interface ThemeDefinition {
  id: string;
  nameKey: string;
  free: boolean;
  shopPrice?: number;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'orichalcos-gold',
    nameKey: 'themes.orichalcosGold',
    free: true,
  },
  // Zukünftige Themes:
  // { id: 'millennium-stone', nameKey: 'themes.millenniumStone', free: true },
  // { id: 'shadow-realm', nameKey: 'themes.shadowRealm', free: false, shopPrice: 500 },
  // { id: 'master-duel', nameKey: 'themes.masterDuel', free: false, shopPrice: 750 },
  // { id: 'egyptian-gold', nameKey: 'themes.egyptianGold', free: false, shopPrice: 500 },
  // { id: 'duel-links', nameKey: 'themes.duelLinks', free: false, shopPrice: 750 },
];

export function getThemeById(id: string): ThemeDefinition | undefined {
  return THEMES.find((t) => t.id === id);
}

export function getFreeThemes(): ThemeDefinition[] {
  return THEMES.filter((t) => t.free);
}

export function getShopThemes(): ThemeDefinition[] {
  return THEMES.filter((t) => !t.free);
}
