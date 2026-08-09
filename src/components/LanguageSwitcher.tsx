'use client';

import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const router = useRouter();
  const current = i18n.language?.split('-')[0] ?? 'en';

  const handleChange = (lang: string) => {
    i18n.changeLanguage(lang);
    // Mirrors the choice into a cookie (i18next's own detector only caches to
    // localStorage) so server components on the static marketing pages —
    // About/Contact/FAQ/Terms/Privacy — can read the same language via
    // getServerLocale() and render it server-side instead of only after
    // client hydration. router.refresh() re-runs those server components
    // immediately with the new cookie value.
    document.cookie = `locale=${lang}; path=/; max-age=31536000`;
    router.refresh();
  };

  return (
    <div className="flex items-center gap-1 rounded-full border bg-card px-2.5 py-1.5 shadow-sm">
      <Globe className="size-3.5 shrink-0 text-muted-foreground" />
      <select
        value={current}
        onChange={(e) => handleChange(e.target.value)}
        className="cursor-pointer bg-transparent text-xs font-medium text-foreground outline-none"
        aria-label="Change language"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} title={lang.label}>
            {lang.short}
          </option>
        ))}
      </select>
    </div>
  );
}
