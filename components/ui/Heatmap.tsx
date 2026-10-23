import { memo, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { GestureDetector, GestureStateManager, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';
import { durations, scales } from '@/constants/motion';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { addDays, dayOfMonth, monthShort, WEEKDAY_LETTERS, type LocalDate } from '@/lib/date';
import { heatLevel, isActiveDay } from '@/lib/heatmap';
import { haptics } from '@/lib/haptics';
import { dataColors } from '@/lib/dataColors';
import { Text } from './Text';

export type HeatmapProps = {
  /** Monday of the first column. */
  startDate: LocalDate;
  weeks: number;
  counts: Readonly<Record<LocalDate, number>>;
  today: LocalDate;
  dailyGoal?: number;
  activeDays?: number;
  /** Square drawn with an outline (today on cards, the selected day on the detail screen). */
  outlinedDate?: LocalDate;
  /** Future days: absent on cards, faint on the full-year grid. */
  future?: 'hidden' | 'faint';
  squareSize?: number;
  gap?: number;
  showMonthLabels?: boolean;
  onSelectDate?: (date: LocalDate) => void;
  /** Dragging the outlined square started (true) or ended; parents pause their scrolling. */
  onScrubChange?: (scrubbing: boolean) => void;
  color?: string;
  minDate?: LocalDate;
  maxDate?: LocalDate;
};

type Square = { date: LocalDate; x: number; y: number; level: number; future: boolean; inactive: boolean };

const MONTH_LABEL_HEIGHT = 18;
/** Touches this close to the outlined square's centre grab it; squares are far smaller than a fingertip. */
const GRAB_RADIUS = 24;

/** Day offset from the first column's Monday under a point in the grid, or -1 outside it. */
export function heatmapIndexAt(x: number, y: number, step: number, top: number, weeks: number): number {
  'worklet';
  const column = Math.floor(x / step);
  const row = Math.floor((y - top) / step);
  return column < 0 || column >= weeks || row < 0 || row > 6 ? -1 : column * 7 + row;
}

/**
 * GitHub-style contribution grid (spec §5.3): columns are weeks, rows Monday→Sunday.
 * Drawn with SVG; the outlined square is an animated overlay so it can spring between
 * days and pop when its count changes.
 */
export const Heatmap = memo(function Heatmap({
  startDate, weeks, counts, today, dailyGoal = 1, activeDays = 127, outlinedDate, future = 'hidden',
  squareSize, gap, showMonthLabels, onSelectDate, onScrubChange, color, minDate, maxDate,
}: HeatmapProps) {
  const theme = useTheme();
  const palette = useMemo(() => color ? dataColors(theme, color).heatmap : theme.heatmap, [color, theme]);
  const size = squareSize ?? theme.sizes.heatmapSquare;
  const spacing = gap ?? theme.sizes.heatmapGap;
  const step = size + spacing;
  const top = showMonthLabels ? MONTH_LABEL_HEIGHT : 0;
  const width = weeks * step - spacing;
  const height = 7 * step - spacing;

  const { squares, monthLabels } = useMemo(() => {
    const cells: Square[] = [];
    const labels: { x: number; text: string }[] = [];
    for (let week = 0; week < weeks; week += 1) {
      for (let day = 0; day < 7; day += 1) {
        const date = addDays(startDate, week * 7 + day);
        if ((minDate && date < minDate) || (maxDate && date > maxDate)) continue;
        // Label a month above its first full week (the column whose Monday is the 1st–7th).
        if (day === 0 && dayOfMonth(date) <= 7) labels.push({ x: week * step, text: monthShort(date) });
        cells.push({
          date, x: week * step, y: day * step,
          level: heatLevel(counts[date] ?? 0, dailyGoal),
          future: date > today,
          inactive: !isActiveDay(activeDays, date),
        });
      }
    }
    return { squares: cells, monthLabels: labels };
  }, [activeDays, counts, dailyGoal, startDate, step, today, weeks, minDate, maxDate]);

  const outlined = squares.find((square) => square.date === outlinedDate);

  /** Selects the day at `index` if it is in range and not in the future. */
  const selectIndex = (index: number) => {
    if (!onSelectDate || index < 0) return;
    const date = addDays(startDate, index);
    if (date > today || (minDate && date < minDate) || (maxDate && date > maxDate) || date === outlinedDate) return;
    haptics.selection();
    onSelectDate(date);
  };
  const onPress = (event: GestureResponderEvent) => {
    selectIndex(heatmapIndexAt(event.nativeEvent.locationX, event.nativeEvent.locationY, step, top, weeks));
  };
  const setScrubbing = (scrubbing: boolean) => onScrubChange?.(scrubbing);

  // Grab the outlined square and drag it: it follows the finger day by day (springing
  // between squares with a tick each). Touches elsewhere fail at once, so taps select and
  // a surrounding scroll view still scrolls.
  const grabX = outlined ? outlined.x + size / 2 : -1;
  const grabY = outlined ? outlined.y + top + size / 2 : -1;
  const lastIndex = useSharedValue(-1);
  const scrub = usePanGesture({
    enabled: !!onSelectDate && !!outlined,
    manualActivation: true,
    onTouchesDown: (event) => {
      const touch = event.allTouches[0];
      const grabbed = !!touch && Math.hypot(touch.x - grabX, touch.y - grabY) <= GRAB_RADIUS;
      if (grabbed) GestureStateManager.activate(event.handlerTag);
      else GestureStateManager.fail(event.handlerTag);
    },
    onActivate: () => {
      lastIndex.set(-1);
      scheduleOnRN(setScrubbing, true);
    },
    onUpdate: (event) => {
      const index = heatmapIndexAt(event.x, event.y, step, top, weeks);
      if (index < 0 || index === lastIndex.get()) return;
      lastIndex.set(index);
      scheduleOnRN(selectIndex, index);
    },
    onFinalize: () => {
      scheduleOnRN(setScrubbing, false);
    },
  });

  // `box-only` makes this view the touch target: locationX/Y are reported relative to the
  // view touched, and the SVG below the month labels would shift every tap by a row.
  const grid = (
    <View pointerEvents={onSelectDate ? 'box-only' : undefined} style={{ width, height: height + top }}>
      {showMonthLabels && monthLabels.map((label) => (
        <Text key={`${label.x}`} variant="caption1" color="secondaryLabel" style={[styles.monthLabel, { left: label.x }]}>
          {label.text}
        </Text>
      ))}
      <Svg width={width} height={height} style={{ marginTop: top }}>
        {squares.map((square) => {
          if (square.future && future === 'hidden') return null;
          const color = palette[square.future ? 0 : square.level];
          return square.inactive && square.level === 0 && !square.future ? (
            <Rect key={square.date} x={square.x + 0.75} y={square.y + 0.75} width={size - 1.5} height={size - 1.5}
              rx={theme.radii.hairline} fill="none" stroke={palette[0]} strokeWidth={1.5} />
          ) : (
            <Rect key={square.date} x={square.x} y={square.y} width={size} height={size} rx={theme.radii.hairline}
              fill={color} opacity={square.future ? 0.5 : 1} />
          );
        })}
      </Svg>
      {outlined && (
        <HeatmapSquare
          x={outlined.x} y={outlined.y + top} size={size}
          color={palette[outlined.level]} outlineColor={color ? palette[4] : undefined} count={counts[outlined.date] ?? 0}
        />
      )}
    </View>
  );

  if (!onSelectDate) return grid;
  return <GestureDetector gesture={scrub}>
    <Pressable onPress={onPress} accessibilityLabel="Habit history" accessibilityHint="Tap a day, or drag the outlined day, to choose it">{grid}</Pressable>
  </GestureDetector>;
});

/**
 * The highlighted square: springs to its position and pops (1 → 1.15 → 1) when its count
 * changes, so a tick visibly lands on today's square.
 */
export function HeatmapSquare({ x, y, size, color, count, outlineColor }: { x: number; y: number; size: number; color: string; count: number; outlineColor?: string }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const left = useSharedValue(x);
  const topValue = useSharedValue(y);
  const scale = useSharedValue(1);
  const previousCount = useRef(count);
  const fill = useSharedValue(color);
  useEffect(() => { fill.set(withTiming(color, { duration: durations.normal })); }, [color, fill]);

  useEffect(() => {
    left.set(animateTo(x, 'snappy', reduceMotion));
    topValue.set(animateTo(y, 'snappy', reduceMotion));
  }, [left, reduceMotion, topValue, x, y]);

  useEffect(() => {
    if (count !== previousCount.current && !reduceMotion) {
      scale.set(withSequence(animateTo(scales.pop, 'bouncy', false), animateTo(1, 'bouncy', false)));
    }
    previousCount.current = count;
  }, [count, reduceMotion, scale]);

  const style = useAnimatedStyle(() => ({
    backgroundColor: fill.get(),
    transform: [{ translateX: left.get() }, { translateY: topValue.get() }, { scale: scale.get() }],
  }));
  const outline = 1.5;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.square, {
        width: size + outline * 2, height: size + outline * 2, marginLeft: -outline, marginTop: -outline,
        borderRadius: theme.radii.hairline + outline, borderWidth: outline, borderColor: outlineColor ?? theme.colors.label,
        backgroundColor: color,
      }, style]}
    />
  );
}

/** M / W / F labels for the left edge of a heatmap. */
export function HeatmapWeekdayLabels({ squareSize, gap, top = MONTH_LABEL_HEIGHT }: { squareSize?: number; gap?: number; top?: number }) {
  const theme = useTheme();
  const size = squareSize ?? theme.sizes.heatmapSquare;
  const step = size + (gap ?? theme.sizes.heatmapGap);
  return (
    <View style={{ paddingTop: top, width: theme.spacing.lg }}>
      {WEEKDAY_LETTERS.map((letter, index) => (
        <View key={`${letter}${index}`} style={{ height: step, justifyContent: 'center' }}>
          {index % 2 === 0 && index < 6 ? <Text variant="caption1" color="secondaryLabel">{letter}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  monthLabel: { position: 'absolute', top: 0 },
  square: { position: 'absolute', left: 0, top: 0 },
});
