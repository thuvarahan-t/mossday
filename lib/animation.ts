import { withSpring, withTiming } from 'react-native-reanimated';
import { durations, easing, spring } from '@/constants/motion';

export type SpringName = keyof typeof spring;

/**
 * Animates to `toValue` with a motion-token spring, or a short fade-speed timing when
 * Reduce Motion is on. Runs on either thread, so it can be called inside worklets.
 */
export function animateTo(toValue: number, springName: SpringName, reduceMotion: boolean) {
  'worklet';
  return reduceMotion
    ? withTiming(toValue, { duration: durations.fast, easing: easing.standard })
    : withSpring(toValue, spring[springName]);
}
