import type { Metadata } from 'next';
import { LandingPage } from '@/components/marketing/LandingPage';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Post a Load, Match a Truck, Track Every Mile',
  description:
    "ReLod is India's direct load-truck marketplace. Post a load or truck, get a ranked shortlist of matches, message on WhatsApp in one tap, and track every trip live — device or mobile GPS.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: 'ReLod — Post a Load, Match a Truck, Track Every Mile',
    description:
      "India's direct load-truck marketplace — ranked carrier matching, one-tap WhatsApp outreach, and live GPS tracking.",
    url: SITE_URL,
    siteName: 'ReLod',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReLod — Post a Load, Match a Truck, Track Every Mile',
    description: "India's direct load-truck marketplace.",
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ReLod',
  url: SITE_URL,
  description:
    "ReLod is a direct marketplace connecting Indian shippers and truck owners, with ranked carrier matching, WhatsApp outreach and live GPS tracking.",
};

export default function LandingRoute() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingPage />
    </>
  );
}
