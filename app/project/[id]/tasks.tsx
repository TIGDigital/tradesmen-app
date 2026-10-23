import { Ionicons } from '@expo/vector-icons';
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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { listProjectCrew } from '@/services/crew';
import { fetchProject } from '@/services/projects';
import {
  createTask,
  deleteTask,
  fetchProjectTasks,
  setTaskDone,
  type ProjectTask,
} from '@/services/tasks';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

/**
 * Job list (23 Oct) — the lead writes the day's tasks and assigns them;
 * crew tick their own off. Internal to the trade side: customers never
 * see this screen (RLS enforces it too).
 */
export default function TasksScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const myId = useAuthStore((s) => s.profile?.id ?? null);

  const projectQuery = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  });
  const isLead = !!projectQuery.data && projectQuery.data.tradesman?.id === myId;

  const tasksQuery = useQuery({
    queryKey: ['project-tasks', id],
    queryFn: () => fetchProjectTasks(id!),
    enabled: !!id,
  });
  const tasks = tasksQuery.data ?? [];

  const crewQuery = useQuery({
    queryKey: ['project-crew', id],
    queryFn: () => listProjectCrew(id!),
    enabled: !!id && isLead,
  });

  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['project-tasks', id] });

  const addMutation = useMutation({
    mutationFn: () => createTask({ project_id: id!, title, assigned_to: assignee }),
    onSuccess: () => {
      setTitle('');
      invalidate();
    },
    onError: (e) => Alert.alert("Couldn't add the task", (e as Error).message),
  });

  const toggleMutation = useMutation({
    mutationFn: (args: { task_id: string; done: boolean }) =>
      setTaskDone(args.task_id, args.done),
    onSettled: invalidate,
    onError: (e) => Alert.alert("Couldn't update", (e as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (task_id: string) => deleteTask(task_id),
    onSettled: invalidate,
    onError: (e) => Alert.alert("Couldn't delete", (e as Error).message),
  });

  // Assignee options: the lead plus every active crew member.
  const assigneeOptions = [
    ...(projectQuery.data?.tradesman
      ? [{ id: projectQuery.data.tradesman.id, label: 'Me' }]
      : []),
    ...(crewQuery.data ?? []).map((m) => ({
      id: m.user_id,
      label: m.user?.full_name?.split(' ')[0] ?? 'Crew',
    })),
  ];

  const open = tasks.filter((x) => !x.done_at);
  const done = tasks.filter((x) => !!x.done_at);

  function canToggle(task: ProjectTask): boolean {
    return isLead || task.assigned_to === myId;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Done</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>Job list</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: t.space[5], gap: t.space[3] }}
          keyboardShouldPersistTaps="handled"
        >
          {tasksQuery.error && (
            <ErrorState
              message={(tasksQuery.error as Error).message}
              onRetry={() => void tasksQuery.refetch()}
            />
          )}

          {isLead && (
            <Card>
              <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Add a task</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Second-fix sockets in kitchen"
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
                    marginTop: 8,
                  },
                ]}
              />
              {assigneeOptions.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {assigneeOptions.map((o) => {
                    const active = assignee === o.id;
                    return (
                      <Pressable
                        key={o.id}
                        onPress={() => setAssignee(active ? null : o.id)}
                        style={{
                          paddingVertical: 7,
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
                          {o.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              <View style={{ marginTop: 12 }}>
                <PrimaryButton
                  title="Add task"
                  onPress={() => addMutation.mutate()}
                  loading={addMutation.isPending}
                  disabled={!title.trim()}
                />
              </View>
            </Card>
          )}

          {!tasksQuery.isLoading && tasks.length === 0 && (
            <Text style={[t.type.body, { color: t.colors.text.tertiary, marginTop: t.space[2] }]}>
              {isLead
                ? 'No tasks yet. Add the first job above and assign it to a crew member.'
                : 'No tasks yet. Your lead adds jobs here.'}
            </Text>
          )}

          {open.length > 0 && (
            <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>To do</Text>
          )}
          {open.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              canToggle={canToggle(task)}
              isLead={isLead}
              onToggle={() => toggleMutation.mutate({ task_id: task.id, done: true })}
              onDelete={() =>
                Alert.alert('Delete this task?', task.title, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(task.id) },
                ])
              }
            />
          ))}

          {done.length > 0 && (
            <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginTop: t.space[3] }]}>
              Done
            </Text>
          )}
          {done.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              canToggle={canToggle(task)}
              isLead={isLead}
              onToggle={() => toggleMutation.mutate({ task_id: task.id, done: false })}
              onDelete={() =>
                Alert.alert('Delete this task?', task.title, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(task.id) },
                ])
              }
            />
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TaskRow({
  task,
  canToggle,
  isLead,
  onToggle,
  onDelete,
}: {
  task: ProjectTask;
  canToggle: boolean;
  isLead: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const t = lightTheme;
  const done = !!task.done_at;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={canToggle ? onToggle : undefined} disabled={!canToggle} hitSlop={8}>
          <Ionicons
            name={done ? 'checkbox' : 'square-outline'}
            size={24}
            color={done ? '#197A4D' : canToggle ? t.colors.brand.primary : t.colors.text.tertiary}
          />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              t.type.bodyLg,
              {
                color: done ? t.colors.text.tertiary : t.colors.text.primary,
                textDecorationLine: done ? 'line-through' : 'none',
              },
            ]}
          >
            {task.title}
          </Text>
          <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 2 }]}>
            {task.assignee?.full_name ?? 'Anyone on the crew'}
          </Text>
        </View>
        {isLead && (
          <Pressable onPress={onDelete} hitSlop={8} accessibilityLabel="Delete task">
            <Ionicons name="trash-outline" size={18} color={t.colors.destructive.text} />
          </Pressable>
        )}
      </View>
    </Card>
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
