import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Toggle } from '@/components/ui/Toggle';
import { fetchProject } from '@/services/projects';
import {
  DEFAULT_REMINDER_DAYS,
  DEFAULT_REMINDER_TIME,
  fetchProjectReminder,
  saveProjectReminder,
} from '@/services/reminders';
import { lightTheme } from '@/theme/light';

/** ISO weekday → short label. */
const DAY_LABELS: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

/**
 * Per-project daily EoD reminder configuration.
 *
 * Tradesman enables a daily push at a chosen time on chosen weekdays.
 * Tap fires for that project specifically — opens the EoD modal so the
 * user can wrap up the day with one tap.
 */
export default function ProjectRemindersScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const projectQuery = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  });

  const reminderQuery = useQuery({
    queryKey: ['project-reminder', id],
    queryFn: () => fetchProjectReminder(id!),
    enabled: !!id,
  });

  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState(parseTime(DEFAULT_REMINDER_TIME));
  const [days, setDays] = useState<Set<number>>(new Set(DEFAULT_REMINDER_DAYS));

  // Hydrate from server once.
  useEffect(() => {
    if (!reminderQuery.data) return;
    setEnabled(reminderQuery.data.enabled);
    setTime(parseTime(reminderQuery.data.time_of_day));
    setDays(new Set(reminderQuery.data.days_of_week));
  }, [reminderQuery.data]);

  const mutation = useMutation({
    mutationFn: () =>
      saveProjectReminder({
        project_id: id!,
        project_title: projectQuery.data?.title ?? 'project',
        time_of_day: formatTime(time),
        days_of_week: [...days].sort(),
        enabled,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-reminder', id] });
      router.back();
    },
    onError: (e) =>
      Alert.alert("Couldn't save reminder", (e as Error).message),
  });

  function onTimeChange(_: DateTimePickerEvent, picked?: Date) {
    if (picked) setTime(picked);
  }
  function toggleDay(iso: number) {
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }

  const canSave = !mutation.isPending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Cancel</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          Daily reminder
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} keyboardShouldPersistTaps="handled">
          <Card>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
                  Daily wrap-up reminder
                </Text>
                <Text
                  style={[t.type.body, { color: t.colors.text.secondary, marginTop: 2, lineHeight: 20 }]}
                >
                  We'll send you a push at the same time each day. Tap it to send your end-of-day update without leaving site.
                </Text>
              </View>
              <Toggle value={enabled} onValueChange={setEnabled} />
            </View>
          </Card>

          {enabled && (
            <>
              <Card>
                <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Time</Text>
                <View style={[styles.rowBetween, { marginTop: 6 }]}>
                  <Text style={[t.type.bodyLg, { color: t.colors.text.primary }]}>
                    Reminder at
                  </Text>
                  <DateTimePicker
                    value={time}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={onTimeChange}
                  />
                </View>
              </Card>

              <Card>
                <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Days</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {([1, 2, 3, 4, 5, 6, 7] as const).map((iso) => {
                    const isOn = days.has(iso);
                    return (
                      <Pressable
                        key={iso}
                        onPress={() => toggleDay(iso)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 999,
                          backgroundColor: isOn ? t.colors.brand.primary : t.colors.bg.surface2,
                          borderWidth: 1,
                          borderColor: isOn ? t.colors.brand.primary : t.colors.border.subtle,
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isOn }}
                        accessibilityLabel={`${DAY_LABELS[iso]}${isOn ? ', enabled' : ', disabled'}`}
                      >
                        <Text
                          style={[
                            t.type.body,
                            {
                              color: isOn ? t.colors.text.inverse : t.colors.text.primary,
                              fontWeight: '600',
                            },
                          ]}
                        >
                          {DAY_LABELS[iso]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text
                  style={[
                    t.type.footnote,
                    { color: t.colors.text.tertiary, marginTop: 10, lineHeight: 18 },
                  ]}
                >
                  Defaults to weekdays. Tap to toggle individual days on or off.
                </Text>
              </Card>
            </>
          )}

          <View style={{ marginTop: 4 }}>
            <PrimaryButton
              title="Save"
              onPress={() => mutation.mutate()}
              disabled={!canSave}
              loading={mutation.isPending}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function parseTime(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function formatTime(d: Date): string {
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 44,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
