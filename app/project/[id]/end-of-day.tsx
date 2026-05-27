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

import { PhotoStrip } from '@/components/PhotoStrip';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Toggle } from '@/components/ui/Toggle';
import { pickPhotos, type PickedPhoto } from '@/services/media';
import {
  fetchMilestones,
  fetchProject,
  postEndOfDay,
  suggestEodBody,
} from '@/services/projects';

const MAX_PHOTOS = 3;
import { lightTheme } from '@/theme/light';
import type { ProjectStatus } from '@/theme/tokens';

export default function EndOfDayScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const projectQuery = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  });

  const milestonesQuery = useQuery({
    queryKey: ['milestones', id],
    queryFn: () => fetchMilestones(id!),
    enabled: !!id,
  });

  const [body, setBody] = useState('');
  // Default ETA = tomorrow 08:00
  const [etaDate, setEtaDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const [notify, setNotify] = useState(true);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);

  async function onAddPhoto() {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const picked = await pickPhotos(remaining);
    if (picked.length > 0) {
      setPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
    }
  }

  // Pre-fill body from milestones once they load.
  useEffect(() => {
    if (milestonesQuery.data && !body) {
      setBody(suggestEodBody(milestonesQuery.data));
    }
  }, [milestonesQuery.data, body]);

  const mutation = useMutation({
    mutationFn: () =>
      postEndOfDay({
        project_id: id!,
        body: body.trim(),
        eta_at: etaDate.toISOString(),
        notify_customer: notify,
        photos,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['updates', id] });
      queryClient.invalidateQueries({ queryKey: ['my-current-project'] });
      router.back();
      // Tiny delay so the Alert pops over the project detail, not the modal mid-dismiss.
      setTimeout(
        () =>
          Alert.alert(
            'Update sent',
            notify
              ? `${projectQuery.data?.pending_customer_name ?? 'Your customer'} will see it on their next open.`
              : 'Customer not notified.'
          ),
        300
      );
    },
    onError: (e) => Alert.alert("Couldn't send update", (e as Error).message),
  });

  function onSend() {
    if (!body.trim()) {
      Alert.alert('Add a note', 'Even a short one keeps the customer in the loop.');
      return;
    }
    mutation.mutate();
  }

  const customerFirst =
    projectQuery.data?.customer?.full_name?.split(' ')[0] ??
    projectQuery.data?.pending_customer_name?.split(' ')[0] ??
    'your customer';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Cancel</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>End of day</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: t.space[5], gap: t.space[4] }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title + subtitle */}
          <View>
            <Text style={[t.type.title3, { color: t.colors.text.primary }]}>
              Quick update for {customerFirst}
            </Text>
            <Text style={[t.type.footnote, { color: t.colors.text.secondary, marginTop: 4 }]}>
              Takes about 20 seconds.
            </Text>
          </View>

          {/* Body */}
          <View>
            <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginBottom: t.space[2] }]}>
              What happened today?
            </Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              placeholder="A short note for your customer"
              placeholderTextColor={t.colors.text.tertiary}
              style={[
                t.type.bodyLg,
                {
                  color: t.colors.text.primary,
                  backgroundColor: t.colors.bg.surface2,
                  borderRadius: t.radius.md,
                  padding: t.space[4],
                  minHeight: 120,
                  textAlignVertical: 'top',
                },
              ]}
            />
          </View>

          {/* Status (read-only display) */}
          {projectQuery.data && (
            <Card>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Status</Text>
                  <View style={{ marginTop: 6 }}>
                    <StatusBadge status={projectQuery.data.status as ProjectStatus} />
                  </View>
                </View>
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/project/[id]/status', params: { id: id! } })
                  }
                  hitSlop={8}
                >
                  <Text style={[t.type.footnote, { color: t.colors.text.link }]}>Change</Text>
                </Pressable>
              </View>
            </Card>
          )}

          {/* Next on site — native iOS date+time picker */}
          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
                  Next on site
                </Text>
              </View>
              <DateTimePicker
                value={etaDate}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                minimumDate={new Date()}
                onChange={(_e: DateTimePickerEvent, d?: Date) => {
                  if (d) setEtaDate(d);
                }}
              />
            </View>
          </Card>

          {/* Notify toggle */}
          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1, paddingRight: t.space[3] }}>
                <Text style={[t.type.bodyLg, { color: t.colors.text.primary }]}>
                  Notify {customerFirst}
                </Text>
                <Text
                  style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 2 }]}
                >
                  Sends a push when they next open the app.
                </Text>
              </View>
              <Toggle value={notify} onValueChange={setNotify} />
            </View>
          </Card>

          {/* Photos */}
          <View>
            <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginBottom: t.space[2] }]}>
              Photos ({photos.length}/{MAX_PHOTOS})
            </Text>
            <PhotoStrip
              uris={photos.map((p) => p.uri)}
              max={MAX_PHOTOS}
              onAdd={onAddPhoto}
              onRemove={(i) => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
            />
          </View>
        </ScrollView>

        {/* Sticky bottom — Send + ghost dismiss */}
        <View
          style={{
            padding: t.space[5],
            paddingTop: t.space[3],
            borderTopWidth: 1,
            borderTopColor: t.colors.border.subtle,
            backgroundColor: t.colors.bg.canvas,
            gap: t.space[2],
          }}
        >
          <PrimaryButton
            title="Send"
            onPress={onSend}
            loading={mutation.isPending}
            disabled={!body.trim()}
          />
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={{ alignItems: 'center', paddingVertical: t.space[2] }}
          >
            <Text style={[t.type.body, { color: t.colors.text.link }]}>
              Not leaving yet — dismiss
            </Text>
          </Pressable>
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
  row: { flexDirection: 'row', alignItems: 'center' },
});
