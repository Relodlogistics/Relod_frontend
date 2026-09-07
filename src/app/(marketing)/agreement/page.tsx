import type { Metadata } from 'next';
import { LegalContent } from '@/components/marketing/LegalContent';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Shipper & Carrier Participation Agreement (Draft)',
  description: "Relod's Shipper & Carrier Participation Agreement (draft, pending legal review).",
  alternates: { canonical: `${SITE_URL}/agreement` },
  robots: { index: false },
};

export default function AgreementPage() {
  return <LegalContent docKey="agreement" sectionCount={28} />;
}
