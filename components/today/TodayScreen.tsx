import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { TabHeaderActions } from '@/components/navigation/HeaderActions';
import { useShareImage } from '@/components/share/ShareImage';
import { BudgetMeter } from '@/components/expenses/BudgetMeter';
import { ExpenseSheet, preloadCategories } from '@/components/expenses/ExpenseSheet';
import { TodoList } from '@/components/diary/TodoList';
import { TodoSheet } from '@/components/diary/TodoSheet';
import { useNewNote } from '@/components/notes/NotesScreen';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GroupedList, ListRow, SectionTitle, Separator } from '@/components/ui/GroupedList';
import { AnimatedListItem } from '@/components/ui/AnimatedListItem';
import { LargeTitleScreen } from '@/components/ui/LargeTitleScreen';
import { LoadState } from '@/components/ui/LoadState';
import { PressableScale } from '@/components/ui/PressableScale';
import { HabitTickButton } from '@/components/habits/HabitTickButton';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { BottomSheet } from '@/components/ui/sheet/BottomSheet';
import { SheetHeader, SheetIconButton } from '@/components/ui/sheet/SheetHeader';
import { useAction, useResource } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { useCurrency } from '@/hooks/useCurrency';
import { useSheetState } from '@/hooks/useSheetState';
import { useToday } from '@/hooks/useToday';
import { formatLongDate } from '@/lib/date';
import { todayShareContent } from './todayShare';
import { isActiveDay } from '@/lib/heatmap';
import { haptics } from '@/lib/haptics';
import { formatMoney } from '@/lib/money';
import { dataColors } from '@/lib/dataColors';
import { listTodos } from '@/lib/repos/diary';
import { listCategories, listExpenses } from '@/lib/repos/expenses';
import { listHabitLogs, listHabits, tickHabit } from '@/lib/repos/habits';
import { getSettings } from '@/lib/repos/settings';

export function TodayScreen() {
  const theme = useTheme();
  useCurrency();
  const action = useAction();
  const newNote = useNewNote();
  const noteAfterDismissal = useRef(false);
  const today = useToday();
  const [sheet, setSheet, sheetTransition] = useSheetState<'quick' | 'expense' | 'todo'>(true);
  const [mealId, setMealId] = useState<number | undefined>();
  useEffect(preloadCategories, []);
  const { data, error, refresh } = useResource(useCallback(async () => {
    const [expenses, categories, habits, logs, todos, settings] = await Promise.all([
      listExpenses(today), listCategories(), listHabits(), listHabitLogs(today, today), listTodos(today), getSettings(),
    ]);
    return { expenses, categories, habits, logs, todos, settings };
  }, [today]));
  const spent = data?.expenses.filter((e) => e.date === today).reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const budget = data?.settings.dailyBudget ?? 0;
  const active = data?.habits.filter((h) => isActiveDay(h.activeDays, today)) ?? [];
  const countFor = (id: number) => data?.logs.find((l) => l.habitId === id)?.count ?? 0;
  const done = active.filter((h) => countFor(h.id) >= h.dailyGoal).length;
  const sectionIconButton = { width: theme.sizes.touchTarget, height: theme.sizes.touchTarget, alignItems: 'center', justifyContent: 'center' } as const;
  const shareImage = useShareImage();
  const shareToday = () => {
    if (!data) return;
    void shareImage(todayShareContent({
      theme, today, spent, budget, meals: data.categories.filter((c) => c.type === 'MEAL'),
      expenses: data.expenses.filter((e) => e.date === today), habits: active, countFor, todos: data.todos,
    }));
  };
  return <LargeTitleScreen title="Today" subtitle={formatLongDate(today)}
    titleAccessory={<TabHeaderActions shareLabel="Share today" onShare={shareToday} addLabel="Quick add" onAdd={() => setSheet('quick')} />}
    contentContainerStyle={{ gap: theme.spacing.md }}>
    {error || !data ? <LoadState error={error} retry={refresh} /> : <>
      <AnimatedListItem><Card style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <PressableScale accessibilityLabel="View today's expenses" haptic="tap" onPress={() => router.navigate('/expenses')} style={{ flex: 1, gap: theme.spacing.sm }}>
            <Text color="secondaryLabel">Spent today</Text>
            <AnimatedNumber value={spent} format={formatMoney} color={budget && spent > budget ? 'dangerText' : 'label'} />
          </PressableScale>
          {/* A sibling, not a child, of the summary so both stay separate accessible buttons. */}
          <PressableScale accessibilityLabel="Add expense" haptic="tap" onPress={() => { setMealId(undefined); setSheet('expense'); }}
            style={{ width: theme.sizes.touchTarget, height: theme.sizes.touchTarget, borderRadius: theme.sizes.touchTarget / 2,
              alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentFill }}>
            <Icon name="plus" color="accent" strokeWidth={2.6} />
          </PressableScale>
        </View>
        {budget > 0 && <PressableScale accessibilityLabel="Daily budget, view today's expenses" haptic="tap" onPress={() => router.navigate('/expenses')}>
          <BudgetMeter spent={spent} budget={budget} />
        </PressableScale>}
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
      <SectionTitle title="Habits" onPress={() => router.navigate('/habits')} trailing={<Text color="secondaryLabel">{done} of {active.length} done</Text>} />
      {/* The scroll view clips its content, so padding gives a completed ring room to pop. */}
      <AnimatedListItem><Card><ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: -theme.spacing.sm }}
        contentContainerStyle={{ gap: theme.spacing.xl, flexGrow: 1, justifyContent: 'space-around', paddingVertical: theme.spacing.sm }}>
        {active.length ? active.map((habit) => <View key={habit.id} style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <HabitTickButton name={habit.name} color={habit.color} count={countFor(habit.id)} goal={habit.dailyGoal} emoji={habit.icon || '🌱'} onTick={() => { void action(() => tickHabit(habit.id, today), haptics.tick); }} onUndo={() => { void action(() => tickHabit(habit.id, today, -1)); }} />
          <Text variant="subheadline" style={{ color: dataColors(theme, habit.color).accent }}>{habit.name}</Text>
        </View>) : <Button title="Add your first habit" variant="plain" onPress={() => router.navigate('/habits')} />}
      </ScrollView></Card></AnimatedListItem>
      <SectionTitle title="To-dos" onPress={() => router.navigate('/diary')} trailing={<View style={{ flexDirection: 'row' }}>
        <PressableScale accessibilityLabel="Add to-do" haptic="tap" onPress={() => setSheet('todo')} style={sectionIconButton}>
          <Icon name="plus" color="accent" strokeWidth={2.6} />
        </PressableScale>
        <PressableScale accessibilityLabel="See all to-dos" haptic="tap" onPress={() => router.navigate('/diary')} style={sectionIconButton}>
          <Icon name="chevronRight" color="secondaryLabel" />
        </PressableScale>
      </View>} />
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
