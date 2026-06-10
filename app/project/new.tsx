import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddressLookup } from '@/components/AddressLookup';
import { InputField } from '@/components/ui/InputField';
import { isAddressLookupConfigured } from '@/services/addressLookup';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { enrollCrew, listMyPastCrew } from '@/services/crew';
import { createProject } from '@/services/projects';
import { lightTheme } from '@/theme/light';
import type { Database } from '@/types/db';

type TradeType = Database['public']['Enums']['trade_type'];

const TRADES: { value: TradeType; label: string }[] = [
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

export default function NewProjectScreen() {
  const t = lightTheme;
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [trade, setTrade] = useState<TradeType>('kitchen_fitter');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  // Manual address entry: shown by default when the lookup API isn't
  // configured (e.g. local dev without the key). User can also opt into
  // it via the "Enter manually" link on the lookup component.
  const [showManual, setShowManual] = useState(!isAddressLookupConfigured());
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Past crew — people the tradesman has worked with on prior projects.
  // Used by the "Bring your crew?" section. Empty list (or first-time
  // tradesman) → the section is hidden entirely.
  const pastCrewQuery = useQuery({
    queryKey: ['past-crew'],
    queryFn: listMyPastCrew,
    staleTime: 60_000, // doesn't change often during a single project creation
  });
  const pastCrew = pastCrewQuery.data ?? [];
  // Selected user_ids — defaults to none for deliberate per-project choice.
  const [selectedCrew, setSelectedCrew] = useState<Set<string>>(new Set());
  function toggleCrew(user_id: string) {
    setSelectedCrew((prev) => {
      const next = new Set(prev);
      if (next.has(user_id)) next.delete(user_id);
      else next.add(user_id);
      return next;
    });
  }

  const mutation = useMutation({
    mutationFn: async () => {
      // Create the project first. If this fails, no crew rows leak.
      const project = await createProject({
        title: title.trim(),
        trade_type: trade,
        address_line_1: address.trim(),
        city: city.trim(),
        postcode: postcode.trim().toUpperCase(),
        pending_customer_name: customerName.trim(),
        pending_customer_phone: customerPhone.trim(),
      });
      // Enroll selected past crew. We don't fail the whole creation if
      // enrollment errors — the project exists, the lead can re-add them
      // manually from /project/[id]/crew.
      if (selectedCrew.size > 0) {
        const members = pastCrew
          .filter((m) => selectedCrew.has(m.user_id))
          .map((m) => ({
            user_id: m.user_id,
            role_on_project: m.role_on_project,
          }));
        try {
          await enrollCrew({ project_id: project.id, members });
        } catch (e) {
          console.warn('[NewProject] auto-enroll failed; continuing', e);
        }
      }
      return project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-crew', project.id] });
      router.replace({ pathname: '/project/[id]', params: { id: project.id } });
    },
    onError: (e) => Alert.alert("Couldn't create project", (e as Error).message),
  });

  function onSubmit() {
    if (!title.trim() || !address.trim() || !city.trim() || !postcode.trim() || !customerName.trim() || !customerPhone.trim()) {
      Alert.alert('Fill in all fields', 'Every field is required for now.');
      return;
    }
    mutation.mutate();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>Cancel</Text>
        </Pressable>
        <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary }]}>New project</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { padding: t.space[5] }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: t.space[4] }}>
            <InputField
              label="Project title"
              value={title}
              onChangeText={setTitle}
              placeholder="Kitchen extension"
              autoCapitalize="sentences"
            />

            <View>
              <Text
                style={[
                  t.type.footnote,
                  { color: t.colors.text.secondary, marginBottom: 6 },
                ]}
              >
                Trade
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: t.space[2], paddingVertical: 4 }}
              >
                {TRADES.map((tr) => {
                  const selected = tr.value === trade;
                  return (
                    <Pressable
                      key={tr.value}
                      onPress={() => setTrade(tr.value)}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: t.radius.sm,
                        backgroundColor: selected ? t.colors.brand.primary : t.colors.bg.surface2,
                      }}
                    >
                      <Text
                        style={[
                          t.type.body,
                          {
                            color: selected ? t.colors.text.inverse : t.colors.text.primary,
                            fontWeight: '500',
                          },
                        ]}
                      >
                        {tr.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text
                style={[
                  t.type.footnote,
                  { color: t.colors.text.tertiary, marginTop: 6 },
                ]}
              >
                We'll add starter milestones for {TRADES.find((x) => x.value === trade)?.label.toLowerCase()} — you can edit them after.
              </Text>
            </View>

            {showManual ? (
              <View style={{ gap: t.space[4] }}>
                <InputField
                  label="Address"
                  value={address}
                  onChangeText={setAddress}
                  placeholder="23 Beech Road"
                  autoCapitalize="words"
                />
                <InputField
                  label="City / Town"
                  value={city}
                  onChangeText={setCity}
                  placeholder="London"
                  autoCapitalize="words"
                />
                <InputField
                  label="Postcode"
                  value={postcode}
                  onChangeText={setPostcode}
                  placeholder="SW19 4QP"
                  autoCapitalize="characters"
                />
                {isAddressLookupConfigured() ? (
                  <Pressable
                    onPress={() => {
                      setShowManual(false);
                      setAddress('');
                      setCity('');
                      setPostcode('');
                    }}
                    hitSlop={8}
                    style={{ alignItems: 'flex-start', paddingVertical: 4 }}
                  >
                    <Text
                      style={[t.type.body, { color: t.colors.text.link, fontWeight: '500' }]}
                    >
                      Search by postcode instead
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <AddressLookup
                value={
                  address && city && postcode
                    ? { address_line_1: address, city, postcode }
                    : null
                }
                onChange={(a) => {
                  if (a) {
                    setAddress(a.address_line_1);
                    setCity(a.city);
                    setPostcode(a.postcode);
                  } else {
                    setAddress('');
                    setCity('');
                    setPostcode('');
                  }
                }}
                onRequestManual={() => {
                  setShowManual(true);
                  setAddress('');
                  setCity('');
                  setPostcode('');
                }}
              />
            )}

            <View style={{ height: t.space[2] }} />
            <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>Your customer</Text>

            <InputField
              label="Customer name"
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Alex"
              autoCapitalize="words"
              textContentType="name"
            />

            <InputField
              label="Customer phone (UK)"
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="+447700900002"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              helper="No SMS sent yet — invite link comes in a later sprint."
            />

            {/* "Bring your crew?" — only renders if the tradesman has past crew.
                First-time tradesmen never see this section. */}
            {pastCrew.length > 0 && (
              <View style={{ marginTop: t.space[4] }}>
                <View style={{ height: t.space[2] }} />
                <Text style={[t.type.caption, { color: t.colors.text.tertiary }]}>
                  Bring your crew?
                </Text>
                <Text
                  style={[
                    t.type.footnote,
                    { color: t.colors.text.tertiary, marginTop: 4, marginBottom: t.space[3] },
                  ]}
                >
                  Tap anyone you'd like on this project. They'll be added when you create it.
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: t.space[2], paddingVertical: 4 }}
                >
                  {pastCrew.map((m) => {
                    const selected = selectedCrew.has(m.user_id);
                    const displayName = m.full_name ?? 'Crew member';
                    const initial = (displayName[0] ?? '?').toUpperCase();
                    return (
                      <Pressable
                        key={m.user_id}
                        onPress={() => toggleCrew(m.user_id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          paddingVertical: 8,
                          paddingLeft: 8,
                          paddingRight: 14,
                          borderRadius: t.radius.sm,
                          backgroundColor: selected
                            ? t.colors.brand.primary
                            : t.colors.bg.surface2,
                          borderWidth: 1,
                          borderColor: selected
                            ? t.colors.brand.primary
                            : t.colors.border.subtle,
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`${displayName}${selected ? ', selected' : ''}`}
                      >
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: selected
                              ? 'rgba(255,255,255,0.18)'
                              : t.colors.bg.surface,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text
                            style={[
                              t.type.footnote,
                              {
                                color: selected ? '#FFFFFF' : t.colors.text.primary,
                                fontWeight: '700',
                              },
                            ]}
                          >
                            {initial}
                          </Text>
                        </View>
                        <Text
                          style={[
                            t.type.body,
                            {
                              color: selected ? t.colors.text.inverse : t.colors.text.primary,
                              fontWeight: '500',
                            },
                          ]}
                        >
                          {displayName}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {selectedCrew.size > 0 && (
                  <Text
                    style={[
                      t.type.footnote,
                      { color: t.colors.text.tertiary, marginTop: t.space[2] },
                    ]}
                  >
                    {selectedCrew.size} crew member{selectedCrew.size === 1 ? '' : 's'} will be added.
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={{ marginTop: t.space[8] }}>
            <PrimaryButton title="Create project" onPress={onSubmit} loading={mutation.isPending} />
          </View>
        </ScrollView>
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
  content: { flexGrow: 1 },
});
