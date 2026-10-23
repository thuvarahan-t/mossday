import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFabAction } from '@/components/navigation/FabAction';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { LargeTitleScreen } from '@/components/ui/LargeTitleScreen';
import { LoadState } from '@/components/ui/LoadState';
import { MonthGrid } from '@/components/ui/MonthGrid';
import { Text } from '@/components/ui/Text';
import { WeekStrip } from '@/components/ui/WeekStrip';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import { useAction, useResource } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { useSheetState } from '@/hooks/useSheetState';
import { addDays, addMonths, dayOfMonth, endOfMonth, formatLongDate, monthName, startOfMonth, startOfWeek, todayLocalDate, weekdayName } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { getJournal, listTodos, moveIncomplete } from '@/lib/repos/diary';
import { listExpenses } from '@/lib/repos/expenses';
import { listHabitLogs, listHabits } from '@/lib/repos/habits';
import { isActiveDay } from '@/lib/heatmap';
import { JournalEditor } from './JournalEditor';
import { TodoList } from './TodoList';
import { TodoSheet } from './TodoSheet';

export function DiaryScreen() {
  const theme = useTheme();
  const action = useAction();
  const today = todayLocalDate();
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(startOfMonth(today));
  const [calendar, setCalendar] = useState(false);
  const [adding, selectAdding, addingTransition] = useSheetState<true>();
  const setAdding = useCallback((open: boolean) => selectAdding(open ? true : null), [selectAdding]);
  useFabAction(useCallback(() => setAdding(true), [setAdding]));
  const { data, error, refresh } = useResource(useCallback(async () => {
    const [todos, previous, journal, expenses, habits, logs, monthlyTodos, monthlyExpenses] = await Promise.all([
      listTodos(date), listTodos(addDays(date, -1)), getJournal(date), listExpenses(date), listHabits(), listHabitLogs(date, date),
      listTodos(startOfMonth(month), endOfMonth(month)), listExpenses(startOfMonth(month), endOfMonth(month)),
    ]);
    return { todos, previous: previous.filter((t) => !t.isDone), journal, expenses, habits, logs, monthlyTodos, monthlyExpenses };
  }, [date, month]));
  const spend = data?.expenses.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const active = data?.habits.filter((h) => isActiveDay(h.activeDays, date)) ?? [];
  const done = active.filter((h) => (data?.logs.find((l) => l.habitId === h.id)?.count ?? 0) >= h.dailyGoal).length;
  const monthlyAmounts = (data?.monthlyExpenses ?? []).reduce<Record<string, number>>((result, e) => { result[e.date] = (result[e.date] ?? 0) + e.amount; return result; }, {});
  const maxSpend = Math.max(1, ...Object.values(monthlyAmounts));
  return <LargeTitleScreen title={calendar ? `${monthName(month)} ${month.slice(0, 4)}` : `${dayOfMonth(date)} ${monthName(date)}`}
    subtitle={calendar ? 'Choose a day' : `${weekdayName(date)}, ${date.slice(0, 4)}`}
    titleAccessory={<GlassButton accessibilityLabel={calendar ? 'Return to diary' : 'Open calendar'} onPress={() => { setMonth(startOfMonth(date)); setCalendar(!calendar); }}><Icon name={calendar ? 'chevronLeft' : 'calendar'} /></GlassButton>}
    contentContainerStyle={{ gap: theme.spacing.lg }}>
    {error || !data ? <LoadState error={error} retry={refresh} /> : calendar ? <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}><Button title="‹ Previous" variant="plain" onPress={() => setMonth(addMonths(month, -1))} /><Button title="Next ›" variant="plain" onPress={() => setMonth(addMonths(month, 1))} /></View>
      <Card><MonthGrid month={month} today={today} selected={date} onSelect={setDate}
        spendLevels={Object.fromEntries(Object.entries(monthlyAmounts).map(([day, amount]) => [day, Math.ceil(amount / maxSpend * 4)]))}
        todoDates={new Set(data.monthlyTodos.map((t) => t.date))} /></Card>
      <Card><Text>{formatLongDate(date)}</Text><Text color="secondaryLabel">{formatMoney(spend)} · {data.todos.filter((t) => !t.isDone).length} to-dos left</Text>
        <Button title="Open diary page" variant="plain" onPress={() => setCalendar(false)} /></Card>
    </> : <>
      <WeekStrip weekStart={startOfWeek(date)} today={today} selected={date} markedDates={new Set(data.monthlyTodos.map((t) => t.date))} onSelect={setDate} onChangeWeek={(delta) => setDate(addDays(date, delta * 7))} />
      {data.previous.length > 0 && <Card padding="row"><Text color="secondaryLabel">{data.previous.length} left from yesterday</Text><Button title="Move to this day" variant="plain" onPress={() => { void action(() => moveIncomplete(addDays(date, -1), date)); }} /></Card>}
      {data.todos.length ? <TodoList todos={data.todos} reorder /> : <Card><Text color="secondaryLabel">Nothing planned.</Text><Button title="Add to-do" variant="plain" onPress={() => setAdding(true)} /></Card>}
      <JournalEditor key={date} date={date} initial={data.journal} />
      <Text align="center" variant="subheadline" color="secondaryLabel">Spent {formatMoney(spend)} · {done} of {active.length} habits done</Text>
    </>}
    {adding && <TodoSheet {...addingTransition} date={date} onClose={() => setAdding(false)} />}
  </LargeTitleScreen>;
}
