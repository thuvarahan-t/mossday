import { View } from 'react-native';
import { BudgetMeter } from '@/components/expenses/BudgetMeter';
import { ShareCheck } from '@/components/share/ShareCheck';
import { ShareLine, SharePanel, type ShareCardContent } from '@/components/share/ShareCard';
import { Text } from '@/components/ui/Text';
import type { Theme } from '@/constants/theme';
import { formatLongDate } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import type { Todo } from '@/lib/repos/diary';
import type { Category, Expense } from '@/lib/repos/expenses';
import type { Habit } from '@/lib/repos/habits';

/** Today tab as an image: money spent against the budget, meals, habit progress and to-dos. */
export function todayShareContent({ theme, today, spent, budget, meals, expenses, habits, countFor, todos }: {
  theme: Theme; today: string; spent: number; budget: number; meals: Category[]; expenses: Expense[];
  habits: Habit[]; countFor: (id: number) => number; todos: Todo[];
}): ShareCardContent {
  const done = habits.filter((habit) => countFor(habit.id) >= habit.dailyGoal).length;
  return {
    icon: 'home',
    title: 'Today',
    subtitle: formatLongDate(today),
    body: <View style={{ gap: theme.spacing.md }}>
      <SharePanel>
        <Text color="secondaryLabel">Spent today</Text>
        <Text variant="hero" tabular>{formatMoney(spent)}</Text>
        {budget > 0 && <BudgetMeter spent={spent} budget={budget} animated={false} />}
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {meals.map((meal) => {
            const amount = expenses.filter((e) => e.categoryId === meal.id).reduce((total, e) => total + e.amount, 0);
            return <View key={meal.id} style={{ flex: 1, alignItems: 'center', padding: theme.spacing.sm, borderRadius: theme.radii.lg, backgroundColor: theme.colors.fill }}>
              <Text variant="footnote" color="secondaryLabel">{meal.name}</Text>
              <Text variant="headline" color={amount ? 'label' : 'tertiaryLabel'}>{amount ? formatMoney(amount) : '—'}</Text>
            </View>;
          })}
        </View>
      </SharePanel>
      {habits.length > 0 && <SharePanel>
        <Text variant="headline">Habits · {done} of {habits.length} done</Text>
        {habits.map((habit) => <ShareLine key={habit.id} title={habit.name} leading={<Text variant="title3">{habit.icon || '🌱'}</Text>}
          value={countFor(habit.id) >= habit.dailyGoal ? 'Done' : `${countFor(habit.id)}/${habit.dailyGoal}`} />)}
      </SharePanel>}
      {todos.length > 0 && <SharePanel>
        <Text variant="headline">To-dos</Text>
        {todos.map((todo) => <ShareLine key={todo.id} title={todo.text} muted={!!todo.isDone} value={todo.time ?? undefined} leading={<ShareCheck done={!!todo.isDone} />} />)}
      </SharePanel>}
    </View>,
  };
}
