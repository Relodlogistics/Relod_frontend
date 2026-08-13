import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { buttonVariants } from '@/components/ui/button';

// Plain server component, deliberately no 'use client' — keeps this one page
// server-rendered rather than pulling in react-i18next like the rest of the
// marketing pages (see the marketing-pages client-rendering finding).
export const metadata: Metadata = {
  title: 'Page Not Found',
  description: "The page you're looking for doesn't exist or has moved.",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <Logo markSize={10} />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has moved. Head back to the homepage to
          keep going.
        </p>
      </div>
      <Link href="/" className={buttonVariants({ variant: 'default' })}>
        Back to Relod
      </Link>
    </div>
  );
}
