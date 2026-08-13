import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  markSize?: 8 | 9 | 10;
  // 'auth' uses a variant of the mark drawn on a soft lavender plate instead
  // of white — matches AuthBackground's rgb(244,242,254) ground (login,
  // driver login, the whole /register flow) where the plain white-plate mark
  // would show a visible box. Everywhere else (landing page, dashboards)
  // stays on the default white-plate mark.
  variant?: 'default' | 'auth';
}

export function Logo({ className, markSize = 8, variant = 'default' }: LogoProps) {
  const markSizePx = { 8: 32, 9: 36, 10: 40 }[markSize];
  const src = variant === 'auth' ? '/logo-auth.png' : '/logo.png';

  return (
    <Link href="/" className={cn('flex items-center gap-2', className)}>
      <Image
        src={src}
        alt="Relod"
        width={markSizePx}
        height={markSizePx}
        className="shrink-0"
        priority
      />
      <span className="font-display text-xl font-bold text-foreground">Relod</span>
    </Link>
  );
}
