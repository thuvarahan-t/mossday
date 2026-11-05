import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { animateTo } from '@/lib/animation';
import { durations, easing } from '@/constants/motion';
import { haptics } from '@/lib/haptics';
import { swipeDelta } from '@/lib/swipe';
import { tabNeighbour, type TabName } from './tabs';

/** How far the content follows the finger, and the stiffer pull at the first or last tab. */
const FOLLOW = 0.35;
const BLOCKED_FOLLOW = 0.12;

/**
 * Swipe sideways to move to the neighbouring tab in the tab bar's order: left for the tab
 * on the right, right for the tab on the left. A deliberate swipe slides out before
 * navigation; short or canceled drags spring back. Controls with their own horizontal drag (swipe-to-delete rows, the Diary date strip
 * and month) activate sooner and keep it; vertical scrolling is untouched.
 */
export function TabSwipeArea({ tab, children, style, enabled = true }: { tab: TabName; children: ReactNode; style?: StyleProp<ViewStyle>; enabled?: boolean }) {
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const offset = useSharedValue(0);
  const opacity = useSharedValue(1);
  const leaving = useSharedValue(false);
  useFocusEffect(useCallback(() => {
    offset.set(0); opacity.set(1); leaving.set(false);
  }, [offset, opacity, leaving]));
  const previous = tabNeighbour(tab, -1);
  const next = tabNeighbour(tab, 1);
  const go = (delta: -1 | 1) => {
    const href = delta === 1 ? next : previous;
    if (!href) return;
    haptics.selection();
    router.navigate(href);
  };
  const pan = usePanGesture({
    enabled,
    activeOffsetX: [-24, 24],
    failOffsetY: [-14, 14],
    onUpdate: (event) => {
      if (reduced || leaving.get()) return;
      const blocked = event.translationX < 0 ? !next : !previous;
      offset.set(event.translationX * (blocked ? BLOCKED_FOLLOW : FOLLOW));
    },
    onDeactivate: (event) => {
      if (leaving.get()) return;
      const delta = event.canceled ? 0 : swipeDelta(event.translationX, event.velocityX, width);
      const destination = delta === 1 ? next : delta === -1 ? previous : undefined;
      if (!destination || delta === 0) { offset.set(animateTo(0, 'snappy', reduced)); return; }
      leaving.set(true);
      opacity.set(withTiming(reduced ? 1 : 0, { duration: reduced ? 0 : durations.fast, easing: easing.standard }));
      offset.set(withTiming(reduced ? 0 : -delta * width * 0.3, { duration: reduced ? 0 : durations.fast, easing: easing.standard }, (finished) => {
        if (finished) scheduleOnRN(go, delta);
      }));
    },
  });
  const followStyle = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ translateX: offset.get() }] }));
  return <GestureDetector gesture={pan}><Animated.View style={[style, followStyle]}>{children}</Animated.View></GestureDetector>;
}
