import type { Metadata } from 'next';
import { LegalContent } from '@/components/marketing/LegalContent';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms of Service (Draft)',
  description: "ReLod's terms of service (draft, pending legal review).",
  alternates: { canonical: `${SITE_URL}/terms` },
  robots: { index: false },
};

export default function TermsPage() {
  return <LegalContent docKey="terms" sectionCount={7} />;
}
