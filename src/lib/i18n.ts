'use client';

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '@/locales/en/common.json';
import hi from '@/locales/hi/common.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिन्दी', short: 'हि' },
] as const;

if (!i18next.isInitialized) {
  i18next
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { common: en },
        hi: { common: hi },
      },
      fallbackLng: 'en',
      defaultNS: 'common',
      // 'cookie' (name 'locale') is read by getServerLocale() too, so
      // server-rendered marketing pages (About/Contact/FAQ/Terms/Privacy)
      // stay in sync with whatever language was last chosen client-side.
      detection: {
        order: ['cookie', 'localStorage', 'navigator'],
        caches: ['cookie', 'localStorage'],
        lookupCookie: 'locale',
        cookieMinutes: 525600, // 1 year, matches the cookie LanguageSwitcher writes directly for the refresh path
      },
      interpolation: { escapeValue: false },
    });
}

export default i18next;
