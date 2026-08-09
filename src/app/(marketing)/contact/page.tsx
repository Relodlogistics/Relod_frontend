import type { Metadata } from 'next';
import { ContactContent } from '@/components/marketing/ContactContent';
import { SITE_URL } from '@/lib/site';

const DESCRIPTION =
  'Get in touch with the ReLod team — support, questions about posting a load or truck, or partnership enquiries.';
const CONTACT_EMAIL = 'team@relod.in';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title: 'Contact ReLod',
    description: DESCRIPTION,
    url: `${SITE_URL}/contact`,
    siteName: 'ReLod',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact ReLod',
    description: DESCRIPTION,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  url: `${SITE_URL}/contact`,
  name: 'Contact ReLod',
  description: DESCRIPTION,
  isPartOf: { '@type': 'WebSite', name: 'ReLod', url: SITE_URL },
  mainEntity: {
    '@type': 'Organization',
    name: 'ReLod',
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
