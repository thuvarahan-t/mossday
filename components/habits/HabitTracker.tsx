import { memo } from 'react';
import { ScrollView, View } from 'react-native';
import { Heatmap, HeatmapWeekdayLabels } from '@/components/ui/Heatmap';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { dataColors } from '@/lib/dataColors';
import { monthName } from '@/lib/date';
import type { Habit } from '@/lib/repos/habits';
import { habitPeriod, monthProgress, type HabitTrackerMode } from './habitPeriod';

/** Month and Year share the same contribution-grid look; Month adds its goal-met count beside it. */
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
  const { done, eligible } = monthProgress(habit, counts, anchor, today);
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
    <View style={{ flexDirection: 'row' }}>
      <HeatmapWeekdayLabels top={0} />
      <Heatmap color={habit.color} startDate={period.gridStart} weeks={period.weeks} counts={counts} today={today}
        dailyGoal={habit.dailyGoal} activeDays={habit.activeDays} outlinedDate={selected} future="faint"
        minDate={period.start} maxDate={period.end} onSelectDate={onSelectDate} />
    </View>
    <View accessible accessibilityLabel={`${done} of ${eligible} days done in ${monthName(anchor)}`} style={{ flex: 1, gap: theme.spacing.xxs }}>
      <Text variant="title2" weight="bold" tabular style={{ color: palette.accent }}>{done}<Text variant="title3" color="secondaryLabel">/{eligible}</Text></Text>
      <Text variant="footnote" color="secondaryLabel">days done in {monthName(anchor)}</Text>
    </View>
  </View>;
});
