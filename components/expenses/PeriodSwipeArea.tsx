import { useEffect, useRef, type ReactNode } from 'react';
import { useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { durations, easing } from '@/constants/motion';
import { animateTo } from '@/lib/animation';
import { haptics } from '@/lib/haptics';
import { periodSwipeDelta } from './periodSwipe';

/** How far the content follows the finger, and the stiffer pull past the latest period. */
const FOLLOW = 0.35;
const BLOCKED_FOLLOW = 0.12;
/** Share of the screen width the old period slides out and the new one slides in from. */
const TRAVEL = 0.3;
/** If the next period never renders (a failed load), bring the old content back. */
const RESTORE_AFTER_MS = 800;

/**
 * Horizontal swipes change the Expenses period (left for next, right for previous). The old
 * period slides out and fades; the new one slides in from the far side once its data has
 * rendered (`contentKey` changes), so stale totals never flash. Header-arrow steps get the
 * same slide-in. Controls with their own horizontal drag activate sooner and keep it.
 */
export function PeriodSwipeArea({ children, contentKey, canGoForward, onShift, style }: {
  children: ReactNode; contentKey: { period: string; from: string }; canGoForward: boolean;
  onShift: (delta: -1 | 1) => void; style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const offset = useSharedValue(0);
  const opacity = useSharedValue(1);
  const shown = useRef(contentKey);
  const restore = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { period, from } = contentKey;

  useEffect(() => {
    const before = shown.current;
    shown.current = { period, from };
    if (restore.current) { clearTimeout(restore.current); restore.current = null; }
    if (before.from === from && before.period === period) return;
    const fadeIn = withTiming(1, { duration: durations.normal, easing: easing.standard });
    // Switching Day / Week / Month has no direction: only fade.
    if (reduced || before.period !== period) { offset.set(0); opacity.set(withSequence(withTiming(0, { duration: 0 }), fadeIn)); return; }
    const side = from > before.from ? 1 : -1;
    offset.set(withSequence(withTiming(side * width * TRAVEL, { duration: 0 }), animateTo(0, 'snappy', false)));
    opacity.set(withSequence(withTiming(0, { duration: 0 }), fadeIn));
  }, [period, from, reduced, width, offset, opacity]);
  useEffect(() => () => { if (restore.current) clearTimeout(restore.current); }, []);

  const change = (delta: -1 | 1) => {
    haptics.selection();
    onShift(delta);
    restore.current = setTimeout(() => {
      offset.set(animateTo(0, 'snappy', reduced));
      opacity.set(withTiming(1, { duration: durations.fast }));
    }, RESTORE_AFTER_MS);
  };
  const pan = usePanGesture({
    activeOffsetX: [-24, 24],
    failOffsetY: [-14, 14],
    onUpdate: (event) => {
      if (reduced) return;
      offset.set(event.translationX * (event.translationX < 0 && !canGoForward ? BLOCKED_FOLLOW : FOLLOW));
    },
    onDeactivate: (event) => {
      const delta = periodSwipeDelta(event.translationX, event.velocityX);
      if (delta === 0 || (delta === 1 && !canGoForward)) {
        offset.set(animateTo(0, 'snappy', reduced));
        return;
      }
      // Next leaves to the left, previous to the right; the period changes once it is out.
      opacity.set(withTiming(0, { duration: durations.fast, easing: easing.standard }));
      offset.set(withTiming(reduced ? 0 : -delta * width * TRAVEL, { duration: durations.fast, easing: easing.standard }, (finished) => {
        if (finished) scheduleOnRN(change, delta);
      }));
    },
  });
  const slideStyle = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ translateX: offset.get() }] }));
  return <GestureDetector gesture={pan}><Animated.View style={[style, slideStyle]}>{children}</Animated.View></GestureDetector>;
}
