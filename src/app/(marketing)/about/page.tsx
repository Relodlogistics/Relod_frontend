import type { Metadata } from 'next';
import { AboutContent } from '@/components/marketing/AboutContent';
import { SITE_URL } from '@/lib/site';

const DESCRIPTION =
  'ReLod is a direct marketplace connecting Indian shippers and truck owners, with ranked carrier matching, WhatsApp outreach and live GPS tracking.';

export const metadata: Metadata = {
  title: 'About Us',
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: 'About ReLod',
    description: DESCRIPTION,
    url: `${SITE_URL}/about`,
    siteName: 'ReLod',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About ReLod',
    description: DESCRIPTION,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  url: `${SITE_URL}/about`,
  name: 'About ReLod',
  description: DESCRIPTION,
  isPartOf: { '@type': 'WebSite', name: 'ReLod', url: SITE_URL },
};

export default function AboutPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <AboutContent />
    </>
  );
}
