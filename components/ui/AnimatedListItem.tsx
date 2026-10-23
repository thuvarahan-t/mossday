import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition, ReduceMotion, useReducedMotion } from 'react-native-reanimated';
import { durations, easing, spring } from '@/constants/motion';

const enter = FadeInDown.duration(durations.normal).easing(easing.standard).withInitialValues({ translateY: 8 });
const fade = FadeIn.duration(durations.fast).reduceMotion(ReduceMotion.Never);
const exit = FadeOut.duration(durations.fast).reduceMotion(ReduceMotion.Never);
const layout = LinearTransition.springify().damping(spring.default.damping).stiffness(spring.default.stiffness);

/** Stable keys preserve row state while insertions, removal and reordering animate. */
export function AnimatedListItem({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  return <Animated.View collapsable={false} style={style} entering={reduced ? fade : enter} exiting={exit} layout={reduced ? undefined : layout}>{children}</Animated.View>;
}
