import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GroupedList, ListRow } from '@/components/ui/GroupedList';
import { Heatmap, HeatmapWeekdayLabels } from '@/components/ui/Heatmap';
import { LargeTitleScreen } from '@/components/ui/LargeTitleScreen';
import { LoadState } from '@/components/ui/LoadState';
import { Stepper } from '@/components/ui/Stepper';
import { Text } from '@/components/ui/Text';
import { useAction, useResource } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { addDays, formatLongDate, startOfWeek, todayLocalDate } from '@/lib/date';
import { getHabit, habitStats, listHabitLogs, tickHabit } from '@/lib/repos/habits';
import { HabitSheet } from './HabitSheet';

export function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const action = useAction();
  const today = todayLocalDate();
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState(false);
  const { data, error, refresh } = useResource(useCallback(async () => ({ habit: await getHabit(Number(id)), logs: await listHabitLogs('1970-01-01', todayLocalDate()) }), [id]));
  const habit = data?.habit;
  const counts = Object.fromEntries((data?.logs ?? []).filter((l) => l.habitId === Number(id)).map((l) => [l.date, l.count]));
  const stats = habit ? habitStats(habit, counts, today) : null;
  const count = counts[selected] ?? 0;
  return <LargeTitleScreen title={habit ? `${habit.icon || '🌱'} ${habit.name}` : 'Habit'} showBack bottomInset="safeArea"
    headerRight={habit ? <Button title="Edit" size="small" variant="plain" onPress={() => setEditing(true)} /> : undefined} contentContainerStyle={{ gap: theme.spacing.lg }}>
    {error || !data ? <LoadState error={error} retry={refresh} /> : !habit || !stats ? <Text align="center">This habit is no longer available.</Text> : <>
      <View style={{ alignItems: 'center' }}><AnimatedNumber value={stats.current} variant="display" /><Text color="secondaryLabel">day streak</Text></View>
      <Card>
        <View style={{ flexDirection: 'row' }}><HeatmapWeekdayLabels />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} ref={(scroll) => { scroll?.scrollToEnd({ animated: false }); }}>
            <Heatmap startDate={addDays(startOfWeek(today), -52 * 7)} weeks={53} counts={counts} today={today} dailyGoal={habit.dailyGoal} activeDays={habit.activeDays} outlinedDate={selected} showMonthLabels onSelectDate={setSelected} />
          </ScrollView>
        </View>
        <Text variant="caption1" color="secondaryLabel">Less ░ ▒ ▓ █ More</Text>
        <Text>{formatLongDate(selected)}</Text><Text color="secondaryLabel">{count} times</Text>
        <Stepper value={count} min={0} onChange={(value) => { void action(() => tickHabit(habit.id, selected, value > count ? 1 : -1)); }} accessibilityLabel="Ticks on selected day" />
      </Card>
      <GroupedList><ListRow title="Best streak" value={`${stats.best} days`} /><ListRow title="Completion" value={`${stats.completion}%`} /><ListRow title="Total ticks" value={String(stats.total)} /></GroupedList>
      {editing && <HabitSheet initial={habit} onClose={() => setEditing(false)} />}
    </>}
  </LargeTitleScreen>;
}
