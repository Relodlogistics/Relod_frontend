import { ApiError } from '@/lib/api';

type T = (key: string, options?: Record<string, unknown>) => string;

// Backend validation messages are written for developers ("availableFromDate
// must be before availableToDate", "priceMax must be a decimal number...").
// Each rule maps a known one to a plain sentence for the person filling the
// form. Order matters: the first match wins, most specific first.
const RULES: { test: RegExp; key: string; place?: boolean }[] = [
  { test: /availableFromDate must be before availableToDate/i, key: 'postings.errDeliveryBeforePickup' },
  { test: /priceMax .*is required/i, key: 'postings.errActualBudgetRequired' },
  { test: /priceMax .*at least priceAmount/i, key: 'postings.budgetBelowMinimum' },
  { test: /Vehicle does not belong to this carrier/i, key: 'postings.errTruckNotYours' },
  { test: /Could not find a location matching/i, key: 'postings.errPlaceNotFound', place: true },
  { test: /(originLat|originLng|destinations\.\d+\.(lat|lng)|\blat\b|\blng\b).*(latitude|longitude)/i, key: 'postings.errLocationUnreadable' },
  { test: /destinations (should not be empty|must contain at least)/i, key: 'postings.errNoDestination' },
  { test: /(availableFromDate|availableToDate).*(ISO 8601|date)/i, key: 'postings.errInvalidDates' },
  { test: /(priceAmount|priceMax|priceMin).*(decimal|number)/i, key: 'postings.errBudgetNumber' },
  { test: /requiredCapacityTons.*(decimal|number)/i, key: 'postings.errWeightNumber' },
  { test: /requiredLengthFeet.*(decimal|number)/i, key: 'postings.errLengthNumber' },
  { test: /loadType/i, key: 'postings.errLoadType' },
];

// A message that names a code-style field ("priceMax", "originLat") and says
// what's wrong with it is a developer message even if no rule covers it yet;
// showing it verbatim would be the confusing thing this file exists to avoid.
const LOOKS_TECHNICAL = /\b[a-z]+[A-Z][A-Za-z]*\b.*\b(must|should)\b|\b(must|should)\b.*\b[a-z]+[A-Z][A-Za-z]*\b/;

/**
 * Turns anything thrown by an API call into a sentence a shipper or carrier
 * can act on. Human-written backend messages ("This truck's owner hasn't been
 * confirmed yet...") pass through unchanged; technical ones are translated.
 */
export function friendlyError(e: unknown, t: T): string {
  if (e instanceof ApiError) {
    const raw = e.message ?? '';
    for (const rule of RULES) {
      if (rule.test.test(raw)) {
        const place = rule.place ? raw.match(/"([^"]+)"/)?.[1] ?? '' : '';
        return t(rule.key, { place });
      }
    }
    if (e.status === 429) return t('errors.tooManyRequests');
    if (e.status >= 500) return t('errors.serverTrouble');
    if (e.status === 403 && !raw) return t('errors.noPermission');
    if (LOOKS_TECHNICAL.test(raw)) return t('errors.checkDetails');
    return raw || t('errors.generic');
  }
  // fetch() itself failed: offline, blocked, or the server unreachable.
  if (e instanceof TypeError) return t('errors.network');
  return t('errors.generic');
}
