import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Card } from '@/components/ui/Card';
import { GroupedList, ListRow, Separator } from '@/components/ui/GroupedList';
import { LargeTitleScreen } from '@/components/ui/LargeTitleScreen';
import { LoadState } from '@/components/ui/LoadState';
import { Stepper } from '@/components/ui/Stepper';
import { Text } from '@/components/ui/Text';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import { useAction, useResource } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { useToday } from '@/hooks/useToday';
import { useSheetState } from '@/hooks/useSheetState';
import { formatWeekdayShortDate, todayLocalDate } from '@/lib/date';
import { getHabit, habitStats, listHabitLogs, tickHabit } from '@/lib/repos/habits';
import { HabitSheet } from './HabitSheet';
import { dataColors } from '@/lib/dataColors';
import { HabitPeriodControls } from './HabitPeriodControls';
import { HabitTracker } from './HabitTracker';
import { safeHabitDate, type HabitTrackerMode } from './habitPeriod';

export function HabitDetailScreen() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const theme = useTheme();
  const action = useAction();
  const today = useToday();
  const [selected, setSelected] = useState(() => safeHabitDate(date, today));
  const [mode, setMode] = useState<HabitTrackerMode>('Month');
  const [anchor, setAnchor] = useState(() => safeHabitDate(date, today));
  const [editing, selectEditing, editingTransition] = useSheetState<true>();
  const setEditing = (open: boolean) => selectEditing(open ? true : null);
  const { data, error, refresh } = useResource(useCallback(async () => ({ habit: await getHabit(Number(id)), logs: await listHabitLogs('1970-01-01', todayLocalDate()) }), [id]));
  const habit = data?.habit;
  const palette = dataColors(theme, habit?.color ?? 'green');
  const counts = Object.fromEntries((data?.logs ?? []).filter((l) => l.habitId === Number(id)).map((l) => [l.date, l.count]));
  const stats = habit ? habitStats(habit, counts, today) : null;
  const count = counts[selected] ?? 0;
  return <LargeTitleScreen title={habit ? `${habit.icon || '🌱'} ${habit.name}` : 'Habit'} showBack bottomInset="safeArea"
    headerRight={habit ? <GlassButton shape="pill" accessibilityLabel="Edit habit" onPress={() => setEditing(true)}><Text>Edit</Text></GlassButton> : undefined}
    contentContainerStyle={{ gap: theme.spacing.lg }}>
    <HabitPeriodControls mode={mode} anchor={anchor} today={today} onModeChange={setMode} onAnchorChange={(next) => { setAnchor(next); setSelected(next); }} />
    {error || !data ? <LoadState error={error} retry={refresh} /> : !habit || !stats ? <Text align="center">This habit is no longer available.</Text> : <>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm, paddingHorizontal: theme.sizes.titleInset }}>
        <AnimatedNumber value={stats.current} variant="display" rawColor={palette.accent} />
        <Text variant="title3" weight="regular" color="secondaryLabel">day streak</Text>
      </View>
      <Card style={{ backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border }}>
        <HabitTracker habit={habit} counts={counts} mode={mode} anchor={anchor} today={today} selected={selected} onSelectDate={setSelected} />
        {/* Selecting a historical date never changes the quick-tick date on the main cards. */}
        <View style={{ marginTop: theme.spacing.lg, marginHorizontal: -theme.sizes.cardPadding }}><Separator /></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: theme.spacing.lg }}>
          <View><Text>{formatWeekdayShortDate(selected)}</Text><Text variant="subheadline" color="secondaryLabel">{count}/{habit.dailyGoal} completed</Text></View>
          <Stepper value={count} rawColor={palette.accent} min={0} max={Math.max(count, habit.dailyGoal)} onChange={(value) => { void action(() => tickHabit(habit.id, selected, value > count ? 1 : -1)); }} accessibilityLabel="Ticks on selected day" />
        </View>
      </Card>
      <GroupedList separatorInset={theme.sizes.rowPadding}><ListRow title="Best streak" value={`${stats.best} days`} /><ListRow title="Completion" value={`${stats.completion}%`} /><ListRow title="Total ticks" value={String(stats.total)} /></GroupedList>
      {editing && <HabitSheet {...editingTransition} initial={habit} onClose={() => setEditing(false)} />}
    </>}
  </LargeTitleScreen>;
}
