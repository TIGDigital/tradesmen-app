// Edge Function: delete-my-account
// Invoked by the signed-in user from the app to permanently delete their
// Phase account. Required by the App Store (since 2022 Apple has rejected
// apps that don't offer in-app account deletion).
//
// Auth: caller's JWT identifies them. We re-verify on the server with the
// anon key + their Authorization header, then switch to the service-role
// client for the actual destructive work (auth.users is protected from
// regular user deletes by Supabase).
//
// What gets deleted:
//   - For tradesmen: every project they own (cascade takes updates, media,
//     reactions, messages, milestones, crew rows, snags, documents — every
//     downstream row keyed on project_id).
//   - For everyone: auth.users row (cascades to profiles + push_tokens +
//     notifications + any other table keyed on the user_id).
//
// For customers and apprentices we don't explicitly nuke the projects they
// were on — those belong to a tradesman, not them. Cascade FKs on
// project_crew, project_updates.author_id (SET NULL or CASCADE depending
// on the column) handle their personal data on shared rows.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck — Deno globals + Supabase types resolve at deploy time.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    // Step 1: verify the JWT belongs to a real user. We use the anon key
    // here, NOT the service role — the JWT identifies *who* is making the
    // request, and we trust Supabase's verification.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) {
      return json({ error: 'Invalid session' }, 401);
    }
    const userId = userRes.user.id;

    // Step 2: switch to the service-role client for the destructive work.
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 3: look up role so we know whether to nuke their projects.
    // Service role bypasses RLS.
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    // Step 4: tradesmen own projects — cascade those down explicitly so the
    // delete isn't dependent on whether the projects.tradesman_id FK uses
    // CASCADE or SET NULL. Belt-and-braces. Customers + apprentices don't
    // own anything; their per-row data is cleaned up by the cascade off
    // auth.users in step 5.
    if (profile?.role === 'tradesman') {
      const { error: projErr } = await adminClient
        .from('projects')
        .delete()
        .eq('tradesman_id', userId);
      if (projErr) {
        return json(
          { error: `Failed to delete projects: ${projErr.message}` },
          500,
        );
      }
    }

    // Step 5: the actual delete. supabase.auth.admin.deleteUser is the
    // canonical path — it removes the row from auth.users which cascades
    // through profiles + push_tokens + notifications + any user-keyed table.
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteErr) {
      return json(
        { error: `Failed to delete account: ${deleteErr.message}` },
        500,
      );
    }

    return json({ success: true });
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Unknown error' }, 500);
  }
});
