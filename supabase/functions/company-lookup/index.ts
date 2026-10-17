// Edge Function: company-lookup
// Looks up a UK company on the Companies House public register by company
// number, so the business-details screen can autofill the registered name
// and address. Read-only, public-register data.
//
// Auth: requires a signed-in caller (JWT verified by the platform). The
// Companies House key never leaves the server.
//
// Secrets (set via the Management API):
//   COMPANIES_HOUSE_API_KEY

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck — Deno globals resolve at deploy time.

import { corsHeaders } from '../_shared/cors.ts';

const CH_KEY = Deno.env.get('COMPANIES_HOUSE_API_KEY')!;

interface RequestBody {
  company_number: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { company_number } = (await req.json()) as RequestBody;
    const cleaned = (company_number ?? '').replace(/\s/g, '').toUpperCase();
    // Company numbers are 8 chars: digits, or a 2-letter prefix (SC/NI/OC…).
    if (!/^[A-Z0-9]{6,8}$/.test(cleaned)) {
      return json({ error: 'That does not look like a company number' }, 400);
    }

    const res = await fetch(
      `https://api.company-information.service.gov.uk/company/${encodeURIComponent(cleaned)}`,
      { headers: { Authorization: `Basic ${btoa(`${CH_KEY}:`)}` } },
    );

    if (res.status === 404) {
      return json({ error: 'No company found with that number' }, 404);
    }
    if (res.status === 429) {
      return json({ error: 'Too many lookups — try again in a few minutes' }, 429);
    }
    if (!res.ok) {
      return json({ error: `Companies House returned ${res.status}` }, 502);
    }

    const c = await res.json();
    const addr = c.registered_office_address ?? {};
    return json({
      company_number: c.company_number,
      company_name: c.company_name,
      company_status: c.company_status,
      company_type: c.type,
      date_of_creation: c.date_of_creation ?? null,
      registered_office: [
        addr.address_line_1,
        addr.address_line_2,
        addr.locality,
        addr.postal_code,
      ]
        .filter(Boolean)
        .join(', '),
    });
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Lookup failed' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
