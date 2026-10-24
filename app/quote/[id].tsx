import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhaseSpinner } from '@/components/ui/PhaseSpinner';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { formatGbp } from '@/services/pricing';
import { decideQuote, fetchQuote, withdrawQuote, type QuoteStatus } from '@/services/quotes';
import { useProjectRole } from '@/hooks/useProjectRole';
import { useAuthStore } from '@/stores/auth';
import { lightTheme } from '@/theme/light';

/**
 * Quote detail (Sprint 53). Customer reviews line items and approves or
 * declines; the lead sees status and can withdraw a sent quote. Approval
 * runs server-side (decide_quote RPC) and becomes the project's agreed
 * price, feeding the existing audit trail.
 */
export default function QuoteScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const role = useAuthStore((s) => s.profile?.role);
  const qc = useQueryClient();

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => fetchQuote(id!),
    enabled: !!id,
  });

  function invalidateAll(project_id: string) {
    void qc.invalidateQueries({ queryKey: ['quote', id] });
    void qc.invalidateQueries({ queryKey: ['quotes', project_id] });
    void qc.invalidateQueries({ queryKey: ['project', project_id] });
    void qc.invalidateQueries({ queryKey: ['price-history', project_id] });
    void qc.invalidateQueries({ queryKey: ['price-change-pending', project_id] });
  }

  const decideMutation = useMutation({
    mutationFn: (args: { approve: boolean; note?: string }) =>
      decideQuote({ quote_id: id!, approve: args.approve, note: args.note }),
    onSuccess: (_d, args) => {
      if (quote) invalidateAll(quote.project_id);
      Alert.alert(
        args.approve ? 'Quote approved' : 'Quote declined',
        args.approve
          ? 'This is now the agreed price. Any change needs your OK.'
          : 'Your tradesman has been told.',
      );
    },
    onError: (e) => Alert.alert("Couldn't send your decision", (e as Error).message),
  });

  const withdrawMutation = useMutation({
    mutationFn: () => withdrawQuote(id!),
    onSuccess: () => {
      if (quote) invalidateAll(quote.project_id);
    },
    onError: (e) => Alert.alert("Couldn't withdraw", (e as Error).message),
  });

  function onApprove() {
    if (!quote) return;
    Alert.alert(
      `Approve ${formatGbp(quote.total)}?`,
      'This becomes the agreed price for the project. Any change after this needs your approval.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => decideMutation.mutate({ approve: true }) },
      ],
    );
  }

  function onDecline() {
    Alert.prompt(
      'Decline this quote?',
      "Tell them why — what would need to change for a yes? They'll see this note.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: (note?: string) => {
            const trimmed = (note ?? '').trim();
            if (!trimmed) {
              // A reason is required — a silent "no" is exactly the
              // communication vacuum Phase exists to prevent.
              Alert.alert(
                'Add a quick note',
                'A reason helps your tradesman come back with the right quote.',
                [{ text: 'OK', onPress: onDecline }],
              );
              return;
            }
            decideMutation.mutate({ approve: false, note: trimmed });
          },
        },
      ],
      'plain-text',
    );
  }

  const isCustomer = role === 'customer';
  // Withdraw/revise are the LEAD's, not any trade account (persona audit).
  const { isLead } = useProjectRole(quote?.project_id);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Done</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>Quote</Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading && (
        <View style={styles.center}>
          <PhaseSpinner size={36} />
        </View>
      )}

      {error && (
        <View style={styles.center}>
          <Text style={[t.type.body, { color: t.colors.destructive.text, textAlign: 'center' }]}>
            {(error as Error).message}
          </Text>
        </View>
      )}

      {quote && (
        <ScrollView contentContainerStyle={{ padding: t.space[5], gap: t.space[4] }}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
                From {quote.creator?.full_name ?? 'your tradesman'}
              </Text>
              <Text
                style={{
                  fontFamily: 'GeistMono_500Medium',
                  fontSize: 34,
                  color: t.colors.text.primary,
                  marginTop: 4,
                }}
              >
                {formatGbp(quote.total)}
              </Text>
            </View>
            <StatusPill status={quote.status} />
          </View>

          {/* Customer's note — the single most actionable thing on a
              declined quote, so it leads (beta feedback 23 Oct). */}
          {quote.response_note && (
            <View
              style={{
                backgroundColor: quote.status === 'rejected' ? '#FDEBEA' : t.colors.bg.surface2,
                borderRadius: t.radius.md,
                padding: t.space[4],
              }}
            >
              <Text
                style={[
                  t.type.caption,
                  { color: quote.status === 'rejected' ? '#C0392B' : t.colors.text.tertiary },
                ]}
              >
                Customer's note
              </Text>
              <Text style={[t.type.body, { color: t.colors.text.primary, marginTop: 4, lineHeight: 22 }]}>
                {quote.response_note}
              </Text>
            </View>
          )}

          {/* ── Line items ─────────────────────────────────────── */}
          <View
            style={{
              borderWidth: 1,
              borderColor: t.colors.border.subtle,
              borderRadius: t.radius.lg,
              backgroundColor: t.colors.bg.surface,
            }}
          >
            {quote.items.map((item, idx) => (
              <View
                key={item.id}
                style={[
                  styles.itemRow,
                  idx > 0 && { borderTopWidth: 1, borderTopColor: t.colors.border.subtle },
                ]}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[t.type.body, { color: t.colors.text.primary }]}>
                    {item.description}
                  </Text>
                  {item.qty !== 1 && (
                    <Text style={[t.type.footnote, { color: t.colors.text.tertiary, marginTop: 2 }]}>
                      {item.qty} × {formatGbp(item.unit_price)}
                    </Text>
                  )}
                </View>
                <Text style={[t.type.body, { color: t.colors.text.primary }]}>
                  {formatGbp(item.qty * item.unit_price)}
                </Text>
              </View>
            ))}

            {/* Totals footer */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: t.colors.border.subtle,
                padding: 14,
                gap: 6,
              }}
            >
              <TotalRow label="Subtotal" value={formatGbp(quote.subtotal)} />
              {quote.discount_amount > 0 && (
                <TotalRow label="Discount" value={`−${formatGbp(quote.discount_amount)}`} />
              )}
              {quote.vat_registered && (
                <TotalRow label={`VAT (${quote.vat_rate}%)`} value={formatGbp(quote.vat_amount)} />
              )}
              <TotalRow label="Total" value={formatGbp(quote.total)} emphasis />
            </View>
          </View>

          {quote.notes && (
            <View>
              <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Notes</Text>
              <Text style={[t.type.body, { color: t.colors.text.primary, marginTop: 4, lineHeight: 22 }]}>
                {quote.notes}
              </Text>
            </View>
          )}

          {quote.pdf_document_id && (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/document/[id]', params: { id: quote.pdf_document_id! } })
              }
              style={[styles.rowBetween, { paddingVertical: 8 }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="document-text-outline" size={20} color={t.colors.text.link} />
                <Text style={[t.type.body, { color: t.colors.text.link }]}>View attached PDF quote</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.colors.text.tertiary} />
            </Pressable>
          )}

          {/* ── Actions ────────────────────────────────────────── */}
          {quote.status === 'sent' && isCustomer && (
            <View style={{ gap: 8, marginTop: t.space[2] }}>
              <PrimaryButton
                title={`Approve — ${formatGbp(quote.total)}`}
                onPress={onApprove}
                loading={decideMutation.isPending}
              />
              <Pressable onPress={onDecline} style={{ alignItems: 'center', paddingVertical: 10 }} hitSlop={6}>
                <Text style={[t.type.body, { color: t.colors.destructive.text }]}>Decline</Text>
              </Pressable>
            </View>
          )}

          {quote.status === 'sent' && isLead && (
            <Pressable
              onPress={() =>
                Alert.alert('Withdraw this quote?', 'Your customer will no longer be able to approve it.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Withdraw', style: 'destructive', onPress: () => withdrawMutation.mutate() },
                ])
              }
              style={{ alignItems: 'center', paddingVertical: 10 }}
              hitSlop={6}
            >
              <Text style={[t.type.body, { color: t.colors.destructive.text }]}>Withdraw quote</Text>
            </Pressable>
          )}

          {/* A declined quote is not a dead end (23 Oct): the customer can
              change their mind in-app; the tradesman can revise + resend. */}
          {quote.status === 'rejected' && isCustomer && (
            <View style={{ gap: 8, marginTop: t.space[2] }}>
              <PrimaryButton
                title={`Changed your mind? Approve — ${formatGbp(quote.total)}`}
                onPress={onApprove}
                loading={decideMutation.isPending}
              />
              <Text style={[t.type.footnote, { color: t.colors.text.tertiary, textAlign: 'center' }]}>
                Approving makes this the agreed price, same as before.
              </Text>
            </View>
          )}

          {(quote.status === 'rejected' || quote.status === 'withdrawn') && isLead && (
            <View style={{ marginTop: t.space[2] }}>
              <PrimaryButton
                title="Revise and resend"
                onPress={() =>
                  router.push({
                    pathname: '/project/[id]/quote-new',
                    params: { id: quote.project_id, from: quote.id },
                  })
                }
              />
              <Text
                style={[
                  t.type.footnote,
                  { color: t.colors.text.tertiary, textAlign: 'center', marginTop: 8 },
                ]}
              >
                Opens a new quote prefilled from this one — adjust the lines and send.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function TotalRow({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  const t = lightTheme;
  return (
    <View style={styles.rowBetween}>
      <Text style={[emphasis ? t.type.bodyLgEmphasis : t.type.body, { color: emphasis ? t.colors.text.primary : t.colors.text.secondary }]}>
        {label}
      </Text>
      <Text style={[emphasis ? t.type.bodyLgEmphasis : t.type.body, { color: t.colors.text.primary }]}>
        {value}
      </Text>
    </View>
  );
}

function StatusPill({ status }: { status: QuoteStatus }) {
  const t = lightTheme;
  const tone =
    status === 'approved'
      ? { bg: '#E7F6EC', fg: '#1C7C3D', label: 'Approved' }
      : status === 'sent'
        ? { bg: '#EAF0FF', fg: '#1B4DD9', label: 'Awaiting approval' }
        : status === 'rejected'
          ? { bg: '#FDEBEA', fg: '#C0392B', label: 'Declined' }
          : { bg: t.colors.bg.surface2, fg: t.colors.text.tertiary, label: 'Withdrawn' };
  return (
    <View style={{ backgroundColor: tone.bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
      <Text style={[t.type.footnote, { color: tone.fg, fontWeight: '600' }]}>{tone.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 14,
  },
});
