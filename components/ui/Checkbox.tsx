import { memo, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence } from 'react-native-reanimated';
import { scales } from '@/constants/motion';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

export type CheckboxProps = {
  checked: boolean;
  onToggle: () => void;
  accessibilityLabel: string;
  size?: number;
};

/** Round iOS-Reminders checkbox: the green fill springs in with a small pop when ticked. */
export const Checkbox = memo(function Checkbox({ checked, onToggle, accessibilityLabel, size }: CheckboxProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const side = size ?? theme.sizes.checkbox;
  const fill = useSharedValue(checked ? 1 : 0);
  const scale = useSharedValue(1);
  const wasChecked = useRef(checked);

  useEffect(() => {
    fill.set(animateTo(checked ? 1 : 0, 'snappy', reduceMotion));
    if (checked && !wasChecked.current && !reduceMotion) {
      scale.set(withSequence(animateTo(scales.pop, 'bouncy', false), animateTo(1, 'bouncy', false)));
    }
    wasChecked.current = checked;
  }, [checked, fill, reduceMotion, scale]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.get(), transform: [{ scale: 0.5 + fill.get() * 0.5 }] }));
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <PressableScale
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      haptic="tap"
      hitSlop={theme.spacing.md}
      onPress={onToggle}
    >
      <Animated.View style={[{ width: side, height: side }, scaleStyle]}>
        <View style={[StyleSheet.absoluteFill, {
          borderRadius: theme.radii.pill, borderWidth: 1.5, borderColor: theme.colors.tertiaryLabel,
        }]} />
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, {
          borderRadius: theme.radii.pill, backgroundColor: theme.colors.accent,
        }, fillStyle]}>
          <Icon name="check" size={Math.round(side * 0.62)} color="onAccent" strokeWidth={3} />
        </Animated.View>
      </Animated.View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
