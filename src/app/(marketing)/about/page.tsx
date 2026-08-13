import type { Metadata } from 'next';
import { AboutContent } from '@/components/marketing/AboutContent';
import { SITE_URL } from '@/lib/site';

const DESCRIPTION =
  'Relod is a tech-enabled efficiency tool connecting Indian shippers with multimodal transporting fleets, with ranked carrier matching, WhatsApp outreach and live GPS tracking.';

export const metadata: Metadata = {
  title: 'About Us',
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: 'About Relod',
    description: DESCRIPTION,
    url: `${SITE_URL}/about`,
    siteName: 'Relod',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Relod',
    description: DESCRIPTION,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  url: `${SITE_URL}/about`,
  name: 'About Relod',
  description: DESCRIPTION,
  isPartOf: { '@type': 'WebSite', name: 'Relod', url: SITE_URL },
};

export default function AboutPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <AboutContent />
    </>
  );
}
