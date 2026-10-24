import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type FlatList, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { addDays, dayOfMonth, daysBetween, formatLongDate, WEEKDAY_LETTERS, weekdayIndex, type LocalDate } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

/** Days shown at once, and how far the strip reaches back and ahead of today. */
const VISIBLE_DAYS = 7;
const DAYS_BACK = 730;
const DAYS_AHEAD = 365;

export type DayStripProps = {
  today: LocalDate;
  selected: LocalDate;
  /** Days with to-dos or a journal entry get a small dot. */
  markedDates?: ReadonlySet<LocalDate>;
  onSelect: (date: LocalDate) => void;
};

/**
 * A free-scrolling row of days, seven at a time. It is not paged by week: a swipe moves it
 * by as many days as the swipe carries (snapping to whole days), so any run of seven days,
 * say Wednesday to the next Tuesday, can be in view. It opens centred on the selected day
 * and recentres when the selection changes from elsewhere (the month grid, a link).
 *
 * The green selection circle is one view behind the days that travels to the new day with a
 * spring, following the scroll on the UI thread; each number fades from dark to white as the
 * circle passes under it. Jumps of more than a week (a far day picked in the month) land at
 * once rather than sweeping across the strip.
 */
export function DayStrip({ today, selected, markedDates, onSelect }: DayStripProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [circleTop, setCircleTop] = useState(0);
  const list = useRef<FlatList<LocalDate>>(null);
  const first = useMemo(() => addDays(today, -DAYS_BACK), [today]);
  const days = useMemo(() => Array.from({ length: DAYS_BACK + DAYS_AHEAD + 1 }, (_, index) => addDays(first, index)), [first]);
  const cell = width / VISIBLE_DAYS;
  const circle = theme.sizes.dayCircle;
  const indexOf = useCallback((date: LocalDate) => Math.max(0, Math.min(days.length - 1, daysBetween(first, date))), [days.length, first]);
  const centred = useCallback((date: LocalDate) => Math.max(0, indexOf(date) - Math.floor(VISIBLE_DAYS / 2)), [indexOf]);
  /** Content offset of the list, and the circle's position in the same content coordinates. */
  const scrollX = useSharedValue(0);
  const circleX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({ onScroll: (event) => { scrollX.set(event.contentOffset.x); } });

  // Recentre only for a new selection (or width), never because the strip re-rendered after
  // the user scrolled away on purpose.
  const handled = useRef('');
  useEffect(() => {
    const key = `${selected}|${cell}`;
    if (!cell || handled.current === key) return;
    const firstTime = !handled.current;
    handled.current = key;
    const index = indexOf(selected);
    const target = index * cell;
    const far = Math.abs(target - circleX.get()) > cell * VISIBLE_DAYS;
    circleX.set(firstTime || far ? target : animateTo(target, 'snappy', reduced));
    if (firstTime) {
      // Android may not report the initial scroll, so seed it from initialScrollIndex.
      scrollX.set(centred(selected) * cell);
      return;
    }
    const firstVisible = Math.round(scrollX.get() / cell);
    if (index < firstVisible || index >= firstVisible + VISIBLE_DAYS) list.current?.scrollToOffset({ offset: centred(selected) * cell, animated: true });
  }, [selected, cell, indexOf, centred, reduced, circleX, scrollX]);

  const circleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: circleX.get() - scrollX.get() + (cell - circle) / 2 }] }));
  const onCircleLayout = useCallback((top: number) => setCircleTop((current) => current === top ? current : top), []);

  return <View onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
    {cell > 0 && <>
      <Animated.View pointerEvents="none" style={[styles.circle, {
        top: circleTop, width: circle, height: circle, borderRadius: circle / 2, backgroundColor: theme.colors.accent,
      }, circleStyle]} />
      <Animated.FlatList ref={list} horizontal data={days} keyExtractor={(day) => day} showsHorizontalScrollIndicator={false}
        snapToInterval={cell} decelerationRate="fast" initialScrollIndex={centred(selected)} onScroll={onScroll} scrollEventThrottle={16}
        getItemLayout={(_data, index) => ({ length: cell, offset: cell * index, index })} initialNumToRender={VISIBLE_DAYS * 3} windowSize={5}
        renderItem={({ item, index }) => <DayCell date={item} index={index} width={cell} today={today} selected={item === selected}
          marked={!!markedDates?.has(item)} circleX={circleX} onSelect={onSelect} onCircleLayout={onCircleLayout} />} />
    </>}
  </View>;
}

const DayCell = memo(function DayCell({ date, index, width, today, selected, marked, circleX, onSelect, onCircleLayout }: {
  date: LocalDate; index: number; width: number; today: LocalDate; selected: boolean; marked: boolean;
  circleX: SharedValue<number>; onSelect: (date: LocalDate) => void; onCircleLayout: (top: number) => void;
}) {
  const theme = useTheme();
  const circle = theme.sizes.dayCircle;
  const isToday = date === today;
  // 1 while the travelling circle sits under this day, falling to 0 a day's width away.
  const onCircle = (x: number) => {
    'worklet';
    return Math.max(0, Math.min(1, 1 - Math.abs(x - index * width) / width));
  };
  const darkStyle = useAnimatedStyle(() => ({ opacity: 1 - onCircle(circleX.get()) }));
  const lightStyle = useAnimatedStyle(() => ({ opacity: onCircle(circleX.get()) }));
  const number = String(dayOfMonth(date));
  return <PressableScale style={{ width, alignItems: 'center', gap: theme.spacing.sm }} accessibilityLabel={formatLongDate(date)} accessibilityState={{ selected }}
    onPress={() => { if (!selected) { haptics.selection(); onSelect(date); } }}>
    <Text variant="footnote" color={isToday ? 'accent' : 'secondaryLabel'} weight={isToday ? 'semibold' : 'regular'}>{WEEKDAY_LETTERS[weekdayIndex(date)]}</Text>
    <View onLayout={(event: LayoutChangeEvent) => onCircleLayout(event.nativeEvent.layout.y)} style={[styles.center, { width: circle, height: circle }]}>
      <Animated.View style={darkStyle}><Text variant="title3" tabular color={isToday ? 'accent' : 'label'}>{number}</Text></Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, lightStyle]}><Text variant="title3" tabular weight="semibold" color="onAccent">{number}</Text></Animated.View>
    </View>
    <View style={{ width: theme.sizes.dot, height: theme.sizes.dot, borderRadius: theme.sizes.dot / 2, backgroundColor: marked ? theme.accents.gray : 'transparent' }} />
  </PressableScale>;
});

const styles = StyleSheet.create({
  circle: { position: 'absolute', left: 0 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
