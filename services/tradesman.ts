import { supabase } from '@/services/supabase';
import type { Database } from '@/types/db';

type TradeType = Database['public']['Enums']['trade_type'];

// Type shim: the generated Database type doesn't yet know about
// `tradesman_certificates` until we re-run `supabase gen types` after
// the Sprint 39 migration lands. Cast-once-here keeps the rest of this
// file type-safe against TradesmanCertificate without leaking `any`
// across the codebase.
const certificatesTable = () =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any).from('tradesman_certificates') as {
    select: (cols: string) => {
      eq: (col: string, val: unknown) => {
        order: (
          col: string,
          opts?: { ascending?: boolean; nullsFirst?: boolean },
        ) => Promise<{ data: TradesmanCertificate[] | null; error: Error | null }>;
      } & Promise<{ data: TradesmanCertificate[] | null; error: Error | null }>;
    };
    insert: (row: Record<string, unknown>) => {
      select: (cols: string) => {
        single: () => Promise<{ data: TradesmanCertificate | null; error: Error | null }>;
      };
    };
    update: (patch: Record<string, unknown>) => {
      eq: (col: string, val: unknown) => Promise<{ error: Error | null }>;
    };
    delete: () => {
      eq: (col: string, val: unknown) => Promise<{ error: Error | null }>;
    };
  };

// Keep this in sync with the Postgres enum `certificate_kind`. Generated
// types will fold this in after the next `supabase gen types`; the hand-
// authored list lets the screen pickers render before the regen runs.
export type CertificateKind =
  | 'gas_safe'
  | 'niceic'
  | 'cscs'
  | 'part_p'
  | 'asbestos_awareness'
  | 'ipaf'
  | 'first_aid'
  | 'scaffolding'
  | 'sssts'
  | 'smsts'
  | 'pasma'
  | 'other';

export type TradesmanCertificate = {
  id: string;
  tradesman_id: string;
  kind: CertificateKind;
  custom_name: string | null;
  number: string | null;
  issued_at: string | null;
  expires_at: string | null;
  photo_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** Human-readable labels for the kind picker + public profile. */
export const CERTIFICATE_LABELS: Record<CertificateKind, string> = {
  gas_safe: 'Gas Safe',
  niceic: 'NICEIC',
  cscs: 'CSCS card',
  part_p: 'Part P',
  asbestos_awareness: 'Asbestos awareness',
  ipaf: 'IPAF',
  first_aid: 'First aid',
  scaffolding: 'Scaffolding',
  sssts: 'SSSTS',
  smsts: 'SMSTS',
  pasma: 'PASMA',
  other: 'Other',
};

export type TradesmanProfile = Pick<
  Database['public']['Tables']['tradesman_profiles']['Row'],
  | 'id'
  | 'business_name'
  | 'primary_trade'
  | 'secondary_trades'
  | 'years_trading'
  | 'service_postcodes'
  | 'bio'
  | 'logo_url'
  | 'website'
  | 'gas_safe_number'
  | 'niceic_number'
  | 'cscs_card_number'
  | 'insurance_provider'
  | 'insurance_expiry'
  | 'vat_number'
  | 'utr_number'
  | 'verified_at'
  | 'avg_rating'
  | 'total_reviews'
>;

/**
 * Fetch the signed-in tradesman's own profile row. Returns null if not signed
 * in or if the tradesman_profiles row doesn't exist yet (shouldn't happen
 * after the migration 1300 trigger but guard anyway).
 */
export async function getMyTradesmanProfile(): Promise<TradesmanProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('tradesman_profiles')
    .select(
      'id, business_name, primary_trade, secondary_trades, years_trading, service_postcodes, bio, logo_url, website, gas_safe_number, niceic_number, cscs_card_number, insurance_provider, insurance_expiry, vat_number, utr_number, verified_at, avg_rating, total_reviews'
    )
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Update fields on the signed-in tradesman's profile. RLS scopes to self. */
export async function updateTradesmanProfile(patch: Partial<{
  business_name: string;
  primary_trade: TradeType;
  secondary_trades: TradeType[];
  years_trading: number | null;
  service_postcodes: string[];
  bio: string | null;
  website: string | null;
  gas_safe_number: string | null;
  niceic_number: string | null;
  cscs_card_number: string | null;
  insurance_provider: string | null;
  insurance_expiry: string | null;
  vat_number: string | null;
  utr_number: string | null;
}>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase
    .from('tradesman_profiles')
    .update(patch)
    .eq('id', user.id);
  if (error) throw error;
}

/** Public-read fields for showing a tradesman to a customer. RLS allows
 *  reading verified tradesmen + counterparty tradesmen on a shared project. */
export async function getPublicTradesmanProfile(id: string) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) return null;

  const { data: tradesman, error: tError } = await supabase
    .from('tradesman_profiles')
    .select(
      'business_name, primary_trade, secondary_trades, years_trading, service_postcodes, bio, website, gas_safe_number, niceic_number, cscs_card_number, insurance_provider, insurance_expiry, verified_at, avg_rating, total_reviews'
    )
    .eq('id', id)
    .maybeSingle();
  if (tError) throw tError;

  // Live certificates list. RLS already permits participants to read.
  const { data: certificates, error: cError } = await certificatesTable()
    .select('id, tradesman_id, kind, custom_name, number, issued_at, expires_at, photo_path, notes, created_at, updated_at')
    .eq('tradesman_id', id)
    .order('kind');
  if (cError) throw cError;

  return { profile, tradesman, certificates: (certificates ?? []) as TradesmanCertificate[] };
}

// ── Certificates ────────────────────────────────────────────────────

/** All of the signed-in tradesman's certificates, sorted by expiry (soonest first). */
export async function fetchMyCertificates(): Promise<TradesmanCertificate[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await certificatesTable()
    .select('id, tradesman_id, kind, custom_name, number, issued_at, expires_at, photo_path, notes, created_at, updated_at')
    .eq('tradesman_id', user.id)
    .order('expires_at', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as TradesmanCertificate[];
}

export async function addCertificate(input: {
  kind: CertificateKind;
  custom_name?: string | null;
  number?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  notes?: string | null;
  // Optional local image URI (camera roll, camera). Uploaded to the
  // certificates bucket and the resulting storage path stored on the row.
  photo_uri?: string | null;
  photo_mime_type?: string | null;
  photo_ext?: string | null;
}): Promise<TradesmanCertificate> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  let photo_path: string | null = null;
  if (input.photo_uri) {
    // Storage path: {tradesman_id}/{random}.{ext} — RLS keys off the
    // first segment so we can't accidentally write to someone else's
    // folder. Pattern mirrors services/snags.ts.
    const ext = input.photo_ext ?? 'jpg';
    const filename = `${user.id}/${Math.random().toString(36).slice(2)}-${Date.now()}.${ext}`;
    const res = await fetch(input.photo_uri);
    const buffer = await res.arrayBuffer();
    const { error: upError } = await supabase.storage
      .from('certificates')
      .upload(filename, buffer, {
        contentType: input.photo_mime_type ?? 'image/jpeg',
        upsert: false,
      });
    if (upError) throw upError;
    photo_path = filename;
  }

  const { data, error } = await certificatesTable()
    .insert({
      tradesman_id: user.id,
      kind: input.kind,
      custom_name: input.custom_name?.trim() || null,
      number: input.number?.trim() || null,
      issued_at: input.issued_at || null,
      expires_at: input.expires_at || null,
      notes: input.notes?.trim() || null,
      photo_path,
    })
    .select('id, tradesman_id, kind, custom_name, number, issued_at, expires_at, photo_path, notes, created_at, updated_at')
    .single();
  if (error) throw error;
  if (!data) throw new Error('No row returned');
  return data as TradesmanCertificate;
}

export async function updateCertificate(
  id: string,
  patch: Partial<{
    kind: CertificateKind;
    custom_name: string | null;
    number: string | null;
    issued_at: string | null;
    expires_at: string | null;
    notes: string | null;
  }>,
): Promise<void> {
  const { error } = await certificatesTable()
    .update(patch as Record<string, unknown>)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCertificate(id: string, photo_path?: string | null): Promise<void> {
  if (photo_path) {
    // Best-effort: don't block the row delete on a failed photo cleanup.
    await supabase.storage.from('certificates').remove([photo_path]).catch(() => {});
  }
  const { error } = await certificatesTable().delete().eq('id', id);
  if (error) throw error;
}

/** Sign a photo path for display. Short TTL — the screen will refetch. */
export async function getCertificatePhotoUrl(photo_path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('certificates')
    .createSignedUrl(photo_path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Return an integer days-from-now, or null if no expiry set. Past => negative. */
export function daysUntilExpiry(expires_at: string | null): number | null {
  if (!expires_at) return null;
  const ms = new Date(expires_at).getTime() - Date.now();
  return Math.floor(ms / 86_400_000);
}
