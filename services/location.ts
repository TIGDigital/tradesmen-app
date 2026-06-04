import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { supabase } from '@/services/supabase';

/**
 * Returns 'granted' | 'denied' | 'undetermined' for foreground (When-In-Use)
 * location. `undetermined` = we've never asked → safe to show the warm
 * pre-prompt. `denied` = the user said no in a prior session → show a hint
 * pointing them to Settings instead of re-prompting (iOS won't ask twice).
 */
export async function getLocationPermissionStatus(): Promise<
  'granted' | 'denied' | 'undetermined'
> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status === Location.PermissionStatus.GRANTED) return 'granted';
  if (status === Location.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

/**
 * Trigger the iOS "When in Use" location prompt. Returns whether the user
 * granted it. Only call this AFTER the warm pre-prompt screen so the iOS
 * dialog feels like a confirmation, not an interruption.
 */
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === Location.PermissionStatus.GRANTED;
}

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
