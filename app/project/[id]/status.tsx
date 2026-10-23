import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  DELAY_REASON_LABELS,
  fetchProject,
  updateProjectStatus,
  updateProjectTrade,
} from '@/services/projects';
import { lightTheme } from '@/theme/light';
import type { ProjectStatus } from '@/theme/tokens';
import type { Database } from '@/types/db';

type DelayReason = Database['public']['Enums']['delay_reason'];
type TradeType = Database['public']['Enums']['trade_type'];

const TRADE_LABELS: { value: TradeType; label: string }[] = [
  { value: 'builder', label: 'Builder' },
  { value: 'kitchen_fitter', label: 'Kitchen fitter' },
  { value: 'bathroom_fitter', label: 'Bathroom fitter' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'roofer', label: 'Roofer' },
  { value: 'plasterer', label: 'Plasterer' },
  { value: 'painter_decorator', label: 'Painter/Decorator' },
  { value: 'landscaper', label: 'Landscaper' },
  { value: 'tiler', label: 'Tiler' },
  { value: 'carpenter', label: 'Carpenter' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' },
];

const STATUSES: ProjectStatus[] = [
  'quote_sent',
  'scheduled',
  'materials_ordered',
  'in_progress',
  'delayed',
  'awaiting_approval',
  'awaiting_inspection',
  'completed',
];

export default function StatusPickerScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  });

  const [chosen, setChosen] = useState<ProjectStatus | null>(null);
  const [delayReason, setDelayReason] = useState<DelayReason | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      updateProjectStatus({
        project_id: id!,
        new_status: chosen!,
        delay_reason: chosen === 'delayed' ? delayReason ?? undefined : undefined,
        current_status: project!.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['updates', id] });
      queryClient.invalidateQueries({ queryKey: ['my-current-project'] });
      queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      router.back();
    },
    onError: (e) => Alert.alert("Couldn't update status", (e as Error).message),
  });

  // Trade correction (picked by mistake at creation) — instant save on tap.
  const tradeMutation = useMutation({
    mutationFn: (trade: TradeType) => updateProjectTrade(id!, trade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['my-projects'] });
    },
    onError: (e) => Alert.alert("Couldn't change the trade", (e as Error).message),
  });

  function onSave() {
    if (!chosen) return;
    if (chosen === 'delayed' && !delayReason) {
      Alert.alert('Pick a reason', 'Customers want to know why.');
      return;
    }
    mutation.mutate();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Cancel</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          Change status
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: t.space[5], paddingBottom: t.space[16] }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginBottom: t.space[3] }]}>
          Current
        </Text>
        {project && <StatusBadge status={project.status as ProjectStatus} />}

        <Text
          style={[
            t.type.caption,
            { color: t.colors.text.tertiary, marginTop: t.space[6], marginBottom: t.space[3] },
          ]}
        >
          Change to
        </Text>
        <View style={{ gap: t.space[2] }}>
          {STATUSES.map((s) => {
            const selected = chosen === s;
            const isCurrent = project?.status === s;
            return (
              <Pressable
                key={s}
                onPress={() => {
                  setChosen(s);
                  if (s !== 'delayed') setDelayReason(null);
                }}
                disabled={isCurrent}
                style={[
                  styles.row,
                  {
                    backgroundColor: selected ? t.colors.brand.tint : t.colors.bg.surface,
                    borderColor: selected ? t.colors.brand.primary : t.colors.border.subtle,
                    borderRadius: t.radius.md,
                    opacity: isCurrent ? 0.4 : 1,
                  },
                ]}
              >
                <StatusBadge status={s} />
                {isCurrent && (
                  <Text
                    style={[
                      t.type.footnote,
                      { color: t.colors.text.tertiary, marginLeft: 'auto' },
                    ]}
                  >
                    current
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {chosen === 'delayed' && (
          <>
            <Text
              style={[
                t.type.caption,
                { color: t.colors.text.tertiary, marginTop: t.space[6], marginBottom: t.space[3] },
              ]}
            >
              Why?
            </Text>
            <View style={{ gap: t.space[2] }}>
              {(Object.entries(DELAY_REASON_LABELS) as [DelayReason, string][]).map(
                ([value, label]) => {
                  const selected = delayReason === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => setDelayReason(value)}
                      style={[
                        styles.row,
                        {
                          backgroundColor: selected ? t.colors.brand.tint : t.colors.bg.surface,
                          borderColor: selected ? t.colors.brand.primary : t.colors.border.subtle,
                          borderRadius: t.radius.md,
                        },
                      ]}
                    >
                      <Text style={[t.type.bodyLg, { color: t.colors.text.primary }]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </View>
          </>
        )}

        <Text
          style={[
            t.type.caption,
            { color: t.colors.text.tertiary, marginTop: t.space[8], marginBottom: t.space[3] },
          ]}
        >
          Trade (tap to correct)
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TRADE_LABELS.map((tr) => {
            const active = project?.trade_type === tr.value;
            return (
              <Pressable
                key={tr.value}
                onPress={() => !active && tradeMutation.mutate(tr.value)}
                disabled={tradeMutation.isPending}
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
                  {tr.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky bottom action — always visible regardless of scroll. */}
      <View
        style={{
          padding: t.space[5],
          borderTopWidth: 1,
          borderTopColor: t.colors.border.subtle,
          backgroundColor: t.colors.bg.canvas,
        }}
      >
        <PrimaryButton
          title="Save"
          onPress={onSave}
          loading={mutation.isPending}
          disabled={!chosen || (chosen === 'delayed' && !delayReason)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 44,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
  },
});
