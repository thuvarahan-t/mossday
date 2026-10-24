import { router } from 'expo-router';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { animateTo } from '@/lib/animation';
import { haptics } from '@/lib/haptics';
import { swipeDelta } from '@/lib/swipe';
import { tabNeighbour, type TabName } from './tabs';

/** How far the content follows the finger, and the stiffer pull at the first or last tab. */
const FOLLOW = 0.35;
const BLOCKED_FOLLOW = 0.12;

/**
 * Swipe sideways to move to the neighbouring tab in the tab bar's order: left for the tab
 * on the right, right for the tab on the left. The content follows the finger and springs
 * back. Controls with their own horizontal drag (swipe-to-delete rows, the Diary date strip
 * and month) activate sooner and keep it; vertical scrolling is untouched.
 */
export function TabSwipeArea({ tab, children, style }: { tab: TabName; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const offset = useSharedValue(0);
  const previous = tabNeighbour(tab, -1);
  const next = tabNeighbour(tab, 1);
  const go = (delta: -1 | 1) => {
    const href = delta === 1 ? next : previous;
    if (!href) return;
    haptics.selection();
    router.navigate(href);
  };
  const pan = usePanGesture({
    activeOffsetX: [-24, 24],
    failOffsetY: [-14, 14],
    onUpdate: (event) => {
      if (reduced) return;
      const blocked = event.translationX < 0 ? !next : !previous;
      offset.set(event.translationX * (blocked ? BLOCKED_FOLLOW : FOLLOW));
    },
    onDeactivate: (event) => {
      offset.set(animateTo(0, 'snappy', reduced));
      const delta = swipeDelta(event.translationX, event.velocityX);
      if (delta !== 0) scheduleOnRN(go, delta);
    },
  });
  const followStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));
  return <GestureDetector gesture={pan}><Animated.View style={[style, followStyle]}>{children}</Animated.View></GestureDetector>;
}
