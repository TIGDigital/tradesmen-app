// Edge Function: parse-quote-pdf
// Reads an uploaded quote PDF with Claude and returns structured line
// items to prefill the quote builder. The tradesman reviews everything
// before sending — the AI drafts, the human confirms.
//
// Auth: caller's JWT; the document row + storage object are fetched with
// an RLS-scoped client, so you can only parse documents on your own
// projects. The Anthropic key never leaves the server.
//
// Secrets: ANTHROPIC_API_KEY

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck — Deno globals resolve at deploy time.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const MAX_PDF_BYTES = 8 * 1024 * 1024;

const EXTRACTION_PROMPT = `This document is a quote or estimate from a UK tradesperson. Extract its pricing into this exact JSON shape:

{
  "items": [{ "description": string, "qty": number, "unit_price": number }],
  "discount_amount": number,
  "vat_registered": boolean,
  "notes": string,
  "document_total": number | null
}

Rules:
- Each distinct priced line of work or materials is one item. qty defaults to 1; unit_price is the per-unit price in pounds (never pence, never negative).
- If a line only has a total and a quantity, derive unit_price = total / qty.
- discount_amount is any discount in pounds (0 if none).
- vat_registered is true only if the document explicitly adds VAT.
- notes: payment terms, exclusions or assumptions stated on the document, in one short paragraph ('' if none).
- document_total: the final total printed on the document, or null if absent.
- Respond with ONLY the JSON object. No markdown fences, no commentary.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { document_id } = (await req.json()) as { document_id: string };
    if (!document_id) return json({ error: 'document_id is required' }, 400);

    const authHeader = req.headers.get('Authorization') ?? '';
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // RLS-scoped: only documents on the caller's projects resolve.
    const { data: doc, error: docErr } = await sb
      .from('project_documents')
      .select('id, storage_path, mime_type, file_name')
      .eq('id', document_id)
      .maybeSingle();
    if (docErr) return json({ error: docErr.message }, 400);
    if (!doc) return json({ error: 'Document not found' }, 404);
    if (doc.mime_type !== 'application/pdf') {
      return json({ error: 'Only PDF documents can be read for now' }, 400);
    }

    const { data: blob, error: dlErr } = await sb.storage
      .from('documents')
      .download(doc.storage_path);
    if (dlErr || !blob) return json({ error: 'Could not read the file from storage' }, 502);

    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes.byteLength > MAX_PDF_BYTES) {
      return json({ error: 'PDF is too large to read (8MB max)' }, 413);
    }

    // Base64 without blowing the call stack on large files.
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const b64 = btoa(binary);

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5-5',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: b64 },
              },
              { type: 'text', text: EXTRACTION_PROMPT },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      console.error('[parse-quote-pdf] anthropic error', aiRes.status, detail.slice(0, 300));
      return json({ error: 'The document reader is unavailable right now' }, 502);
    }

    const ai = await aiRes.json();
    // Join every text block — some model responses lead with non-text blocks.
    const text: string = (ai.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('\n');
    // Tolerate accidental fences or prose around the JSON.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return json({ error: 'Could not find quote details in that PDF' }, 422);

    let parsed;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return json({ error: 'Could not read quote details from that PDF' }, 422);
    }

    const items = (parsed.items ?? [])
      .filter(
        (i: Record<string, unknown>) =>
          typeof i.description === 'string' && i.description.trim().length > 0,
      )
      .map((i: Record<string, unknown>) => ({
        description: String(i.description).trim(),
        qty: Number(i.qty) > 0 ? Number(i.qty) : 1,
        unit_price: Math.max(0, Number(i.unit_price) || 0),
      }));

    if (items.length === 0) {
      return json({ error: 'No priced line items found in that PDF' }, 422);
    }

    return json({
      items,
      discount_amount: Math.max(0, Number(parsed.discount_amount) || 0),
      vat_registered: Boolean(parsed.vat_registered),
      notes: typeof parsed.notes === 'string' ? parsed.notes.trim() : '',
      document_total: parsed.document_total != null ? Number(parsed.document_total) : null,
    });
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Parse failed' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
