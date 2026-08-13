import type { Metadata } from 'next';
import { FaqContent } from '@/components/marketing/FaqContent';
import { SITE_URL } from '@/lib/site';
import { getServerLocale, createServerT } from '@/lib/server-i18n';

const DESCRIPTION =
  "Answers to common questions about how Relod's load matching, WhatsApp outreach, tracking and registration work.";

export const metadata: Metadata = {
  title: 'FAQ',
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/faq` },
  openGraph: {
    title: 'Relod FAQ',
    description: DESCRIPTION,
    url: `${SITE_URL}/faq`,
    siteName: 'Relod',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Relod FAQ',
    description: DESCRIPTION,
  },
};

const questionKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] as const;

export default async function FaqPage() {
  // Matches whatever locale FaqContent itself renders (via the same
  // getServerLocale()) — previously this was hardcoded to the English
  // dictionary regardless of which language the page actually showed.
  const locale = await getServerLocale();
  const t = createServerT(locale);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questionKeys.map((q) => ({
      '@type': 'Question',
      name: t(`marketing.faq.${q}Title`),
      acceptedAnswer: {
        '@type': 'Answer',
        text: t(`marketing.faq.${q}Body`),
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <FaqContent />
    </>
  );
}
