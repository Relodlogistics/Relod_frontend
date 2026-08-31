'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Menu, X, ChevronDown } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLinkItem,
} from '@/components/ui/dropdown-menu';
import { useMarketingRole } from '@/lib/marketing-role-context';
import { cn } from '@/lib/utils';

// Flat, most-clicked items only — mirrors how peer sites (e.g. BlackBuck) keep
// the header to a handful of visual slots by grouping lower-traffic pages
// into a single dropdown instead of listing everything flat.
const NAV_LINKS = [
  { href: '/#loadboard', labelKey: 'marketing.nav.loadboard' },
  { href: '/#features', labelKey: 'marketing.nav.features' },
  { href: '/blog', labelKey: 'marketing.nav.blog' },
  { href: '/contact', labelKey: 'marketing.nav.contact' },
];

const COMPANY_LINKS = [
  { href: '/about', labelKey: 'marketing.nav.about' },
  { href: '/#how-it-works', labelKey: 'marketing.nav.howItWorks' },
  { href: '/faq', labelKey: 'marketing.nav.faq' },
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
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                'flex items-center gap-1 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground data-[popup-open]:text-foreground',
                COMPANY_LINKS.some((link) => pathname === link.href) && 'text-foreground',
              )}
            >
              {t('marketing.nav.company')}
              <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {COMPANY_LINKS.map((link) => (
                <DropdownMenuLinkItem key={link.href} render={<Link href={link.href} />}>
                  {t(link.labelKey)}
                </DropdownMenuLinkItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
            <div className="mt-1 flex flex-col gap-3 border-t pt-3">
              {COMPANY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {t(link.labelKey)}
                </Link>
              ))}
            </div>
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
