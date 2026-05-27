import { Platform } from 'react-native';

import { supabase } from '@/services/supabase';

/**
 * Log a 'left_site' location event for the signed-in user + project.
 * Used by the manual "I'm leaving site" trigger today; in production the same
 * function is called from a geofence handler with is_confirmed=false then
 * confirmed after a 90s debounce (per doc 02 §2.3).
 */
export async function logLeaveSite(project_id: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { error } = await supabase.from('location_events').insert({
    user_id: user.id,
    project_id,
    kind: 'left_site',
    occurred_at: new Date().toISOString(),
    app_state: 'foreground', // manual trigger means the app is foreground
    is_confirmed: true,
    device_id: Platform.OS,
  });
  if (error) throw error;
}
