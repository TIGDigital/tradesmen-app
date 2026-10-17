/**
 * UK postcode-first address lookup via ideal-postcodes.co.uk.
 *
 * The classic UK e-commerce checkout pattern: user types a postcode, picks
 * from the list of addresses that share it. ideal-postcodes.co.uk is a
 * Royal Mail PAF licensee — the gold-standard data source. The
 * /v1/postcodes endpoint returns every Royal Mail address record at a
 * given postcode.
 *
 * One API call per postcode (not per keystroke), so it stays cheap on
 * pay-as-you-go.
 *
 * The API key lives in EXPO_PUBLIC_IDEAL_POSTCODES_API_KEY. It's safe to
 * embed in the JS bundle — ideal-postcodes.co.uk gates abuse via URL
 * allow-lists and per-key usage caps configured in their dashboard.
 *
 * Docs: https://ideal-postcodes.co.uk/documentation
 */

const API_BASE = 'https://api.ideal-postcodes.co.uk/v1';

/** ideal-postcodes.co.uk's per-address result shape (the fields we use). */
interface IpAddress {
  line_1: string;
  line_2: string;
  line_3: string;
  post_town: string;
  postcode: string;
}

interface IpResponse {
  result?: IpAddress[];
  code: number;
  message: string;
}

/**
 * The relevant subset of a found address. Provider-agnostic shape — if we
 * ever swap providers again, only this file changes.
 */
export interface FoundAddress {
  /** "10 Downing Street" — primary street/building line. */
  line_1: string;
  /** Optional second line ("Flat 4", premises name, dependent locality). */
  line_2: string;
  /** Town or city ("Westminster", "London"). */
  town_or_city: string;
}

/** The three fields Phase stores on a project. */
export interface ResolvedAddress {
  address_line_1: string;
  city: string;
  postcode: string;
}

function getApiKey(): string | null {
  const k = process.env.EXPO_PUBLIC_IDEAL_POSTCODES_API_KEY;
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
 *   - Invalid / malformed postcode (caller-side validation)
 *   - Authentication failure (401)
 *   - Balance depleted (402)
 *   - URL not allow-listed (403)
 *   - Anything else non-2xx
 *
 * Empty result (postcode valid but no addresses on record) returns an
 * empty array, not an error — caller shows "no addresses found".
 */
/**
 * Outcome of a postcode lookup. 'addresses' is the full premise list from
 * the paid provider; 'town-only' is the free fallback (postcodes.io) used
 * when the paid provider is out of credit or misconfigured — the postcode
 * resolved to a town, and the user types the first address line themselves.
 */
export type AddressLookupOutcome =
  | { kind: 'addresses'; addresses: FoundAddress[] }
  | { kind: 'town-only'; town: string };

/**
 * Free fallback: postcodes.io (open data, no key, no premise-level
 * addresses). Resolves a postcode to its district/town so the form can
 * prefill city + postcode and only ask for the first address line.
 */
async function lookupTownFallback(normalised: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(normalised.replace(/\s/g, ''))}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.result?.admin_district ?? data?.result?.region ?? null;
  } catch {
    return null;
  }
}

/**
 * Postcode lookup with graceful degradation: paid premise-level lookup
 * first; if that is out of credit / unauthorised / unconfigured, fall
 * back to the free town-level lookup rather than dead-ending the form
 * (beta feedback 17 Oct — Ideal Postcodes credit ran out mid-testing).
 */
export async function findAddressesOutcome(postcode: string): Promise<AddressLookupOutcome> {
  const normalised = normaliseUKPostcode(postcode);
  if (!isValidUKPostcode(normalised)) {
    throw new Error("That doesn't look like a UK postcode");
  }

  try {
    const addresses = await findAddressesByPostcode(postcode);
    return { kind: 'addresses', addresses };
  } catch (e) {
    const town = await lookupTownFallback(normalised);
    if (town) return { kind: 'town-only', town };
    throw e;
  }
}

export async function findAddressesByPostcode(
  postcode: string,
): Promise<FoundAddress[]> {
  const key = getApiKey();
  if (!key) throw new Error('Address lookup not configured');

  const normalised = normaliseUKPostcode(postcode);
  if (!isValidUKPostcode(normalised)) {
    throw new Error("That doesn't look like a UK postcode");
  }

  const url = `${API_BASE}/postcodes/${encodeURIComponent(
    normalised,
  )}?api_key=${encodeURIComponent(key)}`;

  const res = await fetch(url);

  if (res.status === 404) {
    // Postcode shape is valid but Royal Mail has no record. Empty list.
    return [];
  }
  if (res.status === 401) {
    throw new Error('Address lookup unauthorised — check API key');
  }
  if (res.status === 402) {
    throw new Error('Address lookup out of credit — top up your account');
  }
  if (res.status === 403) {
    throw new Error('Address lookup blocked — URL not allow-listed');
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Address lookup failed (${res.status}): ${body || res.statusText}`);
  }

  const data: IpResponse = await res.json();
  const list = Array.isArray(data.result) ? data.result : [];

  // Map ideal-postcodes.co.uk's shape to our provider-agnostic shape.
  // line_2 can hold meaningful detail (premises name, dependent locality);
  // fold line_3 in on the rare occasions it's populated too.
  return list.map((a) => ({
    line_1: (a.line_1 ?? '').trim(),
    line_2: [a.line_2, a.line_3].filter(Boolean).join(', ').trim(),
    town_or_city: (a.post_town ?? '').trim(),
  }));
}

/**
 * Project a found address + the original postcode into Phase's three-field
 * shape. Combines line_1 and line_2 with a comma when both are present
 * (e.g. "Flat 4, 10 Downing Street").
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
