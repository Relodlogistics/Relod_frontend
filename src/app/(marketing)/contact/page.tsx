import type { Metadata } from 'next';
import { ContactContent } from '@/components/marketing/ContactContent';
import { SITE_URL } from '@/lib/site';

const DESCRIPTION =
  'Get in touch with the Relod team — support, questions about posting a load or truck, or partnership enquiries.';
const CONTACT_EMAIL = 'team@relod.in';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title: 'Contact Relod',
    description: DESCRIPTION,
    url: `${SITE_URL}/contact`,
    siteName: 'Relod',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Relod',
    description: DESCRIPTION,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  url: `${SITE_URL}/contact`,
  name: 'Contact Relod',
  description: DESCRIPTION,
  isPartOf: { '@type': 'WebSite', name: 'Relod', url: SITE_URL },
  mainEntity: {
    '@type': 'Organization',
    name: 'Relod',
    url: SITE_URL,
    contactPoint: {
      '@type': 'ContactPoint',
      email: CONTACT_EMAIL,
      contactType: 'customer support',
    },
  },
};

export default function ContactPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ContactContent />
    </>
  );
}
