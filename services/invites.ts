import { supabase } from '@/services/supabase';

/**
 * Look up the project preview for an invite code. RLS only returns rows
 * where customer_id is null (pending invite). Returns null if not found
 * or already accepted.
 */
export async function getInviteByCode(code: string) {
  const cleaned = code.trim().toUpperCase();
  if (!cleaned) return null;

  const { data, error } = await supabase
    .from('projects')
    .select(`
      id, title, trade_type,
      address_line_1, city, postcode,
      pending_customer_name,
      tradesman:profiles!projects_tradesman_id_fkey ( id, full_name )
    `)
    .eq('invite_code', cleaned)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Accept an invite: link the signed-in user as the customer on the project.
 * RLS enforces (a) customer_id is currently null, (b) caller's profile.role = 'customer'.
 * Returns the joined project id on success.
 */
export async function acceptInvite(code: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const cleaned = code.trim().toUpperCase();
  const { data, error } = await supabase
    .from('projects')
    .update({
      customer_id: user.id,
      invite_accepted_at: new Date().toISOString(),
    })
    .eq('invite_code', cleaned)
    .is('customer_id', null)
    .select('id, title')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Ask the Edge Function to text the invite SMS to the project's
 * pending_customer_phone. Server-side: looks up project, generates an
 * invite_code if missing, calls Twilio.
 *
 * On non-2xx we surface the function's JSON body so the Alert shows the
 * real cause (e.g. "project not found or not authorised", or a Twilio
 * rejection message).
 */
export async function sendInviteSms(project_id: string) {
  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    invite_code?: string;
    twilio_sid?: string;
    error?: string;
    twilio_status?: number;
    twilio_message?: string;
  }>('send-invite-sms', { body: { project_id } });

  if (error) {
    // Try to extract the function's JSON error body from FunctionsHttpError.
    // supabase-js attaches the Response on error.context.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = await ctx.json();
        const detail = body?.twilio_message ? ` (${body.twilio_message})` : '';
        throw new Error(`${body?.error ?? error.message}${detail}`);
      } catch (parseErr) {
        // Fallthrough to generic error if the body wasn't JSON
        if (parseErr instanceof Error && parseErr.message !== error.message) {
          throw parseErr;
        }
      }
    }
    throw error;
  }
  if (data?.error) {
    const detail = data.twilio_message ? ` (${data.twilio_message})` : '';
    throw new Error(`${data.error}${detail}`);
  }
  return data!;
}
