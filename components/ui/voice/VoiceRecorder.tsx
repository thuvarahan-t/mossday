import {
  RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { easing } from '@/constants/motion';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { formatDuration } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { Icon } from '../Icon';
import { PressableScale } from '../PressableScale';
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
/** One breath of the ring that invites a touch. */
const RING_MS = 1600;
const READOUT_HEIGHT = 92;

/**
 * Hold-to-record panel. At rest it says what to do and a green mic breathes a ring outwards,
 * inviting a touch. The moment a finger lands the mic grows and turns red and the panel takes on
 * its tint, before recording has even started, so the press is felt at once; then the timer and
 * live waveform appear. Release saves, slide left cancels. A tap too short to record explains
 * itself rather than closing.
 */
export function VoiceRecorder({ onSave, onCancel, onRecordingChange, onError }: VoiceRecorderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [tooShort, setTooShort] = useState(false);
  const recording = useRef(false);
  const held = useRef(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  const slide = useSharedValue(0);
  const pressed = useSharedValue(0);
  const ring = useSharedValue(0);

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
    ring.set(withRepeat(withTiming(1, { duration: RING_MS, easing: easing.standard }), -1, false));
  }, [ring, reduceMotion]);

  const start = async () => {
    // A release can arrive while permission or native preparation is still pending.
    if (busy.current || recording.current) return;
    held.current = true;
    busy.current = true;
    setTooShort(false);
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
    if (!recording.current) {
      if (!cancelled && mounted.current) setTooShort(true);
      return;
    }
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
    if (cancelled) {
      haptics.warning();
      onCancel();
      return;
    }
    if (!recorder.uri || durationMs < MIN_DURATION_MS) {
      haptics.warning();
      setTooShort(true);
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

  const { accent, danger, dangerFill, card } = theme.colors;
  const panelStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(pressed.get(), [0, 1], [card, dangerFill]) }));
  const micStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slide.get() }, { scale: reduceMotion ? 1 : 1 + pressed.get() * 0.14 }],
  }));
  const buttonStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(pressed.get(), [0, 1], [accent, danger]) }));
  const ringStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pressed.get(), [0, 1], [accent, danger]),
    opacity: reduceMotion ? 0 : (1 - ring.get()) * 0.3,
    transform: [{ scale: 1 + ring.get() * 0.7 }],
  }));
  const cancelHintStyle = useAnimatedStyle(() => ({ opacity: 1 + slide.get() / CANCEL_DISTANCE }));

  return (
    <Animated.View style={[styles.panel, panelStyle, {
      borderTopLeftRadius: theme.radii.card, borderTopRightRadius: theme.radii.card, boxShadow: theme.shadows.sheet,
      paddingTop: theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.lg, gap: theme.spacing.sm,
    }]}>
      {!isRecording && <PressableScale haptic="tap" accessibilityLabel="Close recorder" hitSlop={theme.spacing.sm} onPress={onCancel}
        style={[styles.close, { top: theme.spacing.md, right: theme.spacing.md, width: theme.sizes.touchTarget, height: theme.sizes.touchTarget }]}>
        <Icon name="close" color="secondaryLabel" />
      </PressableScale>}
      <View style={[styles.center, { height: READOUT_HEIGHT, alignSelf: 'stretch', gap: theme.spacing.sm }]}>
        {isRecording ? <>
          <View style={[styles.row, { gap: theme.spacing.sm }]} accessibilityLiveRegion="polite">
            <View style={{ width: theme.spacing.md, height: theme.spacing.md, borderRadius: theme.radii.pill, backgroundColor: danger }} />
            <Text variant="title1" color="dangerText" tabular>{formatDuration(elapsedMs)}</Text>
          </View>
          <Waveform bars={levels} activeColor={danger} inactiveColor={dangerFill} pendingSlots={Math.max(0, LIVE_BARS - levels.length)} height={36} />
        </> : <>
          <View style={[styles.row, { gap: theme.spacing.sm }]}>
            <Icon name="hand" color="accent" />
            <Text variant="headline">Touch and hold to record</Text>
          </View>
          <Text variant="footnote" color={tooShort ? 'dangerText' : 'secondaryLabel'} weight={tooShort ? 'semibold' : undefined}>
            {tooShort ? 'Keep holding while you speak' : 'Let go to save, slide left to cancel'}
          </Text>
        </>}
      </View>
      <GestureDetector gesture={gesture}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel={isRecording ? 'Stop recording and save voice note' : 'Record a voice note'}
          accessibilityHint="Double tap to start or stop. You can also hold to record and slide left to cancel."
          onAccessibilityTap={() => { void (recording.current ? finish(false) : start()); }}
          style={[styles.center, { width: MIC_BUTTON * 2, height: MIC_BUTTON * 2 }, micStyle]}
        >
          <Animated.View style={[styles.absolute, { width: MIC_BUTTON, height: MIC_BUTTON, borderRadius: theme.radii.pill }, ringStyle]} />
          <Animated.View style={[styles.center, { width: MIC_BUTTON, height: MIC_BUTTON, borderRadius: theme.radii.pill }, buttonStyle]}>
            <Icon name="mic" size={theme.sizes.iconLarge + 8} color="onDanger" />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
      {/* Keeps its height at rest, so the mic stays under the finger when recording starts. */}
      <View style={[styles.hints, { paddingHorizontal: theme.spacing.xxl, opacity: isRecording ? 1 : 0 }]}>
        <Animated.View style={[styles.row, cancelHintStyle]}>
          <Icon name="chevronLeft" size={theme.sizes.iconSmall} color="secondaryLabel" />
          <Text variant="subheadline" color="secondaryLabel">Slide to cancel</Text>
        </Animated.View>
        <Text variant="subheadline" weight="semibold" color="dangerText">Release to save</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  absolute: { position: 'absolute' },
  close: { position: 'absolute', zIndex: 1, alignItems: 'center', justifyContent: 'center' },
  hints: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between' },
});
