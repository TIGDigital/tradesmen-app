/**
 * UK postcode-first address lookup via getaddress.io.
 *
 * The classic UK e-commerce checkout pattern: user types a postcode,
 * picks from the list of addresses that share it. This is faster than
 * autocomplete-from-anywhere for Phase's tradesman flow because the
 * tradesman almost always has the postcode written down from the
 * customer call — typing a 7-character postcode beats typing "10 down…"
 * and waiting for suggestions.
 *
 * One API call per postcode (not per keystroke), so it's cheap to run
 * on the paid tier.
 *
 * The API key lives in EXPO_PUBLIC_GETADDRESS_API_KEY. It's safe to
 * embed in the JS bundle — getaddress.io issues a "domain token" model
 * separately for unrestricted client-side keys, and the dashboard caps
 * abuse via the per-minute IP throttle.
 *
 * Docs: https://documentation.getaddress.io
 */

const API_BASE = 'https://api.getaddress.io';

/**
 * The relevant subset of a getaddress.io address record. The /find
 * endpoint returns more fields (county, district, country, etc.) but
 * Phase only stores three.
 */
export interface FoundAddress {
  /** "10 Downing Street" — first non-empty address line from the API. */
  line_1: string;
  /** Optional second line ("Flat 4", "Building B"), often empty. */
  line_2: string;
  /** Town or city ("Westminster"). */
  town_or_city: string;
}

/** The three fields Phase stores on a project. */
export interface ResolvedAddress {
  address_line_1: string;
  city: string;
  postcode: string;
}

function getApiKey(): string | null {
  const k = process.env.EXPO_PUBLIC_GETADDRESS_API_KEY;
  return k && k.length > 0 ? k : null;
}

/** Whether the lookup is wired up. False → component shows manual entry. */
export function isAddressLookupConfigured(): boolean {
  return getApiKey() !== null;
}

/**
 * Normalise a UK postcode: strip non-alphanumerics, uppercase, insert a
 * single space before the last three characters. So "sw1a2aa" and
 * " SW1A 2AA " both normalise to "SW1A 2AA".
 */
export function normaliseUKPostcode(input: string): string {
  const compact = input.replace(/\s+/g, '').toUpperCase();
  if (compact.length < 5) return compact;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

/**
 * Permissive UK postcode regex. Matches the standard forms (SW1A 2AA,
 * M1 1AA, GIR 0AA) without being draconian about edge cases. Catches
 * obvious typos early so we don't waste an API call.
 */
export function isValidUKPostcode(input: string): boolean {
  const compact = input.replace(/\s+/g, '').toUpperCase();
  return /^(GIR0AA|[A-PR-UWYZ]([0-9]{1,2}|([A-HK-Y][0-9]([0-9ABEHMNPRV-Y])?))[0-9][ABD-HJLNP-UW-Z]{2})$/.test(
    compact,
  );
}

/**
 * Look up addresses at a UK postcode. Returns the array of matches.
 *
 * Throws with a friendly message on:
 *   - Invalid / malformed postcode (404 from API)
 *   - Authentication failure (401, 403)
 *   - Anything else non-2xx
 *
 * Empty result (postcode valid but no addresses on record) returns an
 * empty array, not an error — caller shows "no addresses found, enter
 * manually".
 */
export async function findAddressesByPostcode(
  postcode: string,
): Promise<FoundAddress[]> {
  const key = getApiKey();
  if (!key) throw new Error('Address lookup not configured');

  const normalised = normaliseUKPostcode(postcode);
  if (!isValidUKPostcode(normalised)) {
    throw new Error("That doesn't look like a UK postcode");
  }

  const url = `${API_BASE}/find/${encodeURIComponent(
    normalised,
  )}?api-key=${encodeURIComponent(key)}&expand=true`;

  const res = await fetch(url);

  if (res.status === 404) {
    // Postcode shape is valid but Royal Mail has no record. Empty list.
    return [];
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('Address lookup unauthorised — check API key');
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Address lookup failed (${res.status}): ${body || res.statusText}`);
  }

  const data: { addresses?: FoundAddress[] } = await res.json();
  return Array.isArray(data.addresses) ? data.addresses : [];
}

/**
 * Project a getaddress.io result + the original postcode into Phase's
 * three-field shape. Combines line_1 and line_2 with a comma when both
 * are present (e.g. "Flat 4, 10 Downing Street").
 */
export function toResolvedAddress(
  a: FoundAddress,
  postcode: string,
): ResolvedAddress {
  const line_1 = (a.line_1 ?? '').trim();
  const line_2 = (a.line_2 ?? '').trim();
  const address_line_1 = line_2 ? `${line_2}, ${line_1}` : line_1;
  return {
    address_line_1,
    city: (a.town_or_city ?? '').trim(),
    postcode: normaliseUKPostcode(postcode),
  };
}
