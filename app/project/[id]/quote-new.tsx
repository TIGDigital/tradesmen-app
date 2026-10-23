import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { listProjectDocuments, pickDocument, uploadDocument } from '@/services/documents';
import { formatGbp } from '@/services/pricing';
import { createAndSendQuote, parseQuotePdf, quoteTotals } from '@/services/quotes';
import { getMyTradesmanProfile } from '@/services/tradesman';
import { lightTheme } from '@/theme/light';

type DraftLine = { description: string; qty: string; price: string };

const EMPTY_LINE: DraftLine = { description: '', qty: '1', price: '' };

function toNumber(s: string): number {
  const n = parseFloat(s.replace(/[£,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Itemised quote composer (Sprint 53). Lead builds line items, flips VAT
 * on if registered (prefilled from their business profile), optionally
 * attaches a PDF of an existing quote, and sends. The customer reviews
 * and approves in-app.
 */
export default function NewQuoteScreen() {
  const t = lightTheme;
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const [lines, setLines] = useState<DraftLine[]>([{ ...EMPTY_LINE }]);
  const [vatRegistered, setVatRegistered] = useState(false);
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [attachedPdf, setAttachedPdf] = useState<{ id: string; name: string } | null>(null);

  // Prefill the VAT toggle from the business profile — a VAT number on
  // file almost always means VAT belongs on the quote.
  const profileQ = useQuery({ queryKey: ['tradesman-profile'], queryFn: getMyTradesmanProfile });
  useEffect(() => {
    if (profileQ.data?.vat_number) setVatRegistered(true);
  }, [profileQ.data?.vat_number]);

  const items = lines
    .map((l) => ({ description: l.description, qty: toNumber(l.qty) || 1, unit_price: toNumber(l.price) }))
    .filter((l) => l.description.trim().length > 0);
  const totals = quoteTotals({
    items,
    vat_registered: vatRegistered,
    discount_amount: toNumber(discount),
  });

  function setLine(idx: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  const parseMutation = useMutation({
    mutationFn: (document_id: string) => parseQuotePdf(document_id),
    onSuccess: (parsed) => {
      setLines(
        parsed.items.map((i) => ({
          description: i.description,
          qty: String(i.qty),
          price: String(i.unit_price),
        })),
      );
      if (parsed.discount_amount > 0) setDiscount(String(parsed.discount_amount));
      setVatRegistered(parsed.vat_registered);
      if (parsed.notes) setNotes(parsed.notes);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        `${parsed.items.length} ${parsed.items.length === 1 ? 'line' : 'lines'} imported`,
        'Check every figure before sending — the reader drafts, you decide.',
      );
    },
    onError: (e) => Alert.alert("Couldn't read the PDF", (e as Error).message),
  });

  // PDFs already uploaded to the project's Documents — testers kept
  // uploading there first, then looking for the prices (23 Oct).
  const projectPdfsQuery = useQuery({
    queryKey: ['project-documents', id],
    queryFn: () => listProjectDocuments(id!),
    enabled: !!id,
  });
  const projectPdfs = (projectPdfsQuery.data ?? []).filter(
    (d) => d.mime_type === 'application/pdf',
  );

  function onImportPress() {
    if (projectPdfs.length === 0) {
      attachMutation.mutate();
      return;
    }
    Alert.alert('Read in a PDF quote', 'Where is the PDF?', [
      { text: 'Choose a file', onPress: () => attachMutation.mutate() },
      {
        text: 'Use a project document',
        onPress: () =>
          Alert.alert('Pick a document', undefined, [
            ...projectPdfs.slice(0, 5).map((d) => ({
              text: d.file_name,
              onPress: () => {
                setAttachedPdf({ id: d.id, name: d.file_name });
                parseMutation.mutate(d.id);
              },
            })),
            { text: 'Cancel', style: 'cancel' as const },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const attachMutation = useMutation({
    mutationFn: async () => {
      const asset = await pickDocument();
      if (!asset) return null;
      return uploadDocument({ project_id: id!, asset });
    },
    onSuccess: (doc) => {
      if (doc) {
        setAttachedPdf({ id: doc.id, name: doc.file_name });
        if (doc.mime_type === 'application/pdf') {
          Alert.alert(
            'Read this PDF?',
            'The line items, discount and VAT can be read out of the document to pre-fill the quote for you to check.',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Read it', onPress: () => parseMutation.mutate(doc.id) },
            ],
          );
        }
      }
    },
    onError: (e) => Alert.alert("Couldn't attach", (e as Error).message),
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      createAndSendQuote({
        project_id: id!,
        items,
        vat_registered: vatRegistered,
        discount_amount: toNumber(discount),
        notes,
        pdf_document_id: attachedPdf?.id ?? null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['quotes', id] });
      Alert.alert('Quote sent', 'Your customer can now review and approve it in the app.');
      router.back();
    },
    onError: (e) => Alert.alert("Couldn't send quote", (e as Error).message),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top, height: 44 + insets.top }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Cancel</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>New quote</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: t.space[5], gap: t.space[4] }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── PDF import — front and centre, the fastest path ── */}
          <Pressable
            onPress={onImportPress}
            disabled={attachMutation.isPending || parseMutation.isPending}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: t.space[4],
              borderWidth: 1,
              borderStyle: 'dashed',
              borderRadius: t.radius.md,
              borderColor: t.colors.brand.primary,
              backgroundColor: t.colors.brand.tint,
            }}
          >
            <Ionicons name="sparkles" size={20} color={t.colors.brand.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>
                {attachMutation.isPending
                  ? 'Attaching…'
                  : parseMutation.isPending
                    ? 'Reading the PDF…'
                    : attachedPdf
                      ? attachedPdf.name
                      : 'Already have this quote as a PDF?'}
              </Text>
              <Text style={[t.type.footnote, { color: t.colors.text.secondary, marginTop: 2 }]}>
                {attachedPdf
                  ? 'Attached. Tap to read it in again or swap it.'
                  : 'Read it in and the lines, VAT and discount fill themselves. You check, then send.'}
              </Text>
            </View>
          </Pressable>

          {/* ── Line items ─────────────────────────────────────── */}
          <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Line items</Text>
          {lines.map((line, idx) => (
            <View key={idx} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput
                style={[styles.input, { flex: 1, borderColor: t.colors.border.subtle, color: t.colors.text.primary }]}
                placeholder="e.g. Strip and re-board walls"
                placeholderTextColor={t.colors.text.tertiary}
                value={line.description}
                onChangeText={(v) => setLine(idx, { description: v })}
              />
              <TextInput
                style={[styles.input, { width: 52, textAlign: 'center', borderColor: t.colors.border.subtle, color: t.colors.text.primary }]}
                placeholder="1"
                placeholderTextColor={t.colors.text.tertiary}
                keyboardType="decimal-pad"
                value={line.qty}
                onChangeText={(v) => setLine(idx, { qty: v })}
              />
              <TextInput
                style={[styles.input, { width: 86, textAlign: 'right', borderColor: t.colors.border.subtle, color: t.colors.text.primary }]}
                placeholder="£0"
                placeholderTextColor={t.colors.text.tertiary}
                keyboardType="decimal-pad"
                value={line.price}
                onChangeText={(v) => setLine(idx, { price: v })}
              />
              {lines.length > 1 && (
                <Pressable
                  onPress={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                  hitSlop={8}
                  accessibilityLabel="Remove line"
                >
                  <Ionicons name="close-circle-outline" size={20} color={t.colors.text.tertiary} />
                </Pressable>
              )}
            </View>
          ))}
          <Pressable
            onPress={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            hitSlop={6}
          >
            <Ionicons name="add" size={18} color={t.colors.text.link} />
            <Text style={[t.type.body, { color: t.colors.text.link }]}>Add a line</Text>
          </Pressable>

          {/* ── VAT + discount ─────────────────────────────────── */}
          <View style={[styles.rowBetween, { marginTop: t.space[2] }]}>
            <Text style={[t.type.bodyLg, { color: t.colors.text.primary }]}>
              Add VAT ({profileQ.data?.vat_number ? 'VAT-registered' : '20%'})
            </Text>
            <Switch value={vatRegistered} onValueChange={setVatRegistered} />
          </View>
          <View style={styles.rowBetween}>
            <Text style={[t.type.bodyLg, { color: t.colors.text.primary }]}>Discount</Text>
            <TextInput
              style={[styles.input, { width: 110, textAlign: 'right', borderColor: t.colors.border.subtle, color: t.colors.text.primary }]}
              placeholder="£0"
              placeholderTextColor={t.colors.text.tertiary}
              keyboardType="decimal-pad"
              value={discount}
              onChangeText={setDiscount}
            />
          </View>

          {/* ── Notes + PDF ────────────────────────────────────── */}
          <TextInput
            style={[styles.input, { minHeight: 70, borderColor: t.colors.border.subtle, color: t.colors.text.primary }]}
            placeholder="Notes — exclusions, assumptions, payment terms…"
            placeholderTextColor={t.colors.text.tertiary}
            multiline
            value={notes}
            onChangeText={setNotes}
          />
          <Pressable
            onPress={() => attachMutation.mutate()}
            disabled={attachMutation.isPending}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            hitSlop={6}
          >
            <Ionicons
              name={attachedPdf ? 'document-attach' : 'attach'}
              size={18}
              color={t.colors.text.link}
            />
            <Text style={[t.type.body, { color: t.colors.text.link }]} numberOfLines={1}>
              {attachMutation.isPending
                ? 'Attaching…'
                : parseMutation.isPending
                  ? 'Reading the PDF…'
                  : attachedPdf
                    ? attachedPdf.name
                    : 'Attach your PDF quote (optional)'}
            </Text>
          </Pressable>

          {/* ── Totals ─────────────────────────────────────────── */}
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: t.colors.border.subtle,
              paddingTop: t.space[4],
              gap: 6,
            }}
          >
            <TotalRow label="Subtotal" value={formatGbp(totals.subtotal)} />
            {toNumber(discount) > 0 && (
              <TotalRow label="Discount" value={`−${formatGbp(toNumber(discount))}`} />
            )}
            {vatRegistered && <TotalRow label="VAT (20%)" value={formatGbp(totals.vat_amount)} />}
            <TotalRow label="Total" value={formatGbp(totals.total)} emphasis />
          </View>

          <PrimaryButton
            title={`Send quote — ${formatGbp(totals.total)}`}
            onPress={() => sendMutation.mutate()}
            loading={sendMutation.isPending}
            disabled={items.length === 0}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
