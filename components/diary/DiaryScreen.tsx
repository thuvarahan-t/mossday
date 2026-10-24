import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { TabHeaderActions } from '@/components/navigation/HeaderActions';
import { useShareImage } from '@/components/share/ShareImage';
import { Button } from '@/components/ui/Button';
import { LargeTitleScreen } from '@/components/ui/LargeTitleScreen';
import { LoadState } from '@/components/ui/LoadState';
import { Text } from '@/components/ui/Text';
import { useAction, useResource } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { useCurrency } from '@/hooks/useCurrency';
import { useSheetState } from '@/hooks/useSheetState';
import { useToday } from '@/hooks/useToday';
import { addDays, dayOfMonth, endOfMonth, monthName, startOfMonth, weekdayName } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { getJournal, listMoods, listTodos, moveIncomplete } from '@/lib/repos/diary';
import { listExpenses } from '@/lib/repos/expenses';
import { listHabitLogs, listHabits } from '@/lib/repos/habits';
import { isActiveDay } from '@/lib/heatmap';
import { DiaryDateBar } from './DiaryDateBar';
import { diaryShareContent } from './diaryShare';
import { JournalEditor } from './JournalEditor';
import { TodoList } from './TodoList';
import { TodoSheet } from './TodoSheet';

/** Days either side of the selected one whose to-dos mark the free-scrolling date strip. */
const MARKED_RANGE = 42;

export function DiaryScreen() {
  const theme = useTheme();
  useCurrency();
  const action = useAction();
  const today = useToday();
  const [date, setDate] = useState(today);
  const [dragging, setDragging] = useState(false);
  const [month, setMonth] = useState(startOfMonth(today));
  const [adding, selectAdding, addingTransition] = useSheetState<true>();
  const setAdding = useCallback((open: boolean) => selectAdding(open ? true : null), [selectAdding]);
  const { data, error, refresh } = useResource(useCallback(async () => {
    const [todos, previous, journal, expenses, habits, logs, monthlyTodos, monthlyMoods, nearbyTodos] = await Promise.all([
      listTodos(date), listTodos(addDays(date, -1)), getJournal(date), listExpenses(date), listHabits(), listHabitLogs(date, date),
      listTodos(startOfMonth(month), endOfMonth(month)), listMoods(startOfMonth(month), endOfMonth(month)),
      listTodos(addDays(date, -MARKED_RANGE), addDays(date, MARKED_RANGE)),
    ]);
    return { todos, previous: previous.filter((t) => !t.isDone), journal, expenses, habits, logs, monthlyTodos, moods: Object.fromEntries(monthlyMoods.map((row) => [row.date, row.mood])), nearbyTodos };
  }, [date, month]));
  const spend = data?.expenses.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const active = data?.habits.filter((h) => isActiveDay(h.activeDays, date)) ?? [];
  const done = active.filter((h) => (data?.logs.find((l) => l.habitId === h.id)?.count ?? 0) >= h.dailyGoal).length;
  const summary = `Spent ${formatMoney(spend)} · ${done} of ${active.length} habits done`;
  const shareImage = useShareImage();
  const shareDay = () => {
    if (data) void shareImage(diaryShareContent({ theme, date, todos: data.todos, journal: data.journal, summary }));
  };
  return <LargeTitleScreen title={`${dayOfMonth(date)} ${monthName(date)}`} subtitle={`${weekdayName(date)}, ${date.slice(0, 4)}`}
    titleAccessory={<TabHeaderActions shareLabel="Share this day" onShare={shareDay} addLabel="Add to-do" onAdd={() => setAdding(true)} />}
    scrollEnabled={!dragging} contentContainerStyle={{ gap: theme.spacing.lg }}>
    {error || !data ? <LoadState error={error} retry={refresh} /> : <>
      <DiaryDateBar today={today} selected={date} month={month} markedDates={new Set(data.nearbyTodos.map((t) => t.date))}
        moods={data.moods} monthlyTodos={data.monthlyTodos} onSelect={setDate} onMonthChange={setMonth} onDraggingChange={setDragging} />
      <TodoList todos={data.todos} onDraggingChange={setDragging} onAdd={() => setAdding(true)} header={data.previous.length > 0 &&
        <View key="carry-over" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: theme.sizes.rowMinHeight, paddingHorizontal: theme.sizes.rowPadding }}>
          <Text variant="subheadline" color="secondaryLabel">{data.previous.length} left from {date === today ? 'yesterday' : 'the day before'}</Text>
          <Button title={date === today ? 'Move to Today' : 'Move here'} variant="plain" size="small" onPress={() => { void action(() => moveIncomplete(addDays(date, -1), date)); }} />
        </View>} />
      <JournalEditor key={date} date={date} initial={data.journal} />
      <Text align="center" variant="subheadline" color="secondaryLabel">{summary}</Text>
    </>}
    {adding && <TodoSheet {...addingTransition} date={date} onClose={() => setAdding(false)} />}
  </LargeTitleScreen>;
}
