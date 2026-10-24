import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { FlatList, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
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
 */
export function DayStrip({ today, selected, markedDates, onSelect }: DayStripProps) {
  const [width, setWidth] = useState(0);
  const list = useRef<ComponentRef<typeof FlatList<LocalDate>>>(null);
  const first = useMemo(() => addDays(today, -DAYS_BACK), [today]);
  const days = useMemo(() => Array.from({ length: DAYS_BACK + DAYS_AHEAD + 1 }, (_, index) => addDays(first, index)), [first]);
  const cell = width / VISIBLE_DAYS;
  const indexOf = useCallback((date: LocalDate) => Math.max(0, Math.min(days.length - 1, daysBetween(first, date))), [days.length, first]);
  // The first index in view, kept up to date while scrolling, to tell if a selection is off-screen.
  const firstVisible = useRef(0);
  const centred = useCallback((date: LocalDate) => Math.max(0, indexOf(date) - Math.floor(VISIBLE_DAYS / 2)), [indexOf]);
  // Recentre only for a new selection (or width), never because the strip re-rendered after
  // the user scrolled away on purpose.
  const handled = useRef('');
  useEffect(() => {
    const key = `${selected}|${cell}`;
    if (!cell || handled.current === key) return;
    const firstTime = !handled.current;
    handled.current = key;
    const index = indexOf(selected);
    if (firstTime || (index >= firstVisible.current && index < firstVisible.current + VISIBLE_DAYS)) return;
    list.current?.scrollToOffset({ offset: centred(selected) * cell, animated: true });
  }, [selected, cell, indexOf, centred]);
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (cell) firstVisible.current = Math.round(event.nativeEvent.contentOffset.x / cell);
  };
  return <View onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
    {cell > 0 && <FlatList ref={list} horizontal data={days} keyExtractor={(day) => day} showsHorizontalScrollIndicator={false}
      snapToInterval={cell} decelerationRate="fast" initialScrollIndex={centred(selected)} onScroll={onScroll} scrollEventThrottle={32}
      getItemLayout={(_data, index) => ({ length: cell, offset: cell * index, index })} initialNumToRender={VISIBLE_DAYS * 3} windowSize={5}
      onLayout={() => { firstVisible.current = centred(selected); }}
      renderItem={({ item }) => <DayCell date={item} width={cell} today={today} selected={item === selected} marked={!!markedDates?.has(item)} onSelect={onSelect} />} />}
  </View>;
}

const DayCell = memo(function DayCell({ date, width, today, selected, marked, onSelect }: {
  date: LocalDate; width: number; today: LocalDate; selected: boolean; marked: boolean; onSelect: (date: LocalDate) => void;
}) {
  const theme = useTheme();
  const circle = theme.sizes.dayCircle;
  const isToday = date === today;
  return <PressableScale style={{ width, alignItems: 'center', gap: theme.spacing.sm }} accessibilityLabel={formatLongDate(date)} accessibilityState={{ selected }}
    onPress={() => { if (!selected) { haptics.selection(); onSelect(date); } }}>
    <Text variant="footnote" color={isToday ? 'accent' : 'secondaryLabel'} weight={isToday ? 'semibold' : 'regular'}>{WEEKDAY_LETTERS[weekdayIndex(date)]}</Text>
    {/* The fill is its own view, mounted only when selected, with an exact radius: Android
        could draw a recoloured view with an oversized radius as a square. */}
    <View style={{ width: circle, height: circle, alignItems: 'center', justifyContent: 'center' }}>
      {selected && <View style={{ position: 'absolute', width: circle, height: circle, borderRadius: circle / 2, backgroundColor: theme.colors.accent }} />}
      <Text variant="title3" tabular weight={selected ? 'semibold' : 'regular'} color={selected ? 'onAccent' : isToday ? 'accent' : 'label'}>{dayOfMonth(date)}</Text>
    </View>
    <View style={{ width: theme.sizes.dot, height: theme.sizes.dot, borderRadius: theme.radii.pill, backgroundColor: marked ? theme.accents.gray : 'transparent' }} />
  </PressableScale>;
});
