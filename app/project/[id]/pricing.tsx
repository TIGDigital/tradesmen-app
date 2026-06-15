import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { fetchMyCurrentProject } from '@/services/projects';
import {
  PriceChange,
  fetchPendingChange,
  fetchPriceHistory,
  formatGbp,
  proposePriceChange,
  respondToPriceChange,
  setInitialQuote,
  withdrawPriceChange,
} from '@/services/pricing';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

/**
 * Pricing modal — the home of the "no surprise bills" promise.
 *
 * One screen, three viewer states:
 *  - No quote set yet → tradesman can set it; customer sees "pending"
 *  - Has a quote, no pending change → both see current; tradesman can propose
 *  - Pending change live → customer approves/rejects; tradesman can withdraw
 *
 * Below the live section: audit log of every change ever made, regardless
 * of outcome. The wedge feature here is the visibility, not the maths.
 */
export default function PricingScreen() {
  const t = lightTheme;
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const role = useAuthStore((s) => s.profile?.role);
  const userId = useAuthStore((s) => s.profile?.id);
  const qc = useQueryClient();

  // Pull project (so we can show title + know who's the lead) +
  // pending change + history. Three lightweight queries — fine
  // because the screen isn't hot.
  const projectQ = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchMyCurrentProject(id!),
    enabled: !!id,
  });
  const pendingQ = useQuery({
    queryKey: ['price-change-pending', id],
    queryFn: () => fetchPendingChange(id!),
    enabled: !!id,
  });
  const historyQ = useQuery({
    queryKey: ['price-history', id],
    queryFn: () => fetchPriceHistory(id!),
    enabled: !!id,
  });

  // project_reminders + project_price_changes aren't in types/db.ts
  // until next regeneration. Cast to a local shape with the fields we
  // need so the rest of the screen can read them without `as any` at
  // every site.
  type ProjectShape = {
    id: string;
    title: string;
    tradesman_id?: string | null;
    customer_id?: string | null;
    quoted_amount?: number | null;
  };
  const project = projectQ.data as ProjectShape | undefined;
  const pending = pendingQ.data;
  const history = historyQ.data ?? [];

  const isLead = !!project && userId === project.tradesman_id;
  const isCustomer = !!project && userId === project.customer_id;

  // Local form state for "set initial" and "propose change".
  const [amountInput, setAmountInput] = useState<string>('');
  const [reasonInput, setReasonInput] = useState<string>('');
  const [showProposeForm, setShowProposeForm] = useState(false);

  // Reset the form state when the underlying data changes
  // (e.g. customer approved → quote now set → close the form).
  useEffect(() => {
    if (project?.quoted_amount != null) setAmountInput('');
  }, [project?.quoted_amount]);

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: ['project', id] });
    void qc.invalidateQueries({ queryKey: ['price-change-pending', id] });
    void qc.invalidateQueries({ queryKey: ['price-history', id] });
    void qc.invalidateQueries({ queryKey: ['projects'] });
  };

  const initialMut = useMutation({
    mutationFn: (amount: number) =>
      setInitialQuote({ project_id: id!, amount }),
    onSuccess: () => {
      setAmountInput('');
      invalidateAll();
    },
    onError: (e: Error) => Alert.alert('Could not save', e.message),
  });

  const proposeMut = useMutation({
    mutationFn: ({ amount, reason }: { amount: number; reason: string }) =>
      proposePriceChange({ project_id: id!, new_amount: amount, reason }),
    onSuccess: () => {
      setAmountInput('');
      setReasonInput('');
      setShowProposeForm(false);
      invalidateAll();
    },
    onError: (e: Error) => Alert.alert('Could not send', e.message),
  });

  const respondMut = useMutation({
    mutationFn: ({
      change_id,
      decision,
      note,
    }: {
      change_id: string;
      decision: 'approved' | 'rejected';
      note?: string;
    }) => respondToPriceChange({ change_id, decision, note }),
    onSuccess: () => invalidateAll(),
    onError: (e: Error) => Alert.alert('Something went wrong', e.message),
  });

  const withdrawMut = useMutation({
    mutationFn: (change_id: string) => withdrawPriceChange(change_id),
    onSuccess: () => invalidateAll(),
    onError: (e: Error) => Alert.alert('Could not withdraw', e.message),
  });

  function parseAmount(s: string): number | null {
    const cleaned = s.replace(/[£,\s]/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function onSetInitial() {
    const n = parseAmount(amountInput);
    if (n == null || n < 0) return Alert.alert('Enter a valid amount');
    initialMut.mutate(n);
  }

  function onPropose() {
    const n = parseAmount(amountInput);
    if (n == null || n < 0) return Alert.alert('Enter a valid amount');
    if (!reasonInput.trim()) {
      return Alert.alert(
        'Reason required',
        "Tell the customer what's changing — extra work, materials price rise, scope reduction. They’ll see this exact wording.",
      );
    }
    proposeMut.mutate({ amount: n, reason: reasonInput });
  }

  function onApprove() {
    if (!pending) return;
    Alert.alert(
      'Approve new price?',
      `The new agreed price will be ${formatGbp(pending.proposed_amount)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: () =>
            respondMut.mutate({ change_id: pending.id, decision: 'approved' }),
        },
      ],
    );
  }

  function onReject() {
    if (!pending) return;
    Alert.alert(
      'Reject this change?',
      'Your tradesman will be notified. The current price stays as it is.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () =>
            respondMut.mutate({ change_id: pending.id, decision: 'rejected' }),
        },
      ],
    );
  }

  function onWithdraw() {
    if (!pending) return;
    Alert.alert('Withdraw this request?', 'It will be marked as withdrawn in the history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: () => withdrawMut.mutate(pending.id),
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { borderBottomColor: t.colors.border.subtle }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close pricing"
        >
          <Ionicons name="close" size={24} color={t.colors.text.primary} />
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          Pricing
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: t.space[6], paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          {/* CURRENT QUOTE */}
          <Text
            style={[
              t.type.caption,
              {
                color: t.colors.text.tertiary,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              },
            ]}
          >
            Current agreed price
          </Text>
          <Text
            style={[
              t.type.title1,
              { color: t.colors.text.primary, marginTop: 4 },
            ]}
          >
            {formatGbp(project?.quoted_amount)}
          </Text>
          {project?.quoted_amount == null && (
            <Text
              style={[
                t.type.body,
                { color: t.colors.text.secondary, marginTop: 6 },
              ]}
            >
              No quote set yet.
            </Text>
          )}

          {/* SET INITIAL — tradesman, no quote yet */}
          {isLead && project?.quoted_amount == null && (
            <View
              style={[
                styles.card,
                { backgroundColor: t.colors.bg.surface, borderColor: t.colors.border.subtle, marginTop: t.space[5] },
              ]}
            >
              <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
                Set the agreed price
              </Text>
              <Text
                style={[
                  t.type.body,
                  { color: t.colors.text.secondary, marginTop: 4, marginBottom: 12 },
                ]}
              >
                This is what you and your customer agreed during quoting.
                Any changes after this need their approval.
              </Text>
              <TextInput
                style={[styles.input, { borderColor: t.colors.border.subtle, color: t.colors.text.primary }]}
                placeholder="£5,000"
                placeholderTextColor={t.colors.text.tertiary}
                keyboardType="decimal-pad"
                value={amountInput}
                onChangeText={setAmountInput}
              />
              <View style={{ marginTop: 12 }}>
                <PrimaryButton
                  title="Save"
                  loading={initialMut.isPending}
                  onPress={onSetInitial}
                />
              </View>
            </View>
          )}

          {/* PENDING CHANGE */}
          {pending && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: t.colors.brand.tint,
                  borderColor: t.colors.brand.primary,
                  marginTop: t.space[5],
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="time-outline" size={16} color={t.colors.brand.primary} />
                <Text
                  style={[
                    t.type.caption,
                    {
                      color: t.colors.brand.primary,
                      letterSpacing: 1.2,
                      textTransform: 'uppercase',
                    },
                  ]}
                >
                  Pending change
                </Text>
              </View>
              <Text
                style={[
                  t.type.title2,
                  { color: t.colors.text.primary, marginTop: 8 },
                ]}
              >
                {formatGbp(pending.previous_amount)} → {formatGbp(pending.proposed_amount)}
              </Text>
              <Text
                style={[
                  t.type.body,
                  { color: t.colors.text.secondary, marginTop: 4 },
                ]}
              >
                {deltaCopy(pending.previous_amount, pending.proposed_amount)}
              </Text>

              <View
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: t.colors.brand.primary,
                }}
              >
                <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
                  REASON
                </Text>
                <Text
                  style={[
                    t.type.body,
                    { color: t.colors.text.primary, marginTop: 2 },
                  ]}
                >
                  {pending.reason}
                </Text>
                {pending.proposed_by_name && (
                  <Text
                    style={[
                      t.type.caption,
                      { color: t.colors.text.tertiary, marginTop: 6 },
                    ]}
                  >
                    From {pending.proposed_by_name} · {fmtWhen(pending.created_at)}
                  </Text>
                )}
              </View>

              {/* Customer actions */}
              {isCustomer && (
                <View style={{ marginTop: 16, gap: 8 }}>
                  <PrimaryButton
                    title="Approve new price"
                    loading={respondMut.isPending}
                    onPress={onApprove}
                  />
                  <Pressable
                    onPress={onReject}
                    style={[
                      styles.rejectButton,
                      { borderColor: t.colors.destructive.text },
                    ]}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        t.type.bodyLgEmphasis,
                        { color: t.colors.destructive.text },
                      ]}
                    >
                      Reject
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Lead actions */}
              {isLead && (
                <View style={{ marginTop: 16 }}>
                  <Pressable
                    onPress={onWithdraw}
                    style={[
                      styles.rejectButton,
                      { borderColor: t.colors.border.subtle },
                    ]}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        t.type.bodyLgEmphasis,
                        { color: t.colors.text.secondary },
                      ]}
                    >
                      Withdraw request
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* PROPOSE — tradesman, quote set, no pending */}
          {isLead && project?.quoted_amount != null && !pending && (
            <View style={{ marginTop: t.space[5] }}>
              {!showProposeForm ? (
                <Pressable
                  onPress={() => setShowProposeForm(true)}
                  style={[
                    styles.proposeOpenButton,
                    {
                      backgroundColor: t.colors.bg.surface,
                      borderColor: t.colors.border.subtle,
                    },
                  ]}
                  accessibilityRole="button"
                >
                  <Ionicons name="add-circle-outline" size={20} color={t.colors.brand.primary} />
                  <Text style={[t.type.bodyLgEmphasis, { color: t.colors.brand.primary }]}>
                    Request a price change
                  </Text>
                </Pressable>
              ) : (
                <View
                  style={[
                    styles.card,
                    { backgroundColor: t.colors.bg.surface, borderColor: t.colors.border.subtle },
                  ]}
                >
                  <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
                    New proposed price
                  </Text>
                  <Text
                    style={[
                      t.type.body,
                      { color: t.colors.text.secondary, marginTop: 4, marginBottom: 12 },
                    ]}
                  >
                    Your customer will be notified and asked to approve before the change sticks.
                  </Text>
                  <TextInput
                    style={[styles.input, { borderColor: t.colors.border.subtle, color: t.colors.text.primary }]}
                    placeholder={formatGbp(project.quoted_amount)}
                    placeholderTextColor={t.colors.text.tertiary}
                    keyboardType="decimal-pad"
                    value={amountInput}
                    onChangeText={setAmountInput}
                  />
                  <Text
                    style={[
                      t.type.caption,
                      { color: t.colors.text.tertiary, marginTop: 12, marginBottom: 6 },
                    ]}
                  >
                    REASON (REQUIRED)
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { borderColor: t.colors.border.subtle, color: t.colors.text.primary, height: 96, textAlignVertical: 'top', paddingTop: 12 },
                    ]}
                    placeholder="e.g. Added extra socket — £150 materials + 2 hrs labour"
                    placeholderTextColor={t.colors.text.tertiary}
                    multiline
                    value={reasonInput}
                    onChangeText={setReasonInput}
                  />
                  <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Pressable
                        onPress={() => {
                          setShowProposeForm(false);
                          setAmountInput('');
                          setReasonInput('');
                        }}
                        style={[
                          styles.rejectButton,
                          { borderColor: t.colors.border.subtle },
                        ]}
                        accessibilityRole="button"
                      >
                        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.secondary }]}>
                          Cancel
                        </Text>
                      </Pressable>
                    </View>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton
                        title="Send"
                        loading={proposeMut.isPending}
                        onPress={onPropose}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* HISTORY / AUDIT LOG */}
          <View style={{ marginTop: t.space[8] }}>
            <Text
              style={[
                t.type.caption,
                {
                  color: t.colors.text.tertiary,
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                },
              ]}
            >
              Change history
            </Text>
            {history.length === 0 && (
              <Text style={[t.type.body, { color: t.colors.text.tertiary }]}>
                No changes yet. Every proposal — approved or rejected — will appear here.
              </Text>
            )}
            {history.map((row) => (
              <HistoryRow key={row.id} row={row} />
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function HistoryRow({ row }: { row: PriceChange }) {
  const t = lightTheme;
  const statusColor =
    row.status === 'approved'
      ? t.status.in_progress.text
      : row.status === 'rejected'
        ? t.colors.destructive.text
        : row.status === 'withdrawn'
          ? t.colors.text.tertiary
          : t.colors.brand.primary;
  return (
    <View
      style={[
        styles.historyRow,
        { backgroundColor: t.colors.bg.surface, borderColor: t.colors.border.subtle },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
          {formatGbp(row.previous_amount)} → {formatGbp(row.proposed_amount)}
        </Text>
        <Text
          style={[
            t.type.caption,
            { color: statusColor, textTransform: 'uppercase', letterSpacing: 1 },
          ]}
        >
          {row.status}
        </Text>
      </View>
      <Text style={[t.type.body, { color: t.colors.text.secondary, marginTop: 4 }]}>
        {row.reason}
      </Text>
      <Text style={[t.type.caption, { color: t.colors.text.tertiary, marginTop: 6 }]}>
        {row.proposed_by_name ? `${row.proposed_by_name} · ` : ''}
        {fmtWhen(row.created_at)}
        {row.responded_at ? ` · responded ${fmtWhen(row.responded_at)}` : ''}
      </Text>
      {row.response_note && (
        <Text
          style={[
            t.type.body,
            { color: t.colors.text.secondary, marginTop: 6, fontStyle: 'italic' },
          ]}
        >
          “{row.response_note}”
        </Text>
      )}
    </View>
  );
}

function deltaCopy(prev: number | null, next: number): string {
  if (prev == null) return `Proposed price: ${formatGbp(next)}`;
  const delta = next - prev;
  if (delta === 0) return 'No change in amount.';
  const sign = delta > 0 ? '+' : '−';
  return `${sign}${formatGbp(Math.abs(delta))} ${delta > 0 ? 'increase' : 'reduction'}`;
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
  },
  proposeOpenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  rejectButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  historyRow: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
});
