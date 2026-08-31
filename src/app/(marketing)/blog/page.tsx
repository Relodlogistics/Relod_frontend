import type { Metadata } from 'next';
import { Newspaper } from 'lucide-react';
import { SITE_URL } from '@/lib/site';

const DESCRIPTION =
  "Guides and updates from Relod on freight matching, truck booking, and moving loads across India.";

export const metadata: Metadata = {
  title: 'Blog',
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: 'Relod Blog',
    description: DESCRIPTION,
    url: `${SITE_URL}/blog`,
    siteName: 'Relod',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Relod Blog',
    description: DESCRIPTION,
  },
};

// Empty-state placeholder — swap for a real post listing once the first
// articles are written. Kept as its own route from day one so the header
// nav / sitemap / internal links never need to change later.
export default function BlogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
      <span className="text-sm font-semibold tracking-wide text-primary uppercase">Blog</span>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Coming soon
      </h1>
      <div className="mt-10 flex flex-col items-center gap-3 rounded-xl border bg-card p-10">
        <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <Newspaper className="size-6" />
        </span>
        <p className="max-w-md text-sm text-muted-foreground">
          We're working on guides and updates about freight matching, truck booking, and moving loads across India. Check back soon.
        </p>
      </div>
    </div>
  );
}
