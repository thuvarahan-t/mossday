import { View } from 'react-native';
import { ShareLine, SharePanel, SHARE_CARD_WIDTH, type ShareCardContent } from '@/components/share/ShareCard';
import { Heatmap } from '@/components/ui/Heatmap';
import { Text } from '@/components/ui/Text';
import type { Theme } from '@/constants/theme';
import { addDays, startOfWeek } from '@/lib/date';
import { habitStats, type Habit, type HabitLog } from '@/lib/repos/habits';

/** Habits tab as an image: each habit with its streak and the last weeks of its heatmap. */
export function habitsShareContent({ theme, habits, logs, today, subtitle }: {
  theme: Theme; habits: Habit[]; logs: HabitLog[]; today: string; subtitle: string;
}): ShareCardContent {
  // Card width minus the card's and the panel's horizontal padding.
  const gridWidth = SHARE_CARD_WIDTH - theme.spacing.xl * 2 - theme.spacing.lg * 2;
  const gap = theme.sizes.heatmapGap;
  const weeks = Math.floor((gridWidth + gap) / (theme.sizes.heatmapSquare + gap));
  const squareSize = Math.floor(((gridWidth - (weeks - 1) * gap) / weeks) * 10) / 10;
  return {
    icon: 'habits',
    title: 'Habits',
    subtitle,
    body: <View style={{ gap: theme.spacing.md }}>
      {habits.map((habit) => {
        const counts = Object.fromEntries(logs.filter((log) => log.habitId === habit.id).map((log) => [log.date, log.count]));
        const streak = habitStats(habit, counts, today).current;
        return <SharePanel key={habit.id}>
          <ShareLine title={habit.name} detail={streak === 1 ? '1-day streak' : `${streak}-day streak`}
            leading={<Text variant="title2">{habit.icon || '🌱'}</Text>}
            value={`${counts[today] ?? 0}/${habit.dailyGoal}`} />
          <Heatmap startDate={addDays(startOfWeek(today), -(weeks - 1) * 7)} weeks={weeks} squareSize={squareSize}
            counts={counts} today={today} dailyGoal={habit.dailyGoal} activeDays={habit.activeDays} />
        </SharePanel>;
      })}
    </View>,
  };
}
