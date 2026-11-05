import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { TabHeaderActions } from '@/components/navigation/HeaderActions';
import { TabSwipeArea } from '@/components/navigation/TabSwipeArea';
import { useShareImage } from '@/components/share/ShareProvider';
import { Button } from '@/components/ui/Button';
import { LargeTitleScreen } from '@/components/ui/LargeTitleScreen';
import { LoadState } from '@/components/ui/LoadState';
import { Text } from '@/components/ui/Text';
import { useAction, useResource } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { useCurrency } from '@/hooks/useCurrency';
import { useToday } from '@/hooks/useToday';
import { addDays, dayOfMonth, endOfMonth, monthName, startOfMonth, weekdayName } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { getJournal, listMoods, listTodos, moveIncomplete } from '@/lib/repos/diary';
import { listDailyExpenses } from '@/lib/repos/expenses';
import { listHabitLogs, listHabits } from '@/lib/repos/habits';
import { isActiveDay } from '@/lib/heatmap';
import { DiaryDateBar } from './DiaryDateBar';
import { diaryShareContent } from './diaryShare';
import { JournalEditor } from './JournalEditor';
import { TodoList } from './TodoList';

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
  const [addRequest, setAddRequest] = useState(0);
  const addInline = () => setAddRequest((request) => request + 1);
  const { data, error, refresh } = useResource(useCallback(async () => {
    const [todos, previous, journal, expenses, habits, logs, monthlyTodos, monthlyMoods, nearbyTodos] = await Promise.all([
      listTodos(date), listTodos(addDays(date, -1)), getJournal(date), listDailyExpenses(date), listHabits(), listHabitLogs(date, date),
      listTodos(startOfMonth(month), endOfMonth(month)), listMoods(startOfMonth(month), endOfMonth(month)),
      listTodos(addDays(date, -MARKED_RANGE), addDays(date, MARKED_RANGE)),
    ]);
    return { date, todos, previous: previous.filter((t) => !t.isDone), journal, expenses, habits, logs, monthlyTodos, moods: Object.fromEntries(monthlyMoods.map((row) => [row.date, row.mood])), nearbyTodos };
  }, [date, month]));
  // The title follows a tap at once; everything below belongs to the day it was loaded for,
  // so a slower load can never show (or save into) another day's to-dos and journal.
  const loadedDate = data?.date ?? date;
  const spend = data?.expenses.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const active = data?.habits.filter((h) => isActiveDay(h.activeDays, loadedDate)) ?? [];
  const done = active.filter((h) => (data?.logs.find((l) => l.habitId === h.id)?.count ?? 0) >= h.dailyGoal).length;
  const summary = `Spent ${formatMoney(spend)} · ${done} of ${active.length} habits done`;
  const share = useShareImage();
  const shareDay = () => {
    if (data) share(diaryShareContent({ theme, date: loadedDate, todos: data.todos, journal: data.journal, summary }));
  };
  return <LargeTitleScreen title={`${dayOfMonth(date)} ${monthName(date)}`} subtitle={`${weekdayName(date)}, ${date.slice(0, 4)}`}
    floatingAdd={{ label: 'Add to-do', onPress: addInline }}
    // Below the dates a swipe reaches Today (right) or Notes (left); the strip and month sit in the
    // header, outside this area, and keep their own swipes.
    swipeArea={(page) => <TabSwipeArea tab="diary" enabled={!dragging} style={{ flex: 1 }}>{page}</TabSwipeArea>}
    titleAccessory={<TabHeaderActions shareLabel="Share this day" onShare={shareDay} />}
    fixedContent={<DiaryDateBar today={today} selected={date} month={month} markedDates={new Set(data?.nearbyTodos.map((t) => t.date) ?? [])}
      moods={data?.moods ?? {}} monthlyTodos={data?.monthlyTodos ?? []} onSelect={setDate} onMonthChange={setMonth} onDraggingChange={setDragging} />}
    scrollEnabled={!dragging} contentContainerStyle={{ gap: theme.spacing.lg, flexGrow: 1 }}>
    {error || !data ? <LoadState error={error} retry={refresh} /> : <>
        <TodoList todos={data.todos} inlineDate={loadedDate} addRequest={addRequest} onDraggingChange={setDragging} header={data.previous.length > 0 &&
          <View key="carry-over" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: theme.sizes.rowMinHeight, paddingHorizontal: theme.sizes.rowPadding }}>
            <Text variant="subheadline" color="secondaryLabel">{data.previous.length} left from {loadedDate === today ? 'yesterday' : 'the day before'}</Text>
            <Button title={loadedDate === today ? 'Move to Today' : 'Move here'} variant="plain" size="small" onPress={() => { void action(() => moveIncomplete(addDays(loadedDate, -1), loadedDate)); }} />
          </View>} />
        <JournalEditor key={loadedDate} date={loadedDate} initial={data.journal} />
        <Text align="center" variant="subheadline" color="secondaryLabel">{summary}</Text>
    </>}
  </LargeTitleScreen>;
}
