import { memo, useEffect, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';

export type ProgressBarProps = {
  /** 0 → 1 (clamped). */
  progress: number;
  /** Raw colour; defaults to the green bar tint. */
  color?: string;
  height?: number;
  /** `false` draws the final length immediately (shared images are captured at once). */
  animated?: boolean;
};

/** Pill progress bar whose fill springs to its new length ("Budget bar springs"). */
export const ProgressBar = memo(function ProgressBar({ progress, color, height, animated = true }: ProgressBarProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const fill = useSharedValue(0);
  const barHeight = height ?? theme.sizes.progressBar;
  const clamped = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    fill.set(animateTo(clamped * width, 'default', reduceMotion));
  }, [clamped, fill, reduceMotion, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: fill.get() }));

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={{ height: barHeight, borderRadius: theme.radii.pill, backgroundColor: theme.colors.fill, overflow: 'hidden' }}
    >
      <Animated.View style={[{ height: barHeight, borderRadius: theme.radii.pill, backgroundColor: color ?? theme.colors.accentBar },
        animated ? fillStyle : { width: `${clamped * 100}%` }]} />
    </View>
  );
});
