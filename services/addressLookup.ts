/**
 * UK address autocomplete via getaddress.io.
 *
 * Phase's create-project flow asks for an address. Manual entry across
 * three fields on a phone keyboard is painful — especially for a tradie
 * standing in a wet kitchen in February. getaddress.io exposes a
 * pay-as-you-go REST API that takes a partial query and returns matching
 * UK addresses. The free tier is 20/day; the cheapest paid tier is ~£3/m
 * for a couple thousand lookups.
 *
 * The API key is set as `EXPO_PUBLIC_GETADDRESS_API_KEY` via EAS env
 * vars (see eas env:create). Because the key has no rate-limit
 * privileges beyond what the dashboard allows, embedding it in the JS
 * bundle is safe — the same model as the Supabase anon key.
 *
 * Docs: https://documentation.getaddress.io
 */

const API_BASE = 'https://api.getaddress.io';

/**
 * A short suggestion row — what the autocomplete endpoint returns. The
 * full structured address requires a second `getAddress(id)` call.
 */
export interface AddressSuggestion {
  /** UUID-like opaque id used to fetch the full address. */
  id: string;
  /** Human display string — "10 Downing Street, London, SW1A 2AA". */
  address: string;
}

/**
 * The structured address returned by the `get/{id}` endpoint. We map
 * this onto Phase's three project-create fields:
 *   - address_line_1 ← line_1 (with line_2 appended if non-empty)
 *   - city           ← town_or_city
 *   - postcode       ← postcode
 */
export interface FullAddress {
  line_1: string;
  line_2: string;
  town_or_city: string;
  postcode: string;
}

/** The three fields Phase stores. Returned from `resolveAddress()`. */
export interface ResolvedAddress {
  address_line_1: string;
  city: string;
  postcode: string;
}

function getApiKey(): string | null {
  const k = process.env.EXPO_PUBLIC_GETADDRESS_API_KEY;
  return k && k.length > 0 ? k : null;
}

/** Whether the address lookup is wired up. If false, callers should
 *  fall back to manual entry. Cheap synchronous check. */
export function isAddressLookupConfigured(): boolean {
  return getApiKey() !== null;
}

/**
 * Fetch autocomplete suggestions for a partial query.
 *
 * getaddress.io's autocomplete endpoint is fuzzy — "10 downing" or
 * "sw1a" both return matches. Empty / very short queries (<3 chars)
 * just return an empty array to avoid wasted requests.
 *
 * Throws on network failure or non-2xx response so the caller can show
 * an error state.
 */
export async function autocompleteAddress(query: string): Promise<AddressSuggestion[]> {
  const key = getApiKey();
  if (!key) throw new Error('Address lookup not configured');

  const q = query.trim();
  if (q.length < 3) return [];

  // `all=true` returns more variations including new-build addresses.
  // `top=8` caps results — enough for a useful dropdown without scroll.
  const url = `${API_BASE}/autocomplete/${encodeURIComponent(q)}?api-key=${encodeURIComponent(key)}&all=true&top=8`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Address lookup failed (${res.status}): ${body || res.statusText}`);
  }

  const data: { suggestions?: AddressSuggestion[] } = await res.json();
  return Array.isArray(data.suggestions) ? data.suggestions : [];
}

/**
 * Resolve a suggestion id into the three structured fields Phase stores.
 *
 * line_2 is appended to line_1 with a comma if it has content — this
 * keeps Phase's single-line "Address" field useful for flats, units,
 * etc., without forcing a separate "address line 2" field on the form.
 */
export async function resolveAddress(id: string): Promise<ResolvedAddress> {
  const key = getApiKey();
  if (!key) throw new Error('Address lookup not configured');

  const url = `${API_BASE}/get/${encodeURIComponent(id)}?api-key=${encodeURIComponent(key)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Address fetch failed (${res.status}): ${body || res.statusText}`);
  }

  const a: FullAddress = await res.json();

  const line_1 = (a.line_1 ?? '').trim();
  const line_2 = (a.line_2 ?? '').trim();
  const address_line_1 = line_2 ? `${line_1}, ${line_2}` : line_1;

  return {
    address_line_1,
    city: (a.town_or_city ?? '').trim(),
    postcode: (a.postcode ?? '').trim().toUpperCase(),
  };
}
