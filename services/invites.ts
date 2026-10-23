import * as Crypto from 'expo-crypto';

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
 * The invite now travels through the tradesman's own channels (WhatsApp,
 * their SMS, email) via the native share sheet — no Twilio, no per-message
 * cost, and the message arrives from a number the customer already trusts.
 * The share links to getphase.co.uk/invite/CODE, which unfurls as a Phase
 * card and carries the download link, so swapping TestFlight for the App
 * Store at launch is a website change, not an app update.
 */

/** Short, hard-to-typo: 6 chars from an unambiguous alphabet (no 0/O/1/I).
 *  Mirrors the server-side generator so codes look identical either way.
 *  expo-crypto, not global crypto — Hermes has no WebCrypto. */
function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = Crypto.getRandomBytes(6);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

/**
 * Return the project's invite code, generating + persisting one if missing.
 * RLS: only the project lead can update their own project, so this is
 * tradesman-only by construction. Retries on the (unlikely) unique clash.
 */
export async function ensureInviteCode(project_id: string): Promise<string> {
  const { data: project, error } = await supabase
    .from('projects')
    .select('invite_code')
    .eq('id', project_id)
    .single();
  if (error) throw error;
  if (project.invite_code) return project.invite_code;

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateInviteCode();
    const { error: updateError } = await supabase
      .from('projects')
      .update({ invite_code: code })
      .eq('id', project_id)
      .is('invite_code', null);
    if (!updateError) return code;
    if (updateError.code !== '23505') throw updateError; // not a unique clash
  }
  throw new Error("Couldn't generate an invite code — try again");
}

/** Stamp when the invite was last shared (drives the "Shared 2h ago" line). */
export async function markInviteShared(project_id: string): Promise<void> {
  await supabase
    .from('projects')
    .update({ invite_sent_at: new Date().toISOString() })
    .eq('id', project_id);
}

/** The message dropped into WhatsApp/SMS/email via the share sheet. */
export function inviteShareMessage(code: string, customerName?: string | null): string {
  const hi = customerName ? `Hi ${customerName.split(' ')[0]}, ` : '';
  return (
    `${hi}I'll be running our project on Phase. You'll see photo updates, ` +
    `what's happening next and the agreed price, all in one place.\n\n` +
    `Your invite code: ${code}\n\n` +
    `https://getphase.co.uk/invite/${code}`
  );
}
