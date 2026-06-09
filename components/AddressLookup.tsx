import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { InputField } from '@/components/ui/InputField';
import {
  autocompleteAddress,
  isAddressLookupConfigured,
  resolveAddress,
  type AddressSuggestion,
  type ResolvedAddress,
} from '@/services/addressLookup';
import { lightTheme } from '@/theme/light';

interface AddressLookupProps {
  /** The current resolved address — drives the chosen-address card. */
  value: ResolvedAddress | null;
  /** Called when a suggestion is picked and resolved. */
  onChange: (a: ResolvedAddress) => void;
  /**
   * Show the form in "manual entry" mode (3 separate fields). The
   * parent owns the toggle so the toggle state survives unmounts.
   */
  manualMode: boolean;
  /** Toggle between lookup and manual mode (parent state). */
  onSetManualMode: (manual: boolean) => void;
  /**
   * For manual mode — the parent's three fields. We re-export the
   * InputFields here so the project-create form stays a single tree.
   */
  manualLine1: string;
  onManualLine1Change: (s: string) => void;
  manualCity: string;
  onManualCityChange: (s: string) => void;
  manualPostcode: string;
  onManualPostcodeChange: (s: string) => void;
}

/**
 * UK address autocomplete + manual-entry fallback.
 *
 *   - Lookup mode (default if API key is configured): single search
 *     field, debounced 250ms; tap a suggestion to resolve into the
 *     three Phase fields. Shows the chosen address as a card with a
 *     "Use a different address" affordance to clear.
 *   - Manual mode (default if API key is NOT configured, or user
 *     elected manual): three classic InputFields, identical to the
 *     pre-lookup era of this form.
 *
 * The toggle is sticky to the parent screen so users who prefer manual
 * (or who hit network errors) don't get bounced back to lookup mode on
 * every keystroke.
 */
export function AddressLookup({
  value,
  onChange,
  manualMode,
  onSetManualMode,
  manualLine1,
  onManualLine1Change,
  manualCity,
  onManualCityChange,
  manualPostcode,
  onManualPostcodeChange,
}: AddressLookupProps) {
  const t = lightTheme;
  const apiConfigured = isAddressLookupConfigured();

  // If the API key isn't set on this build, fall back to manual mode
  // permanently — the lookup field would just throw on every keystroke.
  const effectiveManual = manualMode || !apiConfigured;

  return (
    <View>
      {effectiveManual ? (
        <ManualEntry
          line1={manualLine1}
          onLine1Change={onManualLine1Change}
          city={manualCity}
          onCityChange={onManualCityChange}
          postcode={manualPostcode}
          onPostcodeChange={onManualPostcodeChange}
        />
      ) : (
        <LookupEntry value={value} onChange={onChange} />
      )}

      {/* Mode toggle — only available when the API is configured.
          Empty placeholder otherwise so the form keeps its rhythm. */}
      {apiConfigured ? (
        <Pressable
          onPress={() => onSetManualMode(!manualMode)}
          hitSlop={8}
          style={styles.toggle}
          accessibilityRole="button"
          accessibilityLabel={manualMode ? 'Search for an address instead' : 'Enter the address manually instead'}
        >
          <Text style={[t.type.body, { color: t.colors.text.link, fontWeight: '500' }]}>
            {manualMode ? 'Search for the address instead' : 'Enter the address manually'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Lookup mode ────────────────────────────────────────────────────────

interface LookupEntryProps {
  value: ResolvedAddress | null;
  onChange: (a: ResolvedAddress) => void;
}

function LookupEntry({ value, onChange }: LookupEntryProps) {
  const t = lightTheme;
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce timer ref so we cancel pending searches when the user
  // keeps typing. 250ms is short enough to feel snappy and long enough
  // to keep getaddress.io requests down to roughly one per word.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value) return; // No autocomplete while showing the chosen card.
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const list = await autocompleteAddress(trimmed);
        setSuggestions(list);
      } catch (e) {
        setError((e as Error).message);
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, value]);

  async function onPickSuggestion(s: AddressSuggestion) {
    setResolving(true);
    setError(null);
    try {
      const resolved = await resolveAddress(s.id);
      onChange(resolved);
      setQuery('');
      setSuggestions([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setResolving(false);
    }
  }

  function onClearChosen() {
    onChange({ address_line_1: '', city: '', postcode: '' });
  }

  // ── Resolved state: show the picked address as a card ───────────────
  if (value && value.address_line_1) {
    return (
      <View
        style={[
          styles.chosenCard,
          {
            backgroundColor: t.colors.brand.tint,
            borderColor: t.colors.brand.primary,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[t.type.caption, { color: t.colors.brand.primary }]}>
            Site address
          </Text>
          <Text
            style={[
              t.type.bodyLg,
              { color: t.colors.text.primary, marginTop: 6 },
            ]}
          >
            {value.address_line_1}
          </Text>
          <Text
            style={[
              t.type.body,
              { color: t.colors.text.secondary, marginTop: 2 },
            ]}
          >
            {value.city}{value.city && value.postcode ? ' · ' : ''}{value.postcode}
          </Text>
        </View>
        <Pressable onPress={onClearChosen} hitSlop={12} accessibilityLabel="Use a different address">
          <Ionicons name="close-circle" size={22} color={t.colors.brand.primary} />
        </Pressable>
      </View>
    );
  }

  // ── Search state ────────────────────────────────────────────────────
  return (
    <View>
      <InputField
        label="Site address"
        value={query}
        onChangeText={setQuery}
        placeholder="Start typing… e.g. 10 Downing"
        autoCapitalize="words"
        autoComplete="street-address"
        editable={!resolving}
      />

      {searching ? (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={t.colors.brand.primary} />
          <Text
            style={[
              t.type.body,
              { color: t.colors.text.secondary, marginLeft: 10 },
            ]}
          >
            Searching…
          </Text>
        </View>
      ) : null}

      {error ? (
        <Text
          style={[
            t.type.body,
            { color: t.colors.destructive.text, marginTop: 6 },
          ]}
        >
          {error}
        </Text>
      ) : null}

      {suggestions.length > 0 ? (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: t.colors.bg.surface,
              borderColor: t.colors.border.subtle,
            },
          ]}
        >
          {suggestions.map((s, idx) => {
            const isLast = idx === suggestions.length - 1;
            return (
              <Pressable
                key={s.id}
                onPress={() => onPickSuggestion(s)}
                disabled={resolving}
                style={({ pressed }) => [
                  styles.dropdownRow,
                  !isLast && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: t.colors.border.subtle,
                  },
                  pressed && { backgroundColor: t.colors.bg.canvas },
                ]}
                accessibilityRole="button"
                accessibilityLabel={s.address}
              >
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={t.colors.text.tertiary}
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={[t.type.body, { color: t.colors.text.primary, flex: 1 }]}
                  numberOfLines={2}
                >
                  {s.address}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {resolving ? (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={t.colors.brand.primary} />
          <Text
            style={[
              t.type.body,
              { color: t.colors.text.secondary, marginLeft: 10 },
            ]}
          >
            Fetching address…
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ── Manual entry mode ─────────────────────────────────────────────────

interface ManualEntryProps {
  line1: string;
  onLine1Change: (s: string) => void;
  city: string;
  onCityChange: (s: string) => void;
  postcode: string;
  onPostcodeChange: (s: string) => void;
}

function ManualEntry({
  line1,
  onLine1Change,
  city,
  onCityChange,
  postcode,
  onPostcodeChange,
}: ManualEntryProps) {
  return (
    <View style={{ gap: 16 }}>
      <InputField
        label="Address"
        value={line1}
        onChangeText={onLine1Change}
        placeholder="23 Beech Road"
        autoCapitalize="words"
      />
      <InputField
        label="City / Town"
        value={city}
        onChangeText={onCityChange}
        placeholder="London"
        autoCapitalize="words"
      />
      <InputField
        label="Postcode"
        value={postcode}
        onChangeText={onPostcodeChange}
        placeholder="SW19 4QP"
        autoCapitalize="characters"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  dropdown: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownRow: {
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
});
