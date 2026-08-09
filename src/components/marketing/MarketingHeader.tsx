'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMarketingRole } from '@/lib/marketing-role-context';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/#loadboard', labelKey: 'marketing.nav.loadboard' },
  { href: '/#features', labelKey: 'marketing.nav.features' },
  { href: '/#how-it-works', labelKey: 'marketing.nav.howItWorks' },
  { href: '/about', labelKey: 'marketing.nav.about' },
  { href: '/faq', labelKey: 'marketing.nav.faq' },
  { href: '/contact', labelKey: 'marketing.nav.contact' },
];

function RoleSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { role, setRole } = useMarketingRole();
  // Select.Value renders the raw selected value by default (base-ui doesn't
  // auto-match it against SelectItem children) — the children-as-function
  // form is how you map "truck"/"shipper" to a short display label instead
  // of the full "I'm a Truck"/"I'm a Shipper" sentence used in the dropdown.
  const shortLabel: Record<'shipper' | 'truck', string> = {
    truck: t('marketing.nav.roleTruckShort'),
    shipper: t('marketing.nav.roleShipperShort'),
  };
  return (
    <Select value={role} onValueChange={(v) => v && setRole(v as 'shipper' | 'truck')}>
      <SelectTrigger className={cn('h-9 rounded-full px-3.5', className)}>
        <SelectValue>{(v: 'shipper' | 'truck') => shortLabel[v]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="truck">{t('marketing.nav.roleTruck')}</SelectItem>
        <SelectItem value="shipper">{t('marketing.nav.roleShipper')}</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function MarketingHeader() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                pathname === link.href && 'text-foreground',
              )}
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <RoleSwitcher />
          <LanguageSwitcher />
          <Button
            variant="outline"
            className="rounded-full"
            nativeButton={false}
            render={<Link href="/login">{t('marketing.nav.login')}</Link>}
          />
          <Button
            className="rounded-full"
            nativeButton={false}
            render={<Link href="/register/phone">{t('marketing.nav.register')}</Link>}
          />
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex size-9 items-center justify-center rounded-lg text-foreground md:hidden"
          aria-label={t('marketing.nav.toggleMenu')}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t bg-card px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex items-center gap-2">
            <RoleSwitcher />
            <LanguageSwitcher />
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              nativeButton={false}
              render={<Link href="/login">{t('marketing.nav.login')}</Link>}
            />
            <Button
              className="rounded-full"
              nativeButton={false}
              render={<Link href="/register/phone">{t('marketing.nav.register')}</Link>}
            />
          </div>
        </div>
      )}
    </header>
  );
}
