import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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

import { Milestone } from '@/components/Milestone';
import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { createMilestone, deleteMilestone, fetchMilestones } from '@/services/projects';
import { lightTheme } from '@/theme/light';

export default function MilestonesScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [newTitle, setNewTitle] = useState('');

  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ['milestones', id],
    queryFn: () => fetchMilestones(id!),
    enabled: !!id,
  });

  const addMutation = useMutation({
    mutationFn: () => createMilestone({ project_id: id!, title: newTitle.trim() }),
    onSuccess: () => {
      setNewTitle('');
      queryClient.invalidateQueries({ queryKey: ['milestones', id] });
      queryClient.invalidateQueries({ queryKey: ['my-current-project'] });
    },
    onError: (e) => Alert.alert("Couldn't add milestone", (e as Error).message),
  });

  const removeMutation = useMutation({
    mutationFn: (milestoneId: string) => deleteMilestone(milestoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', id] });
      queryClient.invalidateQueries({ queryKey: ['my-current-project'] });
    },
    onError: (e) => Alert.alert("Couldn't delete milestone", (e as Error).message),
  });

  function onAdd() {
    if (!newTitle.trim()) return;
    addMutation.mutate();
  }

  function onDelete(mid: string, title: string) {
    Alert.alert(`Delete "${title}"?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeMutation.mutate(mid) },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Done</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          Milestones
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: t.space[5] }}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading && (
            <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>Loading…</Text>
          )}

          {!isLoading && milestones.length === 0 && (
            <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>
              No milestones yet. Add a few below to give your customer a roadmap.
            </Text>
          )}

          {milestones.map((m) => (
            <View
              key={m.id}
              style={{
                borderBottomWidth: 1,
                borderBottomColor: t.colors.border.subtle,
              }}
            >
              <Milestone
                title={m.title}
                status={m.status}
                expectedDate={m.expected_date}
                onPress={() => router.push({ pathname: '/milestone/[id]', params: { id: m.id } })}
                onLongPress={() => onDelete(m.id, m.title)}
              />
            </View>
          ))}

          <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: t.space[3] }]}>
            Tap to edit dates, status, and notes. Long-press to delete.
          </Text>
        </ScrollView>

        {/* Sticky bottom add-milestone form. */}
        <View
          style={{
            padding: t.space[5],
            borderTopWidth: 1,
            borderTopColor: t.colors.border.subtle,
            backgroundColor: t.colors.bg.canvas,
          }}
        >
          <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginBottom: t.space[2] }]}>
            Add new
          </Text>
          <InputField
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="e.g. First-fix electrics"
            returnKeyType="done"
            onSubmitEditing={onAdd}
            autoCapitalize="sentences"
          />
          <View style={{ marginTop: t.space[3] }}>
            <PrimaryButton
              title="Add milestone"
              onPress={onAdd}
              loading={addMutation.isPending}
              disabled={!newTitle.trim()}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
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
});
