import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { lightTheme } from '@/theme/light';

export default function WelcomeScreen() {
  const t = lightTheme;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} edges={['top', 'bottom']}>
      <View style={[styles.container, { padding: t.space[5] }]}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Text style={[t.type.display, { color: t.colors.text.primary }]}>
            We'll never{'\n'}leave you{'\n'}wondering.
          </Text>
          <Text
            style={[
              t.type.bodyLg,
              { color: t.colors.text.secondary, marginTop: t.space[4] },
            ]}
          >
            The shared workspace for tradesmen and their customers.
          </Text>
        </View>

        <View style={{ gap: t.space[3], alignItems: 'center' }}>
          <View style={{ alignSelf: 'stretch' }}>
            <PrimaryButton title="Sign up" onPress={() => router.push('/(auth)/sign-up')} />
          </View>
          <Pressable
            onPress={() => router.push('/(auth)/sign-in')}
            hitSlop={12}
            style={{ paddingVertical: t.space[2] }}
          >
            <Text style={[t.type.bodyLg, { color: t.colors.text.link }]}>
              I have an account
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
});
