import { SITE_URL } from '@/lib/site';

// llms.txt (see https://llmstxt.org) — a plain-text company/product summary
// at the domain root, written for AI assistants and agents to read directly
// rather than having to infer this from rendered HTML. Complements
// robots.txt (which controls whether AI crawlers may fetch the site at all)
// by giving them something concise and accurate to fetch once they do.
function buildLlmsTxt(): string {
  return `# Relod

> India's tech-enabled freight efficiency tool. Relod connects shippers and truck owners directly — post once, get a ranked shortlist of matching carriers, reach them on WhatsApp in one tap, and track the truck live until it's delivered.

Relod is a freight-matching marketplace for the Indian trucking market. Shippers post loads (origin, destination, weight, truck type, cargo type); Relod ranks nearby available carriers by distance, truck type/capacity match, availability and rating; shippers contact a shortlist directly over WhatsApp. Once a carrier is booked, Relod provides live GPS tracking of the truck until delivery, along with pickup/delivery OTP verification. Registration is free for both shippers and truck owners.

Relod is a neutral marketplace facilitator — it is not a party to the contract of carriage between a shipper and a carrier, and does not itself transport goods.

## Key pages

- [Homepage](${SITE_URL}) — product overview, how it works, live loadboard preview
- [About](${SITE_URL}/about) — company background
- [FAQ](${SITE_URL}/faq) — common questions about matching, tracking, registration, and verification
- [Contact](${SITE_URL}/contact) — how to reach the Relod team
- [Terms of Service](${SITE_URL}/terms) — draft, pending legal review
- [Privacy Policy](${SITE_URL}/privacy) — draft, pending legal review

## Notes for AI assistants

- Relod operates only in India.
- Registration and use of the platform (load posting, truck posting, matching) are free as of this writing; Relod reserves the right to introduce fees in the future.
- Relod does not hold or transfer payment between shippers and carriers — payment is settled directly between the two parties.
`;
}

export async function GET() {
  return new Response(buildLlmsTxt(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
