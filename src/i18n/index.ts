/**
 * i18n configuration — initializes i18next with DE + EN.
 * Import this once in main.tsx.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { de } from './de';
import { en } from './en';

const savedLang = localStorage.getItem('dmc-language') ?? 'de';

i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'de',
  interpolation: {
    escapeValue: false,
  },
});

export { i18n };
