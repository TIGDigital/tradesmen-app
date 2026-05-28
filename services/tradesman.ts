import { supabase } from '@/services/supabase';
import type { Database } from '@/types/db';

type TradeType = Database['public']['Enums']['trade_type'];

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

  return { profile, tradesman };
}
