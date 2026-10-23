import { memo } from 'react';
import { ScrollView, View } from 'react-native';
import { Heatmap, HeatmapWeekdayLabels } from '@/components/ui/Heatmap';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { dataColors } from '@/lib/dataColors';
import { dayOfMonth, formatLongDate, WEEKDAY_LETTERS } from '@/lib/date';
import { heatLevel, isActiveDay } from '@/lib/heatmap';
import type { Habit } from '@/lib/repos/habits';
import { habitMonthRows, habitPeriod, type HabitTrackerMode } from './habitPeriod';

export const HabitTracker = memo(function HabitTracker({ habit, counts, mode, anchor, today, selected = today, onSelectDate, fitWidth }: {
  habit: Habit; counts: Readonly<Record<string, number>>; mode: HabitTrackerMode; anchor: string; today: string;
  selected?: string; onSelectDate?: (date: string) => void;
  /** Static exported images fit the full year within their known panel width. */
  fitWidth?: number;
}) {
  const theme = useTheme();
  const palette = dataColors(theme, habit.color);
  const period = habitPeriod(mode, anchor);
  if (mode === 'Year') {
    const squareSize = fitWidth ? Math.max(2, (fitWidth - (period.weeks - 1) * 2) / period.weeks) : theme.sizes.heatmapSquare;
    const grid = <Heatmap color={habit.color} startDate={period.gridStart} weeks={period.weeks} counts={counts} today={today}
      dailyGoal={habit.dailyGoal} activeDays={habit.activeDays} outlinedDate={selected} showMonthLabels future="faint"
      minDate={period.start} maxDate={period.end} squareSize={squareSize} gap={fitWidth ? 2 : undefined} onSelectDate={onSelectDate} />;
    return fitWidth ? grid : <View style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row' }}><HeatmapWeekdayLabels />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel={`${period.label} habit tracker`}>{grid}</ScrollView>
      </View>
      <Text variant="caption1" color="secondaryLabel">Swipe to see January through December</Text>
    </View>;
  }
  return <View>
    <View style={{ flexDirection: 'row', marginBottom: theme.spacing.xs }}>
      {WEEKDAY_LETTERS.map((letter, index) => <Text key={index} variant="caption1" align="center" color="secondaryLabel" style={{ flex: 1 }}>{letter}</Text>)}
    </View>
    {habitMonthRows(anchor).map((row, index) => <View key={index} style={{ flexDirection: 'row' }}>
      {row.map((date, column) => {
        if (!date) return <View key={`blank-${column}`} style={{ flex: 1 }} />;
        const count = counts[date] ?? 0;
        const future = date > today;
        const level = future ? 0 : heatLevel(count, habit.dailyGoal);
        const inactive = !isActiveDay(habit.activeDays, date) && count === 0;
        const highlighted = date === selected;
        const label = `${formatLongDate(date)}, ${count} of ${habit.dailyGoal}${future ? ', future day' : inactive ? ', rest day' : ''}`;
        const content = <View style={{ minHeight: theme.sizes.touchTarget, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xxs,
          borderRadius: theme.radii.sm, backgroundColor: inactive ? 'transparent' : palette.heatmap[level], opacity: future ? 0.35 : 1,
          borderWidth: 1.5, borderColor: highlighted ? palette.accent : inactive ? palette.border : 'transparent', borderStyle: inactive ? 'dashed' : 'solid' }}>
          <Text variant="caption1" weight={highlighted ? 'bold' : 'regular'} style={{ color: level >= 3 ? palette.onAccent : theme.colors.label }}>{dayOfMonth(date)}</Text>
          {count >= habit.dailyGoal ? <Icon name="check" size={12} rawColor={palette.onAccent} strokeWidth={3} />
            : count > 0 ? <Text variant="caption2" style={{ color: level >= 3 ? palette.onAccent : palette.accent }}>{count}/{habit.dailyGoal}</Text> : null}
        </View>;
        return <View key={date} style={{ flex: 1, padding: theme.spacing.xxs }}>
          {onSelectDate ? <PressableScale haptic="selection" disabled={future} accessibilityLabel={label} onPress={() => onSelectDate(date)}>{content}</PressableScale>
            : <View accessible accessibilityLabel={label}>{content}</View>}
        </View>;
      })}
    </View>)}
  </View>;
});
