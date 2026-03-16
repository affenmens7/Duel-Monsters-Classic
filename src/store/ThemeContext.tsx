/**
 * ThemeContext — manages the active theme.
 * Sets data-theme attribute on <html> — CSS handles the rest.
 * Persists selection in localStorage.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { THEMES, getThemeById, type ThemeDefinition } from '../config/themes';

interface ThemeContextValue {
  activeTheme: ThemeDefinition;
  setThemeById: (id: string) => void;
  unlockedThemeIds: string[];
  unlockTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY_THEME = 'dmc-theme';
const STORAGE_KEY_UNLOCKED = 'dmc-unlocked-themes';

function getDefaultUnlocked(): string[] {
  const free = THEMES.filter((t) => t.free).map((t) => t.id);
  const saved = localStorage.getItem(STORAGE_KEY_UNLOCKED);
  if (saved) {
    const parsed: string[] = JSON.parse(saved);
    return [...new Set([...free, ...parsed])];
  }
  return free;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [activeTheme, setActiveTheme] = useState<ThemeDefinition>(() => {
    const savedId = localStorage.getItem(STORAGE_KEY_THEME) ?? 'orichalcos-gold';
    return getThemeById(savedId) ?? THEMES[0];
  });

  const [unlockedThemeIds, setUnlockedThemeIds] = useState<string[]>(getDefaultUnlocked);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme.id);
    localStorage.setItem(STORAGE_KEY_THEME, activeTheme.id);
  }, [activeTheme]);

  function setThemeById(id: string) {
    const theme = getThemeById(id);
    if (theme && unlockedThemeIds.includes(id)) {
      setActiveTheme(theme);
    }
  }

  function unlockTheme(id: string) {
    setUnlockedThemeIds((prev) => {
      const next = [...new Set([...prev, id])];
      localStorage.setItem(STORAGE_KEY_UNLOCKED, JSON.stringify(next));
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ activeTheme, setThemeById, unlockedThemeIds, unlockTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
