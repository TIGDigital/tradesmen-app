import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  PanResponder,
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
import {
  createMilestone, deleteMilestone, fetchMilestones, reorderMilestones } from '@/services/projects';
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

  // ── Drag-to-reorder (PanResponder — no native dependency) ─────────
  // localOrder overrides the server order between a drop and the refetch.
  const [localOrder, setLocalOrder] = useState<string[] | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const dragY = useRef(new Animated.Value(0)).current;
  const rowHeights = useRef<Record<string, number>>({});
  const dragState = useRef<{ id: string; index: number; ids: string[] } | null>(null);

  const ordered = useMemo(() => {
    const sorted = [...milestones].sort((a, b) => a.sort_order - b.sort_order);
    if (!localOrder) return sorted;
    const byId = new Map(sorted.map((m) => [m.id, m]));
    const fromLocal = localOrder.map((mid) => byId.get(mid)).filter(Boolean) as typeof sorted;
    const missing = sorted.filter((m) => !localOrder.includes(m.id));
    return [...fromLocal, ...missing];
  }, [milestones, localOrder]);

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => reorderMilestones(id!, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones', id] });
      queryClient.invalidateQueries({ queryKey: ['my-current-project'] });
    },
    onError: (e) => {
      setLocalOrder(null); // snap back to the server's truth
      Alert.alert("Couldn't save the new order", (e as Error).message);
    },
  });

  function targetIndexFor(fromIndex: number, dy: number, ids: string[]): number {
    let idx = fromIndex;
    let remaining = dy;
    if (dy > 0) {
      while (idx < ids.length - 1) {
        const h = rowHeights.current[ids[idx + 1]] ?? 64;
        if (remaining > h / 2) {
          remaining -= h;
          idx += 1;
        } else break;
      }
    } else {
      while (idx > 0) {
        const h = rowHeights.current[ids[idx - 1]] ?? 64;
        if (-remaining > h / 2) {
          remaining += h;
          idx -= 1;
        } else break;
      }
    }
    return idx;
  }

  function makeDragHandlers(mid: string, index: number) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragState.current = { id: mid, index, ids: ordered.map((m) => m.id) };
        setDragging(mid);
        setHoverIndex(index);
        dragY.setValue(0);
      },
      onPanResponderMove: (_evt, gesture) => {
        dragY.setValue(gesture.dy);
        const st = dragState.current;
        if (!st) return;
        const target = targetIndexFor(st.index, gesture.dy, st.ids);
        setHoverIndex((prev) => (prev === target ? prev : target));
      },
      onPanResponderRelease: (_evt, gesture) => {
        const st = dragState.current;
        dragState.current = null;
        setDragging(null);
        setHoverIndex(null);
        dragY.setValue(0);
        if (!st) return;
        const target = targetIndexFor(st.index, gesture.dy, st.ids);
        if (target === st.index) return;
        const ids = [...st.ids];
        ids.splice(st.index, 1);
        ids.splice(target, 0, st.id);
        setLocalOrder(ids);
        reorderMutation.mutate(ids);
      },
      onPanResponderTerminate: () => {
        dragState.current = null;
        setDragging(null);
        setHoverIndex(null);
        dragY.setValue(0);
      },
    }).panHandlers;
  }

  /** Static shift for the rows the dragged one has passed over. */
  function shiftFor(index: number, mid: string): number {
    if (!dragging || hoverIndex === null || mid === dragging) return 0;
    const st = dragState.current;
    if (!st) return 0;
    const dragHeight = rowHeights.current[st.id] ?? 64;
    if (st.index < hoverIndex && index > st.index && index <= hoverIndex) return -dragHeight;
    if (st.index > hoverIndex && index >= hoverIndex && index < st.index) return dragHeight;
    return 0;
  }

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
          scrollEnabled={!dragging}
        >
          {isLoading && (
            <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>Loading…</Text>
          )}

          {!isLoading && milestones.length > 0 && (
            <Text
              style={[t.type.footnote, { color: t.colors.text.tertiary, paddingBottom: t.space[3] }]}
            >
              Milestones run in your trade's usual build order. New ones you add join the
              bottom of the list.
            </Text>
          )}

          {!isLoading && milestones.length === 0 && (
            <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>
              No milestones yet. Add a few below to give your customer a roadmap.
            </Text>
          )}

          {ordered.map((m, idx) => {
            const isDragged = dragging === m.id;
            return (
              <Animated.View
                key={m.id}
                onLayout={(e) => {
                  rowHeights.current[m.id] = e.nativeEvent.layout.height;
                }}
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: t.colors.border.subtle,
                  transform: [
                    isDragged ? { translateY: dragY } : { translateY: shiftFor(idx, m.id) },
                  ],
                  zIndex: isDragged ? 10 : 0,
                  backgroundColor: isDragged ? t.colors.bg.surface : 'transparent',
                  ...(isDragged
                    ? {
                        shadowColor: '#000',
                        shadowOpacity: 0.12,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: 4,
                      }
                    : null),
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Milestone
                      title={m.title}
                      status={m.status}
                      expectedDate={m.expected_date}
                      expectedStartDate={m.expected_start_date}
                      onPress={() => router.push({ pathname: '/milestone/[id]', params: { id: m.id } })}
                      onLongPress={() => onDelete(m.id, m.title)}
                    />
                  </View>
                  <Pressable
                    onPress={() => onDelete(m.id, m.title)}
                    hitSlop={8}
                    style={{ paddingLeft: 8 }}
                    accessibilityLabel="Delete milestone"
                  >
                    <Ionicons name="trash-outline" size={17} color={t.colors.destructive.text} />
                  </Pressable>
                  <View
                    {...makeDragHandlers(m.id, idx)}
                    style={{ paddingLeft: 12, paddingVertical: 14 }}
                    accessibilityLabel="Drag to reorder"
                  >
                    <Ionicons
                      name="reorder-three-outline"
                      size={22}
                      color={isDragged ? t.colors.brand.primary : t.colors.text.tertiary}
                    />
                  </View>
                </View>
              </Animated.View>
            );
          })}

          <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: t.space[3] }]}>
            Tap to edit dates, status, and notes. Drag ≡ to reorder.
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
