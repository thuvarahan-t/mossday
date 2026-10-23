import { useEffect, useRef, type ReactNode } from 'react';
import { useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { durations, easing } from '@/constants/motion';
import { animateTo } from '@/lib/animation';
import { haptics } from '@/lib/haptics';
import { periodSwipeDelta } from './periodSwipe';

/** How far the content follows the finger, and the stiffer pull past the first or last section. */
const FOLLOW = 0.35;
const BLOCKED_FOLLOW = 0.12;
/** Share of the screen width the old view slides out and the new one slides in from. */
const TRAVEL = 0.3;
/** If the next view never renders (a failed load), bring the old content back. */
const RESTORE_AFTER_MS = 800;

/**
 * Horizontal swipes move between the Expenses sections (left: Day → Week → Month; right:
 * back). The old view slides out and fades; the new one slides in from the far side once
 * its data has rendered (`contentKey` changes), so stale totals never flash. Section taps
 * and date steps (arrows, date picker) get the same slide-in, in the direction they move.
 * Controls with their own horizontal drag activate sooner and keep it.
 */
export function PeriodSwipeArea<T extends string>({ children, contentKey, periods, onSwipe, style }: {
  children: ReactNode; contentKey: { period: T; from: string };
  /** Section order: both the swipe order and the direction new views slide in from. */
  periods: readonly T[];
  onSwipe: (period: T) => void; style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const offset = useSharedValue(0);
  const opacity = useSharedValue(1);
  const shown = useRef(contentKey);
  const restore = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { period, from } = contentKey;
  const index = periods.indexOf(period);
  const canGoBack = index > 0;
  const canGoForward = index < periods.length - 1;

  useEffect(() => {
    const before = shown.current;
    shown.current = { period, from };
    if (restore.current) { clearTimeout(restore.current); restore.current = null; }
    if (before.from === from && before.period === period) return;
    const fadeIn = withTiming(1, { duration: durations.normal, easing: easing.standard });
    if (reduced) { offset.set(0); opacity.set(withSequence(withTiming(0, { duration: 0 }), fadeIn)); return; }
    // Later sections, and later dates within one, come in from the right.
    const side = before.period !== period ? (periods.indexOf(period) > periods.indexOf(before.period) ? 1 : -1) : from > before.from ? 1 : -1;
    offset.set(withSequence(withTiming(side * width * TRAVEL, { duration: 0 }), animateTo(0, 'snappy', false)));
    opacity.set(withSequence(withTiming(0, { duration: 0 }), fadeIn));
  }, [period, from, periods, reduced, width, offset, opacity]);
  useEffect(() => () => { if (restore.current) clearTimeout(restore.current); }, []);

  const change = (delta: -1 | 1) => {
    haptics.selection();
    onSwipe(periods[index + delta]);
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
      const blocked = event.translationX < 0 ? !canGoForward : !canGoBack;
      offset.set(event.translationX * (blocked ? BLOCKED_FOLLOW : FOLLOW));
    },
    onDeactivate: (event) => {
      const delta = periodSwipeDelta(event.translationX, event.velocityX);
      if (delta === 0 || (delta === 1 && !canGoForward) || (delta === -1 && !canGoBack)) {
        offset.set(animateTo(0, 'snappy', reduced));
        return;
      }
      // Next leaves to the left, previous to the right; the section changes once it is out.
      opacity.set(withTiming(0, { duration: durations.fast, easing: easing.standard }));
      offset.set(withTiming(reduced ? 0 : -delta * width * TRAVEL, { duration: durations.fast, easing: easing.standard }, (finished) => {
        if (finished) scheduleOnRN(change, delta);
      }));
    },
  });
  const slideStyle = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ translateX: offset.get() }] }));
  return <GestureDetector gesture={pan}><Animated.View style={[style, slideStyle]}>{children}</Animated.View></GestureDetector>;
}
