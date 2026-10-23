import {
  RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { durations, easing } from '@/constants/motion';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { formatDuration } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { Icon } from '../Icon';
import { Text } from '../Text';
import { levelFromMetering, Waveform } from './Waveform';

export type VoiceRecorderProps = {
  /** Temporary file URI and length of a finished recording. */
  onSave: (uri: string, durationMs: number) => void;
  onCancel: () => void;
  onRecordingChange?: (recording: boolean) => void;
  onError: (message: string) => void;
};

const MIC_BUTTON = 76;
const LIVE_BARS = 24;
const CANCEL_DISTANCE = 100;
const MIN_DURATION_MS = 500;
const SAMPLE_INTERVAL_MS = 100;

/**
 * Hold-to-record panel (design "K · Recording"): press and hold the mic, watch the live
 * waveform and timer, release to save, slide left to cancel.
 */
export function VoiceRecorder({ onSave, onCancel, onRecordingChange, onError }: VoiceRecorderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const recording = useRef(false);
  const held = useRef(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  const slide = useSharedValue(0);
  const pressed = useSharedValue(0);
  const halo = useSharedValue(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      held.current = false;
      if (recording.current) {
        recording.current = false;
        void recorder.stop().catch(() => undefined);
        void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      }
    };
  }, [recorder]);

  useEffect(() => {
    if (!isRecording) return;
    // Sample the timer and meter into a rolling window of bars.
    const timer = setInterval(() => {
      const status = recorder.getStatus();
      setElapsedMs(status.durationMillis);
      setLevels((previous) => [...previous, levelFromMetering(status.metering)].slice(-LIVE_BARS));
    }, SAMPLE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isRecording, recorder]);

  useEffect(() => {
    if (reduceMotion) return;
    halo.set(withRepeat(withTiming(1, { duration: durations.slow * 3, easing: easing.standard }), -1, true));
  }, [halo, reduceMotion]);

  const start = async () => {
    // A release can arrive while permission or native preparation is still pending.
    if (busy.current || recording.current) return;
    held.current = true;
    busy.current = true;
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!mounted.current || !held.current) return;
      if (!permission.granted) {
        onError('Allow microphone access in Settings to record voice notes.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      if (!mounted.current || !held.current) return;
      await recorder.prepareToRecordAsync();
      if (!mounted.current || !held.current) return;
      recorder.record();
      recording.current = true;
      setLevels([]);
      setElapsedMs(0);
      setIsRecording(true);
      haptics.tick();
      onRecordingChange?.(true);
    } catch {
      if (mounted.current) onError('Recording could not start.');
    } finally {
      if (!recording.current) {
        await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      }
      busy.current = false;
    }
  };

  const finish = async (cancelled: boolean) => {
    held.current = false;
    if (!recording.current) return;
    busy.current = true;
    recording.current = false;
    setIsRecording(false);
    const durationMs = recorder.getStatus().durationMillis;
    let stopped = false;
    try {
      await recorder.stop();
      stopped = true;
    } catch {
      if (mounted.current) onError('Recording could not be saved. Please try again.');
    } finally {
      await setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
      busy.current = false;
    }
    if (!mounted.current) return;
    onRecordingChange?.(false);
    if (!stopped) return;
    if (cancelled || !recorder.uri || durationMs < MIN_DURATION_MS) {
      haptics.warning();
      onCancel();
      return;
    }
    haptics.success();
    onSave(recorder.uri, durationMs);
  };

  const gesture = usePanGesture({
    minDistance: 0,
    onBegin: () => {
      pressed.set(animateTo(1, 'snappy', reduceMotion));
      scheduleOnRN(start);
    },
    onUpdate: (event) => {
      slide.set(Math.min(0, event.translationX));
    },
    onFinalize: () => {
      const cancelled = slide.get() < -CANCEL_DISTANCE;
      pressed.set(animateTo(0, 'snappy', reduceMotion));
      slide.set(animateTo(0, 'snappy', reduceMotion));
      scheduleOnRN(finish, cancelled);
    },
  });

  const micStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slide.get() }, { scale: reduceMotion ? 1 : 1 + pressed.get() * 0.15 }],
  }));
  const haloOuter = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(halo.get(), [0, 1], [1.35, 1.6]) }] }));
  const haloInner = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(halo.get(), [0, 1], [1.12, 1.25]) }] }));
  const cancelHintStyle = useAnimatedStyle(() => ({ opacity: 1 + slide.get() / CANCEL_DISTANCE }));

  const haloBase = { width: MIC_BUTTON, height: MIC_BUTTON, borderRadius: theme.radii.pill, backgroundColor: theme.colors.dangerFill };

  return (
    <View style={[styles.panel, {
      backgroundColor: theme.colors.dangerFill, paddingTop: theme.spacing.xxl,
      paddingBottom: insets.bottom + theme.spacing.lg, gap: theme.spacing.lg,
    }]}>
      <View style={[styles.row, { gap: theme.spacing.sm }]} accessibilityLiveRegion="polite">
        <View style={{ width: theme.spacing.md, height: theme.spacing.md, borderRadius: theme.radii.pill, backgroundColor: theme.colors.danger }} />
        <Text variant="title1" color="dangerText" tabular>{formatDuration(elapsedMs)}</Text>
      </View>
      <Waveform
        bars={levels}
        activeColor={theme.colors.danger}
        inactiveColor={theme.colors.dangerFill}
        pendingSlots={Math.max(0, LIVE_BARS - levels.length)}
        height={36}
      />
      <GestureDetector gesture={gesture}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel={isRecording ? 'Stop recording and save voice note' : 'Record a voice note'}
          accessibilityHint="Double tap to start or stop. You can also hold to record and slide left to cancel."
          onAccessibilityTap={() => { void (recording.current ? finish(false) : start()); }}
          style={[styles.center, { width: MIC_BUTTON * 2, height: MIC_BUTTON * 2 }, micStyle]}
        >
          <Animated.View style={[styles.absolute, haloBase, haloOuter]} />
          <Animated.View style={[styles.absolute, haloBase, haloInner]} />
          <View style={[styles.center, { width: MIC_BUTTON, height: MIC_BUTTON, borderRadius: theme.radii.pill, backgroundColor: theme.colors.danger }]}>
            <Icon name="mic" size={theme.sizes.iconLarge + 8} color="onDanger" />
          </View>
        </Animated.View>
      </GestureDetector>
      <View style={[styles.hints, { paddingHorizontal: theme.spacing.xxl }]}>
        <Animated.View style={[styles.row, cancelHintStyle]}>
          <Icon name="chevronLeft" size={theme.sizes.iconSmall} color="secondaryLabel" />
          <Text variant="subheadline" color="secondaryLabel">Slide to cancel</Text>
        </Animated.View>
        <Text variant="subheadline" weight="semibold" color="dangerText">
          {isRecording ? 'Release to save' : 'Hold to record'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  absolute: { position: 'absolute' },
  hints: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between' },
});
