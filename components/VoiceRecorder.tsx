import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { lightTheme } from '@/theme/light';

const MAX_SECONDS = 60;

type Props = {
  onRecorded: (args: { uri: string; durationMs: number }) => void;
  onClear?: () => void;
  attachedDurationMs?: number;
};

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function VoiceRecorder({ onRecorded, onClear, attachedDurationMs }: Props) {
  const t = lightTheme;
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  async function start() {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Microphone access needed', 'Enable in Settings to record voice notes.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsRecording(true);
      setElapsed(0);
      tickRef.current = setInterval(() => {
        setElapsed((e) => {
          if (e + 1 >= MAX_SECONDS) {
            void stop();
            return MAX_SECONDS;
          }
          return e + 1;
        });
      }, 1000);
    } catch (e) {
      Alert.alert("Couldn't start recording", (e as Error).message);
    }
  }

  async function stop() {
    try {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      await recorder.stop();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const uri = recorder.uri;
      const durationMs = (recorder.currentTime ?? elapsed) * 1000;
      setIsRecording(false);
      if (uri) onRecorded({ uri, durationMs });
    } catch (e) {
      Alert.alert("Couldn't stop recording", (e as Error).message);
      setIsRecording(false);
    }
  }

  function handleClear() {
    void Haptics.selectionAsync();
    onClear?.();
  }

  // Attached state — iMessage-style mini bubble with duration + clear
  if (attachedDurationMs != null && !isRecording) {
    return (
      <View style={[styles.attached, { backgroundColor: t.colors.brand.primary }]}>
        <View style={styles.miniPlay}>
          <View style={styles.miniTriangle} />
        </View>
        <Text style={styles.attachedTime}>
          Voice note · {formatTime(attachedDurationMs / 1000)}
        </Text>
        {onClear && (
          <Pressable onPress={handleClear} hitSlop={8} style={styles.clearBtn}>
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        )}
      </View>
    );
  }

  // Recording in progress — red rounded pill with pulsing dot
  if (isRecording) {
    return (
      <Pressable
        onPress={stop}
        style={[styles.recordingPill, { backgroundColor: t.colors.destructive.text }]}
      >
        <View style={styles.recDot} />
        <Text style={styles.recordingText}>{formatTime(elapsed)}</Text>
        <View style={styles.stopSquare} />
      </Pressable>
    );
  }

  // Default — outlined CTA
  return (
    <Pressable
      onPress={start}
      style={[
        styles.idlePill,
        { backgroundColor: t.colors.bg.surface, borderColor: t.colors.border.strong },
      ]}
    >
      <View style={[styles.micCircle, { backgroundColor: t.colors.brand.primary }]}>
        <Text style={styles.micGlyph}>●</Text>
      </View>
      <Text style={[t.type.bodyLgEmphasis, { color: t.colors.text.primary, marginLeft: 10 }]}>
        Record a voice note
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Idle CTA
  idlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 1,
  },
  micCircle: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micGlyph: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Recording
  recordingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 9999,
    gap: 10,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
  },
  recordingText: {
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    fontSize: 15,
    fontWeight: '600',
    minWidth: 36,
  },
  stopSquare: {
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },

  // Attached preview
  attached: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9999,
    gap: 8,
  },
  miniPlay: {
    width: 24,
    height: 24,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTriangle: {
    width: 0,
    height: 0,
    marginLeft: 2,
    borderLeftWidth: 7,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftColor: '#FFFFFF',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  attachedTime: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  clearText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', lineHeight: 18 },
});
