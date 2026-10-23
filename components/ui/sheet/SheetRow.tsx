import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { durations, spring } from '@/constants/motion';

// Same spring as the sheet's own movement (`spring.gentle`), so when a row appears the
// blocks below it slide down exactly as fast as the sheet rises: they stay put on screen.
const move = LinearTransition.springify().damping(spring.gentle.damping).stiffness(spring.gentle.stiffness);
const appear = FadeIn.duration(durations.normal);
const disappear = FadeOut.duration(durations.fast);

/**
 * A block inside a content-sized sheet. `optional` rows (a note field, a hint) fade in and
 * out; every row glides to its new position when the content above it changes.
 */
export function SheetRow({ children, optional, style }: { children: ReactNode; optional?: boolean; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  // Reanimated's web layout animations misplace siblings, so the browser preview stays static.
  if (Platform.OS === 'web') return <View style={style}>{children}</View>;
  return (
    <Animated.View style={style} layout={reduced ? undefined : move}
      entering={optional ? appear : undefined} exiting={optional ? disappear : undefined}>
      {children}
    </Animated.View>
  );
}
