import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getSignedUrl } from '@/services/media';
import { lightTheme } from '@/theme/light';

type Props = {
  storage_path: string;
};

const BAR_COUNT = 28;

/** Stable pseudo-random heights per clip — so the same recording always looks
 *  the same, but two different clips get different waveforms. */
function generateBars(seed: string): number[] {
  // FNV-1a hash, used to seed a small LCG.
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const bars: number[] = [];
  let state = (h >>> 0) || 1;
  for (let i = 0; i < BAR_COUNT; i++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    // Center-weight: bars in the middle look fuller, taper at edges.
    const center = 1 - Math.abs((i - BAR_COUNT / 2) / (BAR_COUNT / 2));
    const noise = 0.35 + (state % 100) / 100 * 0.65;
    bars.push(0.25 + noise * center * 0.75);
  }
  return bars;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/**
 * iMessage-style voice message bubble. Blue pill, white play/pause button,
 * waveform bars fill from left as playback advances, time on the right.
 */
export function VoicePlayer({ storage_path }: Props) {
  const t = lightTheme;
  const bars = useMemo(() => generateBars(storage_path), [storage_path]);

  const { data: url } = useQuery({
    queryKey: ['voice-url', storage_path],
    queryFn: () => getSignedUrl(storage_path),
    staleTime: 50 * 60 * 1000,
  });

  const player = useAudioPlayer(url ? { uri: url } : null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  useEffect(() => {
    if (status.didJustFinish) {
      void player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  function toggle() {
    if (!url) return;
    void Haptics.selectionAsync();
    if (status.playing) player.pause();
    else player.play();
  }

  const duration = status.duration ?? 0;
  const position = status.currentTime ?? 0;
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  const remaining = Math.max(0, duration - position);

  return (
    <Pressable
      onPress={toggle}
      style={({ pressed }) => [
        styles.bubble,
        { backgroundColor: t.colors.brand.primary, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      {/* Play / pause */}
      <View style={styles.playBtn}>
        {status.playing ? (
          <View style={styles.pauseIcon}>
            <View style={styles.pauseBar} />
            <View style={styles.pauseBar} />
          </View>
        ) : (
          <View style={styles.playTriangle} />
        )}
      </View>

      {/* Waveform — bars fill left→right as playback advances */}
      <View style={styles.waveform}>
        {bars.map((h, i) => {
          const filled = i / BAR_COUNT <= progress;
          return (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: 6 + h * 22,
                  backgroundColor: filled ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                },
              ]}
            />
          );
        })}
      </View>

      {/* Time on the right — shows remaining, like iMessage */}
      <Text style={styles.time}>
        {status.playing || position > 0 ? formatTime(remaining) : formatTime(duration)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 9999,
    gap: 10,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    marginLeft: 3, // optical centering
    borderLeftWidth: 10,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: '#FFFFFF',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  pauseIcon: { flexDirection: 'row', gap: 3 },
  pauseBar: { width: 3, height: 12, backgroundColor: '#FFFFFF', borderRadius: 1 },
  waveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 28,
  },
  bar: {
    width: 2.5,
    borderRadius: 9999,
  },
  time: {
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    fontSize: 13,
    fontWeight: '500',
    minWidth: 32,
    textAlign: 'right',
  },
});
