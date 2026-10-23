import { memo, useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import Svg, { Line, Rect } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { Text } from './Text';

export type BarChartProps = {
  /** One value per day (cents); `null` = a future day drawn as a dash. */
  values: (number | null)[];
  /** Index of today (dark green bar, bold label). */
  highlightIndex?: number;
  /** Indexes that get an x-axis label, and their text. */
  labels: { index: number; text: string }[];
  height?: number;
  accessibilityLabel: string;
};

const DASH_HEIGHT = 3;
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const ChartBar = memo(function ChartBar({ x, width, height, chartHeight, color, radius }: {
  x: number; width: number; height: number; chartHeight: number; color: string; radius: number;
}) {
  const reduced = useReducedMotion();
  const current = useSharedValue(reduced ? height : 0);
  useEffect(() => { current.set(animateTo(height, 'gentle', reduced)); }, [current, height, reduced]);
  const animatedProps = useAnimatedProps(() => {
    const visible = Math.max(0, Math.min(chartHeight, current.get()));
    return { y: chartHeight - visible, height: visible };
  });
  return <AnimatedRect x={x} width={width} rx={radius} fill={color} animatedProps={animatedProps} />;
});

/** Daily spending bars (Week/Month): soft green past days, solid today, dashed average line. */
export const BarChart = memo(function BarChart({ values, highlightIndex, labels, height = 140, accessibilityLabel }: BarChartProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const count = Math.max(values.length, 1);
  const slot = width / count;
  const barWidth = Math.max(2, slot * (count > 10 ? 0.62 : 0.5));
  const known = values.filter((value): value is number => value !== null);
  const max = Math.max(1, ...known);
  const average = known.length ? known.reduce((sum, value) => sum + value, 0) / known.length : 0;
  const averageY = height - (average / max) * height;

  return (
    <View accessible accessibilityLabel={accessibilityLabel} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && (
        <View style={{ height }}>
          <Svg width={width} height={height}>
            {known.length > 0 && (
              <Line x1={0} x2={width} y1={averageY} y2={averageY} stroke={theme.colors.separator} strokeWidth={1} strokeDasharray="4 4" />
            )}
            {values.map((value, index) => {
              const x = index * slot + (slot - barWidth) / 2;
              if (value === null) {
                return <Rect key={index} x={x} y={height - DASH_HEIGHT} width={barWidth} height={DASH_HEIGHT}
                  rx={DASH_HEIGHT / 2} fill={theme.colors.fill} />;
              }
              const barHeight = Math.max(DASH_HEIGHT, (value / max) * height);
              return (
                <ChartBar key={index} x={x} width={barWidth} height={barHeight} chartHeight={height}
                  radius={Math.min(theme.radii.hairline + 1, barWidth / 2)}
                  color={index === highlightIndex ? theme.colors.accent : theme.colors.chartBar} />
              );
            })}
          </Svg>
        </View>
      )}
      <View style={[styles.labels, { height: theme.spacing.xxl, marginTop: theme.spacing.sm }]}>
        {width > 0 && labels.map((label) => {
          const isToday = label.index === highlightIndex;
          return (
            <Text
              key={label.index}
              variant="footnote"
              weight={isToday ? 'semibold' : 'regular'}
              color={isToday ? 'accent' : 'secondaryLabel'}
              align="center"
              style={[styles.label, { left: label.index * slot + slot / 2 - theme.spacing.xl, width: theme.spacing.xl * 2 }]}
            >
              {label.text}
            </Text>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  labels: { position: 'relative' },
  label: { position: 'absolute', top: 0 },
});
