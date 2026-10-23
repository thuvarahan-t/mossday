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
};

/** Pill progress bar whose fill springs to its new length ("Budget bar springs"). */
export const ProgressBar = memo(function ProgressBar({ progress, color, height }: ProgressBarProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const fill = useSharedValue(0);
  const barHeight = height ?? theme.sizes.progressBar;

  useEffect(() => {
    fill.set(animateTo(Math.max(0, Math.min(1, progress)) * width, 'default', reduceMotion));
  }, [fill, progress, reduceMotion, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: fill.get() }));

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={{ height: barHeight, borderRadius: theme.radii.pill, backgroundColor: theme.colors.fill, overflow: 'hidden' }}
    >
      <Animated.View style={[{ height: barHeight, borderRadius: theme.radii.pill, backgroundColor: color ?? theme.colors.accentBar }, fillStyle]} />
    </View>
  );
});
