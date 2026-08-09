import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ className, markSize = 8 }: { className?: string; markSize?: 8 | 9 | 10 }) {
  const markSizeClass = {
    8: 'size-8 text-base',
    9: 'size-9 text-lg',
    10: 'size-10 text-lg',
  }[markSize];

  return (
    <Link href="/" className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl bg-primary font-display font-bold text-primary-foreground',
          markSizeClass,
        )}
      >
        R
      </span>
      <span className="font-display text-xl font-bold text-foreground">ReLod</span>
    </Link>
  );
}
