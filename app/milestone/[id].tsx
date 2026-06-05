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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { fetchMilestone, updateMilestone } from '@/services/projects';
import { lightTheme } from '@/theme/light';
import type { Database } from '@/types/db';

type MilestoneStatus = Database['public']['Enums']['milestone_status'];

const STATUS_OPTIONS: { value: MilestoneStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'awaiting_approval', label: 'Awaiting approval' },
  { value: 'completed', label: 'Completed' },
  { value: 'skipped', label: 'Skipped' },
];

/**
 * Milestone edit modal — title, status chips, start + end date pickers.
 * Tapped from the Gantt or Manage Milestones. Saves are "quiet" (no
 * feed post); use the project detail's status sheet for the noisy path
 * that auto-posts an update.
 */
export default function MilestoneEditScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['milestone', id],
    queryFn: () => fetchMilestone(id!),
    enabled: !!id,
  });

  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<MilestoneStatus>('pending');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Hydrate the form once when the milestone loads.
  useEffect(() => {
    if (!data) return;
    setTitle(data.title);
    setStatus(data.status as MilestoneStatus);
    setStartDate(data.expected_start_date ? new Date(data.expected_start_date) : null);
    setEndDate(data.expected_date ? new Date(data.expected_date) : null);
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      updateMilestone(id!, {
        title: title.trim(),
        status,
        expected_start_date: startDate ? toDateString(startDate) : null,
        expected_date: endDate ? toDateString(endDate) : null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['milestone', id] });
      await queryClient.invalidateQueries({ queryKey: ['milestones'] });
      await queryClient.invalidateQueries({ queryKey: ['my-current-project'] });
      await queryClient.invalidateQueries({ queryKey: ['project'] });
      router.back();
    },
    onError: (e) => Alert.alert("Couldn't save", (e as Error).message),
  });

  function onStartChange(_: DateTimePickerEvent, picked?: Date) {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (picked) setStartDate(picked);
  }
  function onEndChange(_: DateTimePickerEvent, picked?: Date) {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (picked) setEndDate(picked);
  }

  const canSave = title.trim().length > 0 && !mutation.isPending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Cancel</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>Milestone</Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading && (
        <View style={{ padding: 20, gap: 12 }}>
          <Skeleton width="60%" height={20} />
          <Skeleton width="100%" height={120} borderRadius={8} />
          <Skeleton width="100%" height={120} borderRadius={8} />
        </View>
      )}

      {error && <ErrorState message={(error as Error).message} />}

      {!isLoading && data && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            <View>
              <Text style={[t.type.footnote, { color: t.colors.text.secondary, marginBottom: 6 }]}>
                Title
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Milestone title"
                placeholderTextColor={t.colors.text.tertiary}
                style={[
                  t.type.bodyLg,
                  {
                    color: t.colors.text.primary,
                    backgroundColor: t.colors.bg.surface2,
                    borderColor: t.colors.border.strong,
                    borderWidth: 1,
                    borderRadius: t.radius.md,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  },
                ]}
              />
            </View>

            <View>
              <Text style={[t.type.footnote, { color: t.colors.text.secondary, marginBottom: 6 }]}>
                Status
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {STATUS_OPTIONS.map((opt) => {
                  const active = status === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setStatus(opt.value)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        backgroundColor: active ? t.colors.brand.primary : t.colors.bg.surface2,
                      }}
                    >
                      <Text
                        style={[
                          t.type.footnote,
                          {
                            color: active ? t.colors.text.inverse : t.colors.text.primary,
                            fontWeight: '600',
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Card>
              <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Dates</Text>

              <View style={[styles.dateRow, { borderBottomColor: t.colors.border.subtle }]}>
                <Text style={[t.type.body, { color: t.colors.text.primary }]}>Start</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Pressable onPress={() => setShowStartPicker((v) => !v)} hitSlop={6}>
                    <Text style={[t.type.body, { color: t.colors.text.link }]}>
                      {startDate ? formatNice(startDate) : 'Not set'}
                    </Text>
                  </Pressable>
                  {startDate && (
                    <Pressable onPress={() => setStartDate(null)} hitSlop={6}>
                      <Text style={[t.type.footnote, { color: t.colors.text.tertiary }]}>Clear</Text>
                    </Pressable>
                  )}
                </View>
              </View>
              {showStartPicker && (
                <DateTimePicker
                  value={startDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={onStartChange}
                />
              )}

              <View style={[styles.dateRow, { borderBottomWidth: 0 }]}>
                <Text style={[t.type.body, { color: t.colors.text.primary }]}>End</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Pressable onPress={() => setShowEndPicker((v) => !v)} hitSlop={6}>
                    <Text style={[t.type.body, { color: t.colors.text.link }]}>
                      {endDate ? formatNice(endDate) : 'Not set'}
                    </Text>
                  </Pressable>
                  {endDate && (
                    <Pressable onPress={() => setEndDate(null)} hitSlop={6}>
                      <Text style={[t.type.footnote, { color: t.colors.text.tertiary }]}>Clear</Text>
                    </Pressable>
                  )}
                </View>
              </View>
              {showEndPicker && (
                <DateTimePicker
                  value={endDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={onEndChange}
                />
              )}
            </Card>
          </ScrollView>

          <View
            style={{
              padding: 20,
              borderTopWidth: 1,
              borderTopColor: t.colors.border.subtle,
              backgroundColor: t.colors.bg.canvas,
            }}
          >
            <PrimaryButton
              title="Save"
              onPress={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={!canSave}
            />
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatNice(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 44,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});
