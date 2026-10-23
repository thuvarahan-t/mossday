import { useCallback, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scales } from '@/constants/motion';
import { animateTo } from '@/lib/animation';
import { haptics } from '@/lib/haptics';

export type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed; defaults to the app-wide 0.96. */
  pressedScale?: number;
  /** Optional 0→1 press progress shared with a child (glass highlight, row tint). */
  pressProgress?: SharedValue<number>;
  haptic?: keyof typeof haptics;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * iOS press feedback for every tappable element: springs down to 0.96 and back with
 * `spring.snappy`. No Android ripple. With Reduce Motion the scale becomes a dim.
 */
export function PressableScale({
  children, style, pressedScale = scales.pressed, pressProgress, haptic, disabled,
  onPressIn, onPressOut, onPress, accessibilityRole = 'button', ...rest
}: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const ownProgress = useSharedValue(0);
  const progress = pressProgress ?? ownProgress;

  const animatedStyle = useAnimatedStyle(() => reduceMotion
    ? { opacity: 1 - progress.get() * 0.4 }
    : { transform: [{ scale: 1 - progress.get() * (1 - pressedScale) }] });

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>((event) => {
    progress.set(animateTo(1, 'snappy', reduceMotion));
    onPressIn?.(event);
  }, [onPressIn, progress, reduceMotion]);

  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>((event) => {
    progress.set(animateTo(0, 'snappy', reduceMotion));
    onPressOut?.(event);
  }, [onPressOut, progress, reduceMotion]);

  const handlePress = useCallback<NonNullable<PressableProps['onPress']>>((event) => {
    if (haptic) haptics[haptic]();
    onPress?.(event);
  }, [haptic, onPress]);

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
