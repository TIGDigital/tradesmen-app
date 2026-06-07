// Edge Function: send-invite-sms
// Invoked by the tradesman from the app. Looks up the project, generates an
// invite_code if missing, and sends an SMS via the Twilio REST API.
//
// Auth: the function uses the caller's JWT (Authorization header from
// supabase.functions.invoke). The supabase client we construct here uses
// that JWT so RLS enforces "you can only send invites for your own projects".
//
// Secrets (set via `supabase secrets set`):
//   TWILIO_SID, TWILIO_AUTH, TWILIO_FROM

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck — Deno globals + Supabase types resolve at deploy time.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const TWILIO_SID = Deno.env.get('TWILIO_SID')!;
const TWILIO_AUTH = Deno.env.get('TWILIO_AUTH')!;
const TWILIO_FROM = Deno.env.get('TWILIO_FROM')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

interface RequestBody {
  project_id: string;
}

function generateInviteCode(): string {
  // Short, hard-to-typo: 6 chars from an unambiguous alphabet (no 0/O/1/I).
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { project_id } = (await req.json()) as RequestBody;
    if (!project_id) {
      return json({ error: 'project_id is required' }, 400);
    }

    // Caller's JWT → RLS-scoped client.
    const authHeader = req.headers.get('Authorization') ?? '';
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // RLS will block this read if the caller is not the project's tradesman.
    const { data: project, error: fetchError } = await sb
      .from('projects')
      .select(
        'id, title, tradesman_id, pending_customer_phone, pending_customer_name, invite_code'
      )
      .eq('id', project_id)
      .single();

    if (fetchError || !project) {
      return json({ error: 'project not found or not authorised' }, 404);
    }
    if (!project.pending_customer_phone) {
      return json({ error: 'project has no customer phone to invite' }, 400);
    }

    // Get the tradesman's display name for the SMS body.
    const { data: tradesmanProfile } = await sb
      .from('profiles')
      .select('full_name')
      .eq('id', project.tradesman_id)
      .single();
    const tradesmanName = tradesmanProfile?.full_name ?? 'Your tradesman';

    // Generate invite_code if missing, persist it.
    let invite_code = project.invite_code;
    if (!invite_code) {
      invite_code = generateInviteCode();
      const { error: updateError } = await sb
        .from('projects')
        .update({ invite_code, invite_sent_at: new Date().toISOString() })
        .eq('id', project_id);
      if (updateError) return json({ error: `db update: ${updateError.message}` }, 500);
    } else {
      // Refresh invite_sent_at on re-send.
      await sb
        .from('projects')
        .update({ invite_sent_at: new Date().toISOString() })
        .eq('id', project_id);
    }

    const customerFirst = (project.pending_customer_name ?? 'there').split(' ')[0];
    const messageBody =
      `Hi ${customerFirst}, ${tradesmanName} invited you to follow ` +
      `your "${project.title}" project on Phase.\n\n` +
      `Open the Phase app and enter invite code: ${invite_code}`;

    // Twilio REST API: Basic auth = SID:AUTH, form body.
    const credentials = btoa(`${TWILIO_SID}:${TWILIO_AUTH}`);
    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: project.pending_customer_phone,
          From: TWILIO_FROM,
          Body: messageBody,
        }).toString(),
      }
    );

    const twilioJson = await twilioRes.json();
    if (!twilioRes.ok) {
      return json(
        {
          error: 'Twilio rejected the request',
          twilio_status: twilioRes.status,
          twilio_message: twilioJson.message ?? twilioJson,
        },
        502
      );
    }

    return json({ ok: true, invite_code, twilio_sid: twilioJson.sid });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
