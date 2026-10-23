import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { animateTo } from '@/lib/animation';
import { haptics } from '@/lib/haptics';
import { periodSwipeDelta } from './periodSwipe';

/** How far the content follows the finger, and the stiffer pull past the latest period. */
const FOLLOW = 0.35;
const BLOCKED_FOLLOW = 0.12;

/**
 * Horizontal swipes change the Expenses period; vertical scrolling is untouched. Controls
 * with their own horizontal drag (segmented switch, swipe-to-delete rows) activate sooner,
 * so they keep their gestures. The header arrows remain the accessible way to step.
 */
export function PeriodSwipeArea({ children, canGoForward, onShift, style }: {
  children: ReactNode; canGoForward: boolean; onShift: (delta: -1 | 1) => void; style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const offset = useSharedValue(0);
  const change = (delta: -1 | 1) => {
    haptics.selection();
    onShift(delta);
  };
  const pan = usePanGesture({
    activeOffsetX: [-24, 24],
    failOffsetY: [-14, 14],
    onUpdate: (event) => {
      if (reduced) return;
      offset.set(event.translationX * (event.translationX > 0 && !canGoForward ? BLOCKED_FOLLOW : FOLLOW));
    },
    onDeactivate: (event) => {
      const delta = periodSwipeDelta(event.translationX, event.velocityX);
      if (delta === -1 || (delta === 1 && canGoForward)) scheduleOnRN(change, delta);
    },
    onFinalize: () => {
      offset.set(animateTo(0, 'snappy', reduced));
    },
  });
  const followStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));
  return <GestureDetector gesture={pan}><Animated.View style={[style, followStyle]}>{children}</Animated.View></GestureDetector>;
}
