import { TabHeaderActions } from '@/components/navigation/HeaderActions';
import { useShareImage } from '@/components/share/ShareImage';
import { EmptyState } from '@/components/ui/EmptyState';
import { AnimatedListItem } from '@/components/ui/AnimatedListItem';
import { useToday } from '@/hooks/useToday';
import { LargeTitleScreen } from '@/components/ui/LargeTitleScreen';
import { LoadState } from '@/components/ui/LoadState';
import { useResource } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { useSheetState } from '@/hooks/useSheetState';
import { todayLocalDate } from '@/lib/date';
import { listHabitLogs, listHabits, type Habit } from '@/lib/repos/habits';
import { isActiveDay } from '@/lib/heatmap';
import { HabitCard } from './HabitCard';
import { habitsShareContent } from './habitsShare';
import { HabitSheet } from './HabitSheet';

export async function loadHabitData() {
  const [habits, logs] = await Promise.all([listHabits(), listHabitLogs('1970-01-01', todayLocalDate())]);
  return { habits, logs };
}
export function HabitsScreen() {
  const theme = useTheme();
  const today = useToday();
  const [editor, setEditor, editorTransition] = useSheetState<Habit | 'new'>();
  const { data, error, refresh } = useResource(loadHabitData);
  const active = data?.habits.filter((habit) => isActiveDay(habit.activeDays, today)) ?? [];
  const done = active.filter((habit) => (data?.logs.find((l) => l.habitId === habit.id && l.date === today)?.count ?? 0) >= habit.dailyGoal).length;
  const subtitle = active.length ? `${done} of ${active.length} done today` : 'Small daily wins';
  const shareImage = useShareImage();
  const shareHabits = () => {
    if (data) void shareImage(habitsShareContent({ theme, habits: data.habits, logs: data.logs, today, subtitle }));
  };
  return <LargeTitleScreen title="Habits" titleAccessory={<TabHeaderActions shareLabel="Share habits" onShare={shareHabits} addLabel="New habit" onAdd={() => setEditor('new')} />} subtitle={subtitle} contentContainerStyle={{ gap: theme.spacing.md }}>
    {error || !data ? <LoadState error={error} retry={refresh} /> : !data.habits.length ?
      <EmptyState icon="habits" title="No habits yet" message="Start with one small thing, like 8 glasses of water." action={{ label: 'New Habit', onPress: () => setEditor('new') }} /> :
      data.habits.map((habit) => <AnimatedListItem key={habit.id}><HabitCard habit={habit} counts={Object.fromEntries(data.logs.filter((log) => log.habitId === habit.id).map((l) => [l.date, l.count]))} onEdit={() => setEditor(habit)} /></AnimatedListItem>)}
    {editor && <HabitSheet {...editorTransition} initial={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} />}
  </LargeTitleScreen>;
}
