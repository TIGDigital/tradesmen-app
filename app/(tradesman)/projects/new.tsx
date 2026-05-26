import { useMutation, useQueryClient } from '@tanstack/react-query';
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

import { InputField } from '@/components/ui/InputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
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
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      createProject({
        title: title.trim(),
        trade_type: trade,
        address_line_1: address.trim(),
        city: city.trim(),
        postcode: postcode.trim().toUpperCase(),
        pending_customer_name: customerName.trim(),
        pending_customer_phone: customerPhone.trim(),
      }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['my-projects'] });
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
            </View>

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
