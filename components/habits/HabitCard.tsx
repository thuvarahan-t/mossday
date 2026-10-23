import { router } from 'expo-router';
import { memo } from 'react';
import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { ContextMenu } from '@/components/ui/ContextMenu';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useAction } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { useToday } from '@/hooks/useToday';
import { archiveHabit, deleteHabit, habitStats, restoreHabit, tickHabit, type Habit } from '@/lib/repos/habits';
import { haptics } from '@/lib/haptics';
import { dataColors } from '@/lib/dataColors';
import { HabitTickButton } from './HabitTickButton';
import { HabitTracker } from './HabitTracker';
import type { HabitTrackerMode } from './habitPeriod';

export const HabitCard = memo(function HabitCard({ habit, counts, onEdit, mode, anchor }: { habit: Habit; counts: Record<string, number>; onEdit: () => void; mode: HabitTrackerMode; anchor: string }) {
  const theme = useTheme();
  const palette = dataColors(theme, habit.color);
  const action = useAction();
  const toast = useToast();
  const today = useToday();
  const count = counts[today] ?? 0;
  const stats = habitStats(habit, counts, today);
  return <Card padding="row" style={{ backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingBottom: theme.spacing.lg }}>
    <ContextMenu style={{ flex: 1 }} accessibilityLabel={habit.name} onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })} actions={[
      { label: 'Edit', icon: 'edit', onPress: onEdit },
      { label: 'Archive', icon: 'archive', onPress: () => { void action(() => archiveHabit(habit.id), () => toast({ message: 'Habit archived', actionLabel: 'Undo', onAction: () => { void action(() => archiveHabit(habit.id, false)); } })); } },
      { label: 'Delete', icon: 'trash', destructive: true, onPress: () => { void action(async () => {
        const snapshot = await deleteHabit(habit.id);
        toast({ message: 'Habit deleted', actionLabel: 'Undo', onAction: () => { void action(() => restoreHabit(snapshot)); } });
      }); } },
    ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <View style={{ padding: theme.spacing.sm, borderRadius: theme.radii.lg, backgroundColor: palette.tint }}><Text variant="title2">{habit.icon || '🌱'}</Text></View>
        <View style={{ flex: 1 }}><Text variant="title3" numberOfLines={2} style={{ color: palette.accent }}>{habit.name}</Text><AnimatedNumber value={stats.current} format={(value) => `${value}-day streak`} variant="footnote" rawColor={palette.accent} /></View>
      </View>
    </ContextMenu>
    <View style={{ alignItems: 'center' }}><Text variant="caption2" color="secondaryLabel">Today</Text>
    <HabitTickButton name={habit.name} count={count} goal={habit.dailyGoal} color={habit.color}
      onTick={() => { void action(() => tickHabit(habit.id, today), haptics.tick); }} onUndo={() => { void action(() => tickHabit(habit.id, today, -1)); }} />
    </View>
    </View>
    <HabitTracker habit={habit} counts={counts} today={today} mode={mode} anchor={anchor}
      onSelectDate={(date) => router.push({ pathname: '/habit/[id]', params: { id: habit.id, date } })} />
  </Card>;
});
