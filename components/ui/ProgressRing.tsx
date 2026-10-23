import { memo, useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type ProgressRingProps = {
  /** 0 → 1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** Raw colour for data-coloured rings (habit colour); defaults to the green bar tint. */
  color?: string;
  children?: ReactNode;
};

/** Activity-style ring; the arc springs to its new length. */
export const ProgressRing = memo(function ProgressRing({ progress, size, strokeWidth = 5, color, children }: ProgressRingProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const side = size ?? theme.sizes.habitRing;
  const radius = (side - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animated = useSharedValue(progress);

  useEffect(() => {
    animated.set(animateTo(Math.max(0, Math.min(1, progress)), 'default', reduceMotion));
  }, [animated, progress, reduceMotion]);

  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - animated.get()) }));

  return (
    <View style={{ width: side, height: side }}>
      <Svg width={side} height={side} style={styles.rotate}>
        <Circle cx={side / 2} cy={side / 2} r={radius} stroke={theme.colors.fill} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={side / 2} cy={side / 2} r={radius}
          stroke={color ?? theme.colors.accentBar}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          fill="none"
          animatedProps={arcProps}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  rotate: { transform: [{ rotate: '-90deg' }] },
  center: { alignItems: 'center', justifyContent: 'center' },
});
