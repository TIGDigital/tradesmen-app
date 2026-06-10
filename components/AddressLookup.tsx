import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { InputField } from '@/components/ui/InputField';
import {
  findAddressesByPostcode,
  isValidUKPostcode,
  normaliseUKPostcode,
  toResolvedAddress,
  type FoundAddress,
  type ResolvedAddress,
} from '@/services/addressLookup';
import { lightTheme } from '@/theme/light';

interface AddressLookupProps {
  /** The current resolved address — drives the chosen-address card. */
  value: ResolvedAddress | null;
  /** Called when a suggestion is picked. */
  onChange: (a: ResolvedAddress | null) => void;
  /** Manual entry escape hatch — parent controls when to show the 3 fields. */
  onRequestManual: () => void;
}

/**
 * Postcode-first UK address lookup.
 *
 * Three visual states:
 *   1. Empty — postcode input + "Find addresses" button
 *   2. Results — list of matching addresses (tap to pick)
 *   3. Chosen — Phase-tinted card showing the selected address, with
 *      a close icon to clear and pick again
 *
 * The whole component is one ~150 line file with three small bits of
 * local state (postcode, results, status). No complex toggles, no
 * debounce, no manual-mode mirroring — manual entry is a separate code
 * path the parent owns via `onRequestManual`.
 */
export function AddressLookup({
  value,
  onChange,
  onRequestManual,
}: AddressLookupProps) {
  const t = lightTheme;

  const [postcode, setPostcode] = useState('');
  const [results, setResults] = useState<FoundAddress[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'empty'>('idle');
  const [error, setError] = useState<string | null>(null);

  // ── Chosen state ─────────────────────────────────────────────────────
  if (value && value.address_line_1) {
    return (
      <View
        style={[
          styles.chosenCard,
          { backgroundColor: t.colors.brand.tint, borderColor: t.colors.brand.primary },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[t.type.caption, { color: t.colors.brand.primary }]}>
            Site address
          </Text>
          <Text
            style={[t.type.bodyLg, { color: t.colors.text.primary, marginTop: 6 }]}
          >
            {value.address_line_1}
          </Text>
          <Text
            style={[
              t.type.body,
              { color: t.colors.text.secondary, marginTop: 2 },
            ]}
          >
            {value.city}
            {value.city && value.postcode ? ' · ' : ''}
            {value.postcode}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            onChange(null);
            setPostcode('');
            setResults([]);
            setStatus('idle');
            setError(null);
          }}
          hitSlop={12}
          accessibilityLabel="Use a different address"
        >
          <Ionicons name="close-circle" size={22} color={t.colors.brand.primary} />
        </Pressable>
      </View>
    );
  }

  async function onFind() {
    setError(null);
    setResults([]);
    setStatus('loading');
    try {
      const list = await findAddressesByPostcode(postcode);
      if (list.length === 0) {
        setStatus('empty');
        return;
      }
      setResults(list);
      setStatus('idle');
    } catch (e) {
      setError((e as Error).message);
      setStatus('error');
    }
  }

  function onPick(a: FoundAddress) {
    onChange(toResolvedAddress(a, postcode));
  }

  // Auto-trigger the find as soon as the user types a complete + valid
  // postcode — saves them tapping the button. Still allowed via tap
  // for users who paste with trailing whitespace, etc.
  const normalised = normaliseUKPostcode(postcode);
  const canFind = isValidUKPostcode(normalised) && status !== 'loading';

  // ── Empty / Results state ────────────────────────────────────────────
  return (
    <View>
      <InputField
        label="Site postcode"
        value={postcode}
        onChangeText={(s) => {
          setPostcode(s);
          // Clear results when the postcode changes, so stale matches
          // don't sit beneath a fresh search.
          if (status !== 'idle') setStatus('idle');
          setResults([]);
          setError(null);
        }}
        placeholder="e.g. SW1A 2AA"
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="postal-code"
        keyboardType="default"
        returnKeyType="search"
        onSubmitEditing={() => {
          if (canFind) onFind();
        }}
      />

      <Pressable
        onPress={onFind}
        disabled={!canFind}
        style={({ pressed }) => [
          styles.findBtn,
          {
            backgroundColor: canFind
              ? pressed
                ? t.colors.brand.primaryPressed
                : t.colors.brand.primary
              : t.colors.bg.surface2,
            borderColor: canFind ? 'transparent' : t.colors.border.subtle,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Find addresses at this postcode"
      >
        {status === 'loading' ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text
            style={[
              t.type.bodyLg,
              {
                color: canFind ? '#FFFFFF' : t.colors.text.tertiary,
                fontWeight: '600',
              },
            ]}
          >
            Find addresses
          </Text>
        )}
      </Pressable>

      {status === 'empty' ? (
        <Text style={[t.type.body, { color: t.colors.text.secondary, marginTop: 12 }]}>
          No addresses found at {normalised}. Check the postcode or enter manually.
        </Text>
      ) : null}

      {status === 'error' && error ? (
        <Text style={[t.type.body, { color: t.colors.destructive.text, marginTop: 12 }]}>
          {error}
        </Text>
      ) : null}

      {results.length > 0 ? (
        <View
          style={[
            styles.list,
            { backgroundColor: t.colors.bg.surface, borderColor: t.colors.border.subtle },
          ]}
        >
          {results.map((a, idx) => {
            const isLast = idx === results.length - 1;
            const label = [a.line_2, a.line_1].filter(Boolean).join(', ');
            const sub = a.town_or_city || normalised;
            return (
              <Pressable
                key={`${a.line_1}-${idx}`}
                onPress={() => onPick(a)}
                style={({ pressed }) => [
                  styles.row,
                  !isLast && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: t.colors.border.subtle,
                  },
                  pressed && { backgroundColor: t.colors.bg.canvas },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${label}, ${sub}`}
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={t.colors.text.tertiary}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[t.type.body, { color: t.colors.text.primary }]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                  <Text
                    style={[
                      t.type.footnote,
                      { color: t.colors.text.tertiary, marginTop: 2 },
                    ]}
                    numberOfLines={1}
                  >
                    {sub}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Quiet manual-entry escape hatch — always available. */}
      <Pressable
        onPress={onRequestManual}
        hitSlop={8}
        style={styles.manualLink}
        accessibilityRole="button"
        accessibilityLabel="Enter the address manually instead"
      >
        <Text style={[t.type.body, { color: t.colors.text.link, fontWeight: '500' }]}>
          Enter the address manually instead
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  findBtn: {
    marginTop: 10,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chosenCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  manualLink: {
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
});
