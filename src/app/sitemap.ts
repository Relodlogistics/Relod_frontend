import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// /terms and /privacy are intentionally excluded — both carry
// `robots: { index: false }` while pending legal review (see their page
// metadata), and a sitemap should only list pages you want indexed.
// Add them here once the drafts are finalized and noindex is removed.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
