import { cookies } from 'next/headers';
import en from '@/locales/en/common.json';
import hi from '@/locales/hi/common.json';

const dictionaries = { en, hi } as const;
export type ServerLocale = keyof typeof dictionaries;

const LOCALE_COOKIE = 'locale';

/**
 * Server-side counterpart to react-i18next's useTranslation(), for marketing
 * pages that don't need any other client-side interactivity — lets them stay
 * server components (real HTML for crawlers/first paint) instead of pulling
 * in the whole i18next client bundle just to read static strings. Reads the
 * same `locale` cookie LanguageSwitcher writes, so a user's language choice
 * is honored on the very next server render, not just after client hydration.
 */
export async function getServerLocale(): Promise<ServerLocale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return value === 'hi' ? 'hi' : 'en';
}

function resolvePath(dict: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((node, key) => {
    if (node && typeof node === 'object' && key in node) {
      return (node as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict);
}

/** Mirrors i18next's {{var}} interpolation syntax used by a handful of marketing strings (e.g. legal.lastUpdated). */
function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

export function createServerT(locale: ServerLocale) {
  const dict = dictionaries[locale];
  return function t(key: string, vars?: Record<string, string | number>): string {
    const value = resolvePath(dict, key);
    if (typeof value !== 'string') return key;
    return interpolate(value, vars);
  };
}
