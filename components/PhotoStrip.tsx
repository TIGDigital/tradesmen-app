import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { lightTheme } from '@/theme/light';

type Props = {
  /** Pre-resolved image URLs (signed for stored media, or local URIs for picker previews). */
  uris: string[];
  /** Max thumbs to show; default 3. */
  max?: number;
  /** Editable variant: shows "+" tile when uris.length < max. */
  onAdd?: () => void;
  /** Editable variant: tap a thumb to remove it (long-press would conflict with iOS save image). */
  onRemove?: (index: number) => void;
};

export function PhotoStrip({ uris, max = 3, onAdd, onRemove }: Props) {
  const t = lightTheme;
  const showAdd = !!onAdd && uris.length < max;
  const visible = uris.slice(0, max);

  if (visible.length === 0 && !showAdd) return null;

  return (
    <View style={styles.row}>
      {visible.map((uri, i) => (
        <View key={`${uri}-${i}`} style={styles.thumbWrap}>
          <Image
            source={{ uri }}
            style={styles.thumb}
            contentFit="cover"
            transition={120}
          />
          {onRemove && (
            <Pressable
              onPress={() => onRemove(i)}
              style={styles.removeBtn}
              hitSlop={6}
            >
              <Text style={styles.removeBtnText}>×</Text>
            </Pressable>
          )}
        </View>
      ))}
      {showAdd && (
        <Pressable
          onPress={onAdd}
          style={[
            styles.thumb,
            styles.addTile,
            {
              backgroundColor: t.colors.bg.surface2,
              borderColor: t.colors.border.strong,
            },
          ]}
        >
          <Text style={{ fontSize: 28, color: t.colors.text.tertiary }}>＋</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 84, height: 84, borderRadius: 12 },
  addTile: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 9999,
    backgroundColor: 'rgba(11,11,12,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
});
