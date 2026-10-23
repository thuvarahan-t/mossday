import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ReduceMotion, useReducedMotion } from 'react-native-reanimated';
import { durations, spring } from '@/constants/motion';

// A quick fade only: content should feel instant, never like it is sliding in late.
const fade = FadeIn.duration(durations.fast).reduceMotion(ReduceMotion.Never);
const exit = FadeOut.duration(durations.fast).reduceMotion(ReduceMotion.Never);
const layout = LinearTransition.springify().damping(spring.gentle.damping).stiffness(spring.gentle.stiffness);

/** Stable keys preserve row state while insertions, removal and reordering animate. */
export function AnimatedListItem({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  // Reanimated's web layout animations can leave items absolutely positioned on top of
  // their siblings, so the browser preview renders lists statically.
  if (Platform.OS === 'web') return <View style={style}>{children}</View>;
  return <Animated.View collapsable={false} style={style} entering={fade} exiting={exit} layout={reduced ? undefined : layout}>{children}</Animated.View>;
}
