import { router } from 'expo-router';
import { memo, useState } from 'react';
import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { ContextMenu } from '@/components/ui/ContextMenu';
import { Heatmap } from '@/components/ui/Heatmap';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useAction } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { useToday } from '@/hooks/useToday';
import { addDays, startOfWeek } from '@/lib/date';
import { archiveHabit, deleteHabit, habitStats, restoreHabit, tickHabit, type Habit } from '@/lib/repos/habits';
import { haptics } from '@/lib/haptics';
import { HabitTickButton } from './HabitTickButton';

export const HabitCard = memo(function HabitCard({ habit, counts, onEdit }: { habit: Habit; counts: Record<string, number>; onEdit: () => void }) {
  const theme = useTheme();
  const action = useAction();
  const toast = useToast();
  const today = useToday();
  const count = counts[today] ?? 0;
  const [width, setWidth] = useState(0);
  const weeks = Math.max(1, Math.floor((width + theme.sizes.heatmapGap) / (theme.sizes.heatmapSquare + theme.sizes.heatmapGap)));
  const stats = habitStats(habit, counts, today);
  return <Card padding="row">
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
        <Text variant="largeTitle">{habit.icon || '🌱'}</Text>
        <View style={{ flex: 1 }}><Text variant="title3">{habit.name}</Text><AnimatedNumber value={stats.current} format={(value) => `${value}-day streak`} variant="body" color="secondaryLabel" /></View>
      </View>
    </ContextMenu>
    <HabitTickButton name={habit.name} count={count} goal={habit.dailyGoal}
      onTick={() => { void action(() => tickHabit(habit.id, today), haptics.tick); }} onUndo={() => { void action(() => tickHabit(habit.id, today, -1)); }} />
    </View>
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && <Heatmap startDate={addDays(startOfWeek(today), -(weeks - 1) * 7)} weeks={weeks} counts={counts} today={today} dailyGoal={habit.dailyGoal} activeDays={habit.activeDays} outlinedDate={today} />}
    </View>
  </Card>;
});
