import { useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, View } from 'react-native';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Card } from '@/components/ui/Card';
import { GroupedList, ListRow, Separator } from '@/components/ui/GroupedList';
import { Heatmap, HeatmapWeekdayLabels } from '@/components/ui/Heatmap';
import { LargeTitleScreen } from '@/components/ui/LargeTitleScreen';
import { LoadState } from '@/components/ui/LoadState';
import { Stepper } from '@/components/ui/Stepper';
import { Text } from '@/components/ui/Text';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import { useAction, useResource } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { useToday } from '@/hooks/useToday';
import { useSheetState } from '@/hooks/useSheetState';
import { addDays, formatWeekdayShortDate, startOfWeek, todayLocalDate } from '@/lib/date';
import { getHabit, habitStats, listHabitLogs, tickHabit } from '@/lib/repos/habits';
import { HabitSheet } from './HabitSheet';

export function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const action = useAction();
  const today = useToday();
  const history = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrolledInitially = useRef(false);
  const [selected, setSelected] = useState(today);
  const [editing, selectEditing, editingTransition] = useSheetState<true>();
  const setEditing = (open: boolean) => selectEditing(open ? true : null);
  const { data, error, refresh } = useResource(useCallback(async () => ({ habit: await getHabit(Number(id)), logs: await listHabitLogs('1970-01-01', todayLocalDate()) }), [id]));
  const habit = data?.habit;
  const counts = Object.fromEntries((data?.logs ?? []).filter((l) => l.habitId === Number(id)).map((l) => [l.date, l.count]));
  const stats = habit ? habitStats(habit, counts, today) : null;
  const count = counts[selected] ?? 0;
  return <LargeTitleScreen title={habit ? `${habit.icon || '🌱'} ${habit.name}` : 'Habit'} showBack bottomInset="safeArea"
    headerRight={habit ? <GlassButton shape="pill" accessibilityLabel="Edit habit" onPress={() => setEditing(true)}><Text>Edit</Text></GlassButton> : undefined}
    contentContainerStyle={{ gap: theme.spacing.lg }}>
    {error || !data ? <LoadState error={error} retry={refresh} /> : !habit || !stats ? <Text align="center">This habit is no longer available.</Text> : <>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm, paddingHorizontal: theme.sizes.titleInset }}>
        <AnimatedNumber value={stats.current} variant="display" />
        <Text variant="title3" weight="regular" color="secondaryLabel">day streak</Text>
      </View>
      <Card>
        <View style={{ flexDirection: 'row' }}><HeatmapWeekdayLabels />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} ref={history} onContentSizeChange={() => {
            if (!scrolledInitially.current) { history.current?.scrollToEnd({ animated: false }); scrolledInitially.current = true; }
          }}>
            <Heatmap startDate={addDays(startOfWeek(today), -52 * 7)} weeks={53} counts={counts} today={today} dailyGoal={habit.dailyGoal} activeDays={habit.activeDays} outlinedDate={selected} showMonthLabels onSelectDate={setSelected} />
          </ScrollView>
        </View>
        {/* The design omits the Less/More legend (UI analysis R8); the editor sits under a divider. */}
        <View style={{ marginTop: theme.spacing.lg, marginHorizontal: -theme.sizes.cardPadding }}><Separator /></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: theme.spacing.lg }}>
          <View><Text>{formatWeekdayShortDate(selected)}</Text><Text variant="subheadline" color="secondaryLabel">{count === 1 ? '1 time' : `${count} times`}</Text></View>
          <Stepper value={count} min={0} onChange={(value) => { void action(() => tickHabit(habit.id, selected, value > count ? 1 : -1)); }} accessibilityLabel="Ticks on selected day" />
        </View>
      </Card>
      <GroupedList separatorInset={theme.sizes.rowPadding}><ListRow title="Best streak" value={`${stats.best} days`} /><ListRow title="Completion" value={`${stats.completion}%`} /><ListRow title="Total ticks" value={String(stats.total)} /></GroupedList>
      {editing && <HabitSheet {...editingTransition} initial={habit} onClose={() => setEditing(false)} />}
    </>}
  </LargeTitleScreen>;
}
