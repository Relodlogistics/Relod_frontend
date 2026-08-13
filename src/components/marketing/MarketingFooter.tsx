'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

export function MarketingFooter() {
  const { t } = useTranslation();

  const columns = [
    {
      title: t('marketing.footer.companyTitle'),
      links: [
        { href: '/about', label: t('marketing.footer.about') },
        { href: '/contact', label: t('marketing.footer.contact') },
      ],
    },
    {
      title: t('marketing.footer.legalTitle'),
      links: [
        { href: '/terms', label: t('marketing.footer.terms') },
        { href: '/privacy', label: t('marketing.footer.privacy') },
      ],
    },
    {
      title: t('marketing.footer.productTitle'),
      links: [
        { href: '/register/phone', label: t('marketing.footer.forShippers') },
        { href: '/register/phone', label: t('marketing.footer.forCarriers') },
        { href: '/faq', label: t('marketing.footer.faq') },
      ],
    },
  ];

  return (
    <footer className="bg-[#1c1533] text-[#b9b2cf]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-4">
            <span className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Relod" width={36} height={36} className="shrink-0" />
              <span className="font-display text-xl font-bold text-white">Relod</span>
            </span>
            <p className="max-w-xs text-sm leading-relaxed text-[#9990b4]">
              {t('marketing.footer.tagline')}
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-4">
              <p className="font-display text-base font-bold text-white">{col.title}</p>
              <ul className="flex flex-col gap-3">
                {col.links.map((link, idx) => (
                  <li key={`${link.href}-${idx}`}>
                    <Link href={link.href} className="text-sm text-[#9990b4] transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-[#8e85aa] sm:flex-row sm:items-center sm:justify-between">
          <p>{t('marketing.footer.copyright', { year: new Date().getFullYear() })}</p>
          <p>{t('marketing.footer.madeIn')}</p>
        </div>
      </div>
    </footer>
  );
}
