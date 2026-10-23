import { memo, useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { durations } from '@/constants/motion';
import { animateTo } from '@/lib/animation';
import { useTheme } from '@/hooks/useTheme';
import { addDays, dayOfMonth, daysInMonth, formatLongDate, startOfMonth, WEEKDAY_LETTERS, weekdayIndex, type LocalDate } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type MonthGridProps = {
  /** Any date inside the month to show. */
  month: LocalDate;
  today: LocalDate;
  selected: LocalDate;
  /** 0–4 spending tint per day (Diary calendar). */
  spendLevels: Readonly<Record<LocalDate, number>>;
  todoDates: ReadonlySet<LocalDate>;
  onSelect: (date: LocalDate) => void;
};

function DayCircle({ selected, tint, children }: { selected: boolean; tint: string; children: ReactNode }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const selection = useSharedValue(selected ? 2 : 0);
  const fill = useSharedValue(tint);
  useEffect(() => { selection.set(animateTo(selected ? 2 : 0, 'snappy', reduced)); }, [selection, selected, reduced]);
  useEffect(() => { fill.set(withTiming(tint, { duration: durations.fast })); }, [fill, tint]);
  const style = useAnimatedStyle(() => ({ borderWidth: Math.max(0, selection.get()), backgroundColor: fill.get() }));
  return <Animated.View style={[styles.center, { width: theme.sizes.dayCircle, height: theme.sizes.dayCircle, borderRadius: theme.radii.pill, borderColor: theme.colors.accentBar }, style]}>{children}</Animated.View>;
}

/** Diary calendar month: orange tint = spending level, dot = has to-dos, green = today. */
export const MonthGrid = memo(function MonthGrid({ month, today, selected, spendLevels, todoDates, onSelect }: MonthGridProps) {
  const theme = useTheme();
  const first = startOfMonth(month);
  const leading = weekdayIndex(first);
  const cells: (LocalDate | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth(first) }, (_, index) => addDays(first, index)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <View style={styles.row}>
        {WEEKDAY_LETTERS.map((letter, index) => (
          <Text key={`${letter}${index}`} variant="footnote" color="secondaryLabel" align="center" style={styles.cell}>{letter}</Text>
        ))}
      </View>
      {weeks.map((week, row) => (
        <View key={row} style={styles.row}>
          {week.map((date, column) => {
            if (!date) return <View key={`empty${column}`} style={styles.cell} />;
            const isToday = date === today;
            const isFuture = date > today;
            const isSelected = date === selected && !isToday;
            const tint = isToday ? theme.colors.accent : isFuture ? 'transparent' : theme.spend[spendLevels[date] ?? 0];
            return (
              <PressableScale
                key={date}
                style={[styles.cell, { paddingVertical: theme.spacing.xs, gap: theme.spacing.xs }]}
                accessibilityLabel={formatLongDate(date)}
                accessibilityState={{ selected: date === selected }}
                onPress={() => { haptics.selection(); onSelect(date); }}
              >
                <DayCircle selected={isSelected} tint={tint}>
                  <Text
                    variant="title3"
                    weight={isToday ? 'semibold' : 'regular'}
                    color={isToday ? 'onAccent' : isFuture ? 'secondaryLabel' : 'label'}
                    tabular
                  >
                    {dayOfMonth(date)}
                  </Text>
                </DayCircle>
                <View style={{
                  width: theme.sizes.dot, height: theme.sizes.dot, borderRadius: theme.radii.pill,
                  backgroundColor: todoDates.has(date) ? theme.accents.gray : 'transparent',
                }} />
              </PressableScale>
            );
          })}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
