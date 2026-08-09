import type { Metadata } from 'next';
import { LegalContent } from '@/components/marketing/LegalContent';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy (Draft)',
  description: "ReLod's privacy policy (draft, pending legal review).",
  alternates: { canonical: `${SITE_URL}/privacy` },
  robots: { index: false },
};

export default function PrivacyPage() {
  return <LegalContent docKey="privacy" sectionCount={6} />;
}
