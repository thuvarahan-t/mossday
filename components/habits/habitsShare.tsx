import { View } from 'react-native';
import { ShareLine, SharePanel, SHARE_CARD_WIDTH, type ShareContent } from '@/components/share/ShareCard';
import { joinSections } from '@/components/share/shareText';
import { Emoji } from '@/components/ui/Emoji';
import type { Theme } from '@/constants/theme';
import { HabitTracker } from './HabitTracker';
import { habitStats, type Habit, type HabitLog } from '@/lib/repos/habits';
import { dataColors } from '@/lib/dataColors';

/** Share the selected year using each habit's own colour. */
export function habitsShareContent({ theme, habits, logs, today, subtitle, anchor }: {
  theme: Theme; habits: Habit[]; logs: HabitLog[]; today: string; subtitle: string; anchor: string;
}): ShareContent {
  // Card width minus the card's and the panel's horizontal padding.
  const gridWidth = SHARE_CARD_WIDTH - theme.spacing.xl * 2 - theme.spacing.lg * 2;
  return {
    icon: 'habits',
    title: 'Habits',
    subtitle,
    text: joinSections(`Habits · ${subtitle}`, habits.map((habit) => {
      const counts = Object.fromEntries(logs.filter((log) => log.habitId === habit.id).map((log) => [log.date, log.count]));
      const streak = habitStats(habit, counts, today).current;
      return `${habit.name}: ${counts[today] ?? 0}/${habit.dailyGoal} today, ${streak === 1 ? '1-day streak' : `${streak}-day streak`}`;
    }).join('\n')),
    body: <View style={{ gap: theme.spacing.md }}>
      {habits.map((habit) => {
        const counts = Object.fromEntries(logs.filter((log) => log.habitId === habit.id).map((log) => [log.date, log.count]));
        const streak = habitStats(habit, counts, today).current;
        return <SharePanel key={habit.id}>
          <ShareLine title={habit.name} detail={streak === 1 ? '1-day streak' : `${streak}-day streak`}
            leading={<View style={{ padding: theme.spacing.sm, borderRadius: theme.radii.lg, backgroundColor: dataColors(theme, habit.color).tint }}><Emoji emoji={habit.icon || '🌱'} size={26} /></View>}
            value={`${counts[today] ?? 0}/${habit.dailyGoal}`} />
          <HabitTracker habit={habit} counts={counts} today={today} anchor={anchor} fitWidth={gridWidth} />
        </SharePanel>;
      })}
    </View>,
  };
}
