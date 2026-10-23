import { useEffect } from 'react';
import Animated, { interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { PressableScale } from './PressableScale';

const KNOB_INSET = 2;

export type ToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

/** iOS switch (51×31): the knob slides with `spring.snappy` and the track fades to green. */
export function Toggle({ value, onValueChange, accessibilityLabel, disabled }: ToggleProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(value ? 1 : 0);
  const { toggleWidth: width, toggleHeight: height } = theme.sizes;
  const knob = height - KNOB_INSET * 2;
  const travel = width - knob - KNOB_INSET * 2;
  const { toggleOff, accentBar } = theme.colors;

  useEffect(() => {
    progress.set(animateTo(value ? 1 : 0, 'snappy', reduceMotion));
  }, [progress, reduceMotion, value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.get(), [0, 1], [toggleOff, accentBar]),
  }));
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: progress.get() * travel }] }));

  return (
    <PressableScale
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      haptic="selection"
      onPress={() => onValueChange(!value)}
      hitSlop={theme.spacing.sm}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <Animated.View style={[{ width, height, borderRadius: theme.radii.pill, padding: KNOB_INSET }, trackStyle]}>
        <Animated.View
          style={[{
            width: knob, height: knob, borderRadius: theme.radii.pill,
            backgroundColor: theme.colors.knob, boxShadow: theme.shadows.knob,
          }, knobStyle]}
        />
      </Animated.View>
    </PressableScale>
  );
}
