/**
 * Per-project recurring end-of-day reminders.
 *
 * Each project gets at most one reminder config per user. When enabled
 * the app schedules a local notification at the configured time on
 * each enabled weekday, set to repeat weekly. Tap → existing EoD
 * deep-link handler in app/_layout.tsx routes to the EoD modal for
 * that project.
 *
 * Source of truth is the `project_reminders` DB row. Local-notification
 * scheduling happens in saveProjectReminder; an additional rehydration
 * pass on app launch (see rehydrateAllProjectReminders) keeps a fresh
 * install in sync with the user's saved config.
 */

import * as Notifications from 'expo-notifications';

import { supabase } from '@/services/supabase';

export type ReminderConfig = {
  project_id: string;
  user_id: string;
  time_of_day: string; // "HH:MM" 24-hour
  days_of_week: number[]; // ISO: 1=Mon ... 7=Sun
  enabled: boolean;
};

/** Default UK trade hours — Mon-Fri 5pm. */
export const DEFAULT_REMINDER_TIME = '17:00';
export const DEFAULT_REMINDER_DAYS = [1, 2, 3, 4, 5];

/** iOS / Android calendar triggers use 1=Sunday ... 7=Saturday.
 *  We store ISO weekday (1=Mon) in the DB + UI for sanity, then map
 *  when scheduling. */
function isoToCalendarWeekday(iso: number): number {
  // ISO: 1=Mon..7=Sun  →  Calendar: 1=Sun..7=Sat
  // 1(Mon)→2, 2(Tue)→3, 3(Wed)→4, 4(Thu)→5, 5(Fri)→6, 6(Sat)→7, 7(Sun)→1
  return iso === 7 ? 1 : iso + 1;
}

function reminderIdentifier(project_id: string, weekday: number): string {
  return `eod-reminder-${project_id}-${weekday}`;
}

/** Fetch the reminder config for one project (the signed-in user's).
 *
 *  Note: project_reminders isn't in types/db.ts until the next
 *  `supabase gen types typescript --linked` regeneration after the
 *  20260614000100 migration is pushed. Cast through `any` until then. */
export async function fetchProjectReminder(
  project_id: string,
): Promise<ReminderConfig | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  const { data, error } = await client
    .from('project_reminders')
    .select('project_id, user_id, time_of_day, days_of_week, enabled')
    .eq('project_id', project_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return (data as ReminderConfig | null) ?? null;
}

/** Save the reminder config + reschedule local notifications. */
export async function saveProjectReminder(args: {
  project_id: string;
  project_title: string;
  time_of_day: string;
  days_of_week: number[];
  enabled: boolean;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  // 1. Persist to DB (source of truth, survives re-install).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  const { error } = await client.from('project_reminders').upsert(
    {
      project_id: args.project_id,
      user_id: user.id,
      time_of_day: args.time_of_day,
      days_of_week: args.days_of_week,
      enabled: args.enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'project_id,user_id' },
  );
  if (error) throw error;

  // 2. Always cancel existing schedules for this project before
  //    re-scheduling — covers day-of-week deselection + disable.
  await cancelProjectReminders(args.project_id);
  if (!args.enabled || args.days_of_week.length === 0) return;

  // 3. Schedule one weekly-repeating local notification per enabled
  //    weekday. iOS only fires the most-recent matching trigger if you
  //    use a single identifier, so each weekday gets its own.
  const [hourStr, minuteStr] = args.time_of_day.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    throw new Error('Invalid time format — use HH:MM');
  }

  for (const isoWeekday of args.days_of_week) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminderIdentifier(args.project_id, isoWeekday),
      content: {
        title: `Time to wrap up ${args.project_title}`,
        body: 'Tap to send your customer the end-of-day update.',
        sound: 'default',
        // The notification tap handler in app/_layout.tsx looks for
        // action: 'end_of_day' + project_id and routes to the EoD card.
        data: { project_id: args.project_id, action: 'end_of_day' },
      },
      trigger: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'calendar' as any,
        weekday: isoToCalendarWeekday(isoWeekday),
        hour,
        minute,
        repeats: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
  }
}

/** Cancel all scheduled reminder notifications for a project. Safe to
 *  call when no schedules exist — it's a no-op. */
export async function cancelProjectReminders(project_id: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(`eod-reminder-${project_id}-`))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * On cold launch, re-sync the user's enabled reminders from the DB
 * into the device's scheduled-notifications list. Local schedules
 * survive most app updates but NOT reinstalls + sometimes get cleared
 * after iOS major version bumps, so this is a defensive sync.
 *
 * Idempotent — calls cancel-then-reschedule per project, so running it
 * twice in a session is harmless.
 */
export async function rehydrateAllProjectReminders(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  const { data: rows } = await client
    .from('project_reminders')
    .select('project_id, time_of_day, days_of_week, enabled')
    .eq('user_id', user.id)
    .eq('enabled', true);

  if (!rows || rows.length === 0) return;

  // For each row, look up the project's title (used in the
  // notification copy) and re-schedule.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedRows = rows as Array<{
    project_id: string;
    time_of_day: string;
    days_of_week: number[];
    enabled: boolean;
  }>;
  const ids = typedRows.map((r) => r.project_id);
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title')
    .in('id', ids);
  const titleById = new Map<string, string>(
    (projects ?? []).map((p) => [p.id, p.title]),
  );

  for (const row of typedRows) {
    try {
      await saveProjectReminder({
        project_id: row.project_id,
        project_title: titleById.get(row.project_id) ?? 'project',
        time_of_day: row.time_of_day,
        days_of_week: row.days_of_week,
        enabled: row.enabled,
      });
    } catch (e) {
      console.warn('[reminders] rehydrate failed for project', row.project_id, e);
    }
  }
}
