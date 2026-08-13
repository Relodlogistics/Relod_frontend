import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({ className, markSize = 8 }: { className?: string; markSize?: 8 | 9 | 10 }) {
  const markSizePx = { 8: 32, 9: 36, 10: 40 }[markSize];

  return (
    <Link href="/" className={cn('flex items-center gap-2', className)}>
      <Image
        src="/logo.png"
        alt="ReLod"
        width={markSizePx}
        height={markSizePx}
        className="shrink-0"
        priority
      />
      <span className="font-display text-xl font-bold text-foreground">ReLod</span>
    </Link>
  );
}
