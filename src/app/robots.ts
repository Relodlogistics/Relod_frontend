import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

const PUBLIC_PATHS = ['/', '/about', '/contact', '/faq'];

// /terms and /privacy are deliberately left crawlable (not disallowed) even
// though they carry `robots: { index: false }` in their own page metadata —
// blocking them here as well would stop crawlers from ever fetching the page
// to see that noindex tag, which can paradoxically leave them indexed
// with no snippet ("no information is available") instead of properly
// excluded. Letting the crawler in and relying on the per-page noindex is
// the correct way to keep a page out of search results.
const PRIVATE_PATHS = [
  '/dashboard',
  '/postings',
  '/bookings',
  '/lanes',
  '/notifications',
  '/register',
  '/login',
  '/admin',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Covers search engines (Googlebot, Bingbot) and AI crawlers that
        // fetch content live to cite in answers (e.g. ChatGPT-User,
        // PerplexityBot; Google's AI Overviews use the regular Googlebot) —
        // same access as a search engine, so ReLod is citable when people
        // ask AI assistants about India freight/trucking.
        userAgent: '*',
        allow: PUBLIC_PATHS,
        disallow: PRIVATE_PATHS,
      },
      {
        // AI model-training crawlers, listed explicitly so the intent is
        // documented rather than left to fall through the '*' rule above by
        // accident. Currently given the same access as everything else —
        // revisit this list if you'd rather opt certain bots out of training
        // use while still allowing the retrieval/citation bots above.
        userAgent: [
          'GPTBot',
          'Google-Extended',
          'CCBot',
          'anthropic-ai',
          'ClaudeBot',
          'Bytespider',
          'meta-externalagent',
        ],
        allow: PUBLIC_PATHS,
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
