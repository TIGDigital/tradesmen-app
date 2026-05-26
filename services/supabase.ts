import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/db';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
}

/**
 * Single Supabase client for the app. Typed against the generated Database schema.
 * Import as: `import { supabase } from '@/services/supabase';`
 *
 * Auth integration is wired in a follow-up sprint. For now this client runs unauthenticated;
 * RLS policies will block reads until we ship auth + policies in Sprint 2.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable URL session detection — we're not using OAuth redirects in the simulator yet.
    detectSessionInUrl: false,
  },
});
