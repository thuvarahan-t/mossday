import { memo, useEffect } from 'react';
import Animated, { interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'regular' | 'small';
};

/** Pill chip; the selected state fades to the green tint with `spring.snappy`. */
export const Chip = memo(function Chip({ label, selected = false, onPress, size = 'regular' }: ChipProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(selected ? 1 : 0);
  const { fill, accent } = theme.colors;

  useEffect(() => {
    progress.set(animateTo(selected ? 1 : 0, 'snappy', reduceMotion));
  }, [progress, reduceMotion, selected]);

  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.get(), [0, 1], [fill, accent]),
  }));

  return (
    <PressableScale
      haptic="selection"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          {
            height: size === 'regular' ? theme.sizes.chipHeight : theme.sizes.smallChipHeight,
            paddingHorizontal: theme.spacing.lg,
            borderRadius: theme.radii.pill,
            justifyContent: 'center',
          },
          style,
        ]}
      >
        <Text weight={selected ? 'semibold' : 'regular'} color={selected ? 'onAccent' : 'label'} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </PressableScale>
  );
});
