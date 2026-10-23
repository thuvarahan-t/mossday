import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AddButton } from '@/components/navigation/AddButton';
import { ExpenseSheet } from '@/components/expenses/ExpenseSheet';
import { TodoList } from '@/components/diary/TodoList';
import { TodoSheet } from '@/components/diary/TodoSheet';
import { useNewNote } from '@/components/notes/NotesScreen';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GroupedList, ListRow, SectionTitle, Separator } from '@/components/ui/GroupedList';
import { AnimatedListItem } from '@/components/ui/AnimatedListItem';
import { Icon } from '@/components/ui/Icon';
import { LargeTitleScreen } from '@/components/ui/LargeTitleScreen';
import { LoadState } from '@/components/ui/LoadState';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { HabitTickButton } from '@/components/habits/HabitTickButton';
import { Text } from '@/components/ui/Text';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import { BottomSheet } from '@/components/ui/sheet/BottomSheet';
import { SheetHeader, SheetIconButton } from '@/components/ui/sheet/SheetHeader';
import { useAction, useResource } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { useSheetState } from '@/hooks/useSheetState';
import { useToday } from '@/hooks/useToday';
import { formatLongDate } from '@/lib/date';
import { isActiveDay } from '@/lib/heatmap';
import { haptics } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';
import { listTodos } from '@/lib/repos/diary';
import { listCategories, listExpenses } from '@/lib/repos/expenses';
import { listHabitLogs, listHabits, tickHabit } from '@/lib/repos/habits';
import { getSettings } from '@/lib/repos/settings';

export function TodayScreen() {
  const theme = useTheme();
  const action = useAction();
  const newNote = useNewNote();
  const noteAfterDismissal = useRef(false);
  const today = useToday();
  const [sheet, setSheet, sheetTransition] = useSheetState<'quick' | 'expense' | 'todo'>(true);
  const [mealId, setMealId] = useState<number | undefined>();
  const { data, error, refresh } = useResource(useCallback(async () => {
    const [expenses, categories, habits, logs, todos, settings] = await Promise.all([
      listExpenses(today), listCategories(), listHabits(), listHabitLogs(today, today), listTodos(today), getSettings(),
    ]);
    return { expenses, categories, habits, logs, todos, settings };
  }, [today]));
  const spent = data?.expenses.filter((e) => e.date === today).reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const budget = data?.settings.dailyBudget ?? 0;
  const status = budget && spent > budget ? 'dangerText' : budget && spent >= budget * 0.8 ? 'warningText' : 'accent';
  const active = data?.habits.filter((h) => isActiveDay(h.activeDays, today)) ?? [];
  const countFor = (id: number) => data?.logs.find((l) => l.habitId === id)?.count ?? 0;
  const done = active.filter((h) => countFor(h.id) >= h.dailyGoal).length;
  return <LargeTitleScreen title="Today" subtitle={formatLongDate(today)}
    titleAccessory={<View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
      <GlassButton accessibilityLabel="Settings" onPress={() => router.push('/settings')}><Icon name="settings" /></GlassButton>
      <AddButton accessibilityLabel="Quick add" onPress={() => setSheet('quick')} />
    </View>}
    contentContainerStyle={{ gap: theme.spacing.md }}>
    {error || !data ? <LoadState error={error} retry={refresh} /> : <>
      <AnimatedListItem><Card style={{ gap: theme.spacing.md }}>
        <Text color="secondaryLabel">Spent today</Text>
        <AnimatedNumber value={spent} format={formatMoney} color={status === 'dangerText' ? 'dangerText' : 'label'} />
        {budget > 0 && <><ProgressBar progress={spent / budget} color={theme.colors[status === 'accent' ? 'accentBar' : status === 'warningText' ? 'warning' : 'danger']} /><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="subheadline" color={status}>{formatMoney(Math.abs(budget - spent))} {spent > budget ? 'over budget' : 'left'}</Text><Text variant="subheadline" color="secondaryLabel">of {formatMoney(budget)}</Text>
        </View></>}
        <Separator />
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          {data.categories.filter((c) => c.type === 'MEAL').map((category) => {
            const logged = data.expenses.filter((e) => e.date === today && e.categoryId === category.id);
            return <PressableScale key={category.id} accessibilityLabel={`${category.name}, ${logged.length ? 'view expenses' : 'add expense'}`}
              onPress={() => { if (logged.length) router.navigate('/expenses'); else { setMealId(category.id); setSheet('expense'); } }}
              style={{ flex: 1, padding: theme.spacing.sm, borderRadius: theme.radii.lg, backgroundColor: theme.colors.fill, alignItems: 'center' }}>
              <Text variant="footnote" color="secondaryLabel">{category.name}</Text><Text variant="headline" color={logged.length ? 'label' : 'accent'}>{logged.length ? formatMoney(logged.reduce((sum, e) => sum + e.amount, 0)) : '+ Add'}</Text>
            </PressableScale>;
          })}
        </View>
      </Card></AnimatedListItem>
      <SectionTitle title="Habits" trailing={<Text color="secondaryLabel">{done} of {active.length} done</Text>} />
      <AnimatedListItem><Card><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.xl, flexGrow: 1, justifyContent: 'space-around' }}>
        {active.length ? active.map((habit) => <View key={habit.id} style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <HabitTickButton name={habit.name} count={countFor(habit.id)} goal={habit.dailyGoal} emoji={habit.icon || '🌱'} onTick={() => { void action(() => tickHabit(habit.id, today), haptics.tick); }} onUndo={() => { void action(() => tickHabit(habit.id, today, -1)); }} />
          <Text variant="subheadline">{habit.name}</Text>
        </View>) : <Button title="Add your first habit" variant="plain" onPress={() => router.navigate('/habits')} />}
      </ScrollView></Card></AnimatedListItem>
      <SectionTitle title="To-dos" trailing={<Button title="See All" variant="plain" size="small" onPress={() => router.navigate('/diary')} />} />
      {data.todos.length ? <TodoList todos={data.todos.slice(0, 5)} /> : <Card><Button title="Nothing planned · Add to-do" variant="plain" onPress={() => setSheet('todo')} /></Card>}
    </>}
    <BottomSheet {...sheetTransition} onDismissed={() => {
      sheetTransition.onDismissed();
      if (noteAfterDismissal.current) { noteAfterDismissal.current = false; newNote(); }
    }} visible={sheet === 'quick' && sheetTransition.visible} onClose={() => setSheet(null)} detents={['content']} background="grouped">
      <SheetHeader title="Add" trailing={<SheetIconButton icon="close" accessibilityLabel="Close" onPress={() => setSheet(null)} />} />
      <GroupedList><ListRow title="Expense" subtitle="A meal or anything you paid for" icon={{ icon: 'wallet', color: 'orange' }} accessory="chevron" onPress={() => { setMealId(undefined); setSheet('expense'); }} />
        <ListRow title="To-do" subtitle="Adds to today in your diary" icon={{ icon: 'todo', color: 'indigo' }} accessory="chevron" onPress={() => setSheet('todo')} />
        <ListRow title="Note" subtitle="Text, photos or a voice memo" icon={{ icon: 'note', color: 'yellow' }} accessory="chevron" onPress={() => { noteAfterDismissal.current = true; setSheet(null); }} /></GroupedList>
    </BottomSheet>
    {sheet === 'expense' && <ExpenseSheet {...sheetTransition} mealId={mealId} onClose={() => setSheet(null)} />}
    {sheet === 'todo' && <TodoSheet {...sheetTransition} date={today} onClose={() => setSheet(null)} />}
  </LargeTitleScreen>;
}
