import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { addDays, dayOfMonth, formatLongDate, WEEKDAY_LETTERS, type LocalDate } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type WeekStripProps = {
  /** Monday of the visible week. */
  weekStart: LocalDate;
  selected: LocalDate;
  today: LocalDate;
  /** Days that have to-dos or a journal entry get a small dot (UI-ANALYSIS R16). */
  markedDates?: ReadonlySet<LocalDate>;
  onSelect: (date: LocalDate) => void;
  /** Swipe left/right: ±1 week. */
  onChangeWeek: (delta: 1 | -1) => void;
};

/** Mon–Sun strip under the Diary title; the green selection circle slides between days. */
export function WeekStrip({ weekStart, selected, today, markedDates, onSelect, onChangeWeek }: WeekStripProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [cellWidth, setCellWidth] = useState(0);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const selectedIndex = days.indexOf(selected);
  const offset = useSharedValue(0);
  const circle = theme.sizes.dayCircle;

  useEffect(() => {
    if (selectedIndex >= 0) offset.set(animateTo(selectedIndex * cellWidth, 'snappy', reduceMotion));
  }, [cellWidth, offset, reduceMotion, selectedIndex]);

  const circleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  const swipe = usePanGesture({
    activeOffsetX: [-20, 20],
    failOffsetY: [-12, 12],
    onDeactivate: (event) => {
      if (Math.abs(event.translationX) > 40) scheduleOnRN(onChangeWeek, event.translationX < 0 ? 1 : -1);
    },
  });

  return (
    <GestureDetector gesture={swipe}>
      <View
        onLayout={(event: LayoutChangeEvent) => setCellWidth((event.nativeEvent.layout.width - theme.spacing.sm * 2) / 7)}
        style={{ paddingHorizontal: theme.spacing.sm }}
      >
        <View style={styles.row}>
          {WEEKDAY_LETTERS.map((letter, index) => (
            <Text key={`${letter}${index}`} variant="footnote" color="secondaryLabel" align="center" style={styles.cell}>{letter}</Text>
          ))}
        </View>
        <View style={[styles.row, { marginTop: theme.spacing.sm }]}>
          {selectedIndex >= 0 && cellWidth > 0 && (
            <Animated.View
              style={[styles.circle, {
                width: circle, height: circle, borderRadius: theme.radii.pill, backgroundColor: theme.colors.accent,
                left: (cellWidth - circle) / 2,
              }, circleStyle]}
            />
          )}
          {days.map((date) => {
            const isSelected = date === selected;
            const isToday = date === today;
            return (
              <PressableScale
                key={date}
                style={[styles.cell, { height: circle + theme.spacing.sm }]}
                accessibilityLabel={formatLongDate(date)}
                accessibilityState={{ selected: isSelected }}
                onPress={() => { if (!isSelected) { haptics.selection(); onSelect(date); } }}
              >
                <View style={[styles.center, { height: circle }]}>
                  <Text
                    variant="title3"
                    weight={isSelected ? 'semibold' : 'regular'}
                    color={isSelected ? 'onAccent' : isToday ? 'accent' : 'label'}
                    tabular
                  >
                    {dayOfMonth(date)}
                  </Text>
                </View>
                <View style={{
                  width: theme.sizes.dot, height: theme.sizes.dot, borderRadius: theme.radii.pill,
                  backgroundColor: markedDates?.has(date) ? theme.accents.gray : 'transparent',
                }} />
              </PressableScale>
            );
          })}
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  circle: { position: 'absolute', top: 0 },
});
