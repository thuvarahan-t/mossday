import { useCallback, useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { TabHeaderActions } from '@/components/navigation/HeaderActions';
import { useShareImage } from '@/components/share/ShareImage';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { LargeTitleScreen } from '@/components/ui/LargeTitleScreen';
import { LoadState } from '@/components/ui/LoadState';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { WeekStrip } from '@/components/ui/WeekStrip';
import { GlassSurface } from '@/components/ui/glass/GlassSurface';
import { useAction, useResource } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { useSheetState } from '@/hooks/useSheetState';
import { useToday } from '@/hooks/useToday';
import { addDays, addMonths, dayOfMonth, endOfMonth, monthName, startOfMonth, startOfWeek, weekdayName } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { getJournal, listTodos, moveIncomplete } from '@/lib/repos/diary';
import { listExpenses } from '@/lib/repos/expenses';
import { listHabitLogs, listHabits } from '@/lib/repos/habits';
import { isActiveDay } from '@/lib/heatmap';
import { DiaryCalendar } from './DiaryCalendar';
import { diaryShareContent } from './diaryShare';
import { JournalEditor } from './JournalEditor';
import { TodoList } from './TodoList';
import { TodoSheet } from './TodoSheet';

export function DiaryScreen() {
  const theme = useTheme();
  const action = useAction();
  const today = useToday();
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(startOfMonth(today));
  const [calendar, setCalendar] = useState(false);
  const [adding, selectAdding, addingTransition] = useSheetState<true>();
  const setAdding = useCallback((open: boolean) => selectAdding(open ? true : null), [selectAdding]);
  const { data, error, refresh } = useResource(useCallback(async () => {
    const [todos, previous, journal, expenses, habits, logs, monthlyTodos, monthlyExpenses, weekTodos] = await Promise.all([
      listTodos(date), listTodos(addDays(date, -1)), getJournal(date), listExpenses(date), listHabits(), listHabitLogs(date, date),
      listTodos(startOfMonth(month), endOfMonth(month)), listExpenses(startOfMonth(month), endOfMonth(month)),
      listTodos(startOfWeek(date), addDays(startOfWeek(date), 6)),
    ]);
    return { todos, previous: previous.filter((t) => !t.isDone), journal, expenses, habits, logs, monthlyTodos, monthlyExpenses, weekTodos };
  }, [date, month]));
  const spend = data?.expenses.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const active = data?.habits.filter((h) => isActiveDay(h.activeDays, date)) ?? [];
  const done = active.filter((h) => (data?.logs.find((l) => l.habitId === h.id)?.count ?? 0) >= h.dailyGoal).length;
  const closeCalendar = useCallback(() => setCalendar(false), []);
  const summary = `Spent ${formatMoney(spend)} · ${done} of ${active.length} habits done`;
  const shareImage = useShareImage();
  const shareDay = () => {
    if (data) void shareImage(diaryShareContent({ theme, date, todos: data.todos, journal: data.journal, summary }));
  };
  useEffect(() => {
    if (!calendar) return;
    // Android back leaves the calendar mode before it leaves the tab.
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { closeCalendar(); return true; });
    return () => subscription.remove();
  }, [calendar, closeCalendar]);
  const monthNavigation = <GlassSurface contentStyle={{ flexDirection: 'row', height: theme.sizes.circleButton, paddingHorizontal: theme.spacing.lg, gap: theme.spacing.xl, alignItems: 'center' }}>
    <PressableScale haptic="selection" accessibilityLabel="Previous month" hitSlop={theme.spacing.sm} onPress={() => setMonth(addMonths(month, -1))}><Icon name="chevronLeft" size={theme.sizes.iconLarge} /></PressableScale>
    <PressableScale haptic="selection" accessibilityLabel="Next month" hitSlop={theme.spacing.sm} onPress={() => setMonth(addMonths(month, 1))}><Icon name="chevronRight" size={theme.sizes.iconLarge} /></PressableScale>
  </GlassSurface>;
  return <LargeTitleScreen title={calendar ? `${monthName(month)}${month.slice(0, 4) === today.slice(0, 4) ? '' : ` ${month.slice(0, 4)}`}` : `${dayOfMonth(date)} ${monthName(date)}`}
    subtitle={calendar ? undefined : `${weekdayName(date)}, ${date.slice(0, 4)}`} showBack={calendar} onBack={closeCalendar} headerRight={calendar ? monthNavigation : undefined}
    titleAccessory={calendar ? undefined : <TabHeaderActions shareLabel="Share this day" onShare={shareDay} addLabel="Add to-do" onAdd={() => setAdding(true)} />}
    contentContainerStyle={{ gap: theme.spacing.lg }}>
    {error || !data ? <LoadState error={error} retry={refresh} /> : calendar ? <DiaryCalendar month={month} today={today} selected={date}
      monthlyExpenses={data.monthlyExpenses} monthlyTodos={data.monthlyTodos} selectedSpend={spend} selectedOpenTodos={data.todos.filter((t) => !t.isDone).length}
      onSelect={setDate} onOpenDay={closeCalendar} /> : <>
      <Button title="Open calendar" variant="plain" size="small" onPress={() => { setMonth(startOfMonth(date)); setCalendar(true); }} />
      <WeekStrip weekStart={startOfWeek(date)} today={today} selected={date} markedDates={new Set(data.weekTodos.map((t) => t.date))} onSelect={setDate} onChangeWeek={(delta) => setDate(addDays(date, delta * 7))} />
      {data.todos.length || data.previous.length ? <TodoList todos={data.todos} reorder header={data.previous.length > 0 &&
        <View key="carry-over" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: theme.sizes.rowMinHeight, paddingHorizontal: theme.sizes.rowPadding }}>
          <Text variant="subheadline" color="secondaryLabel">{data.previous.length} left from {date === today ? 'yesterday' : 'the day before'}</Text>
          <Button title={date === today ? 'Move to Today' : 'Move here'} variant="plain" size="small" onPress={() => { void action(() => moveIncomplete(addDays(date, -1), date)); }} />
        </View>} /> : <Card><Text color="secondaryLabel">Nothing planned.</Text><Button title="Add to-do" variant="plain" onPress={() => setAdding(true)} /></Card>}
      <JournalEditor key={date} date={date} initial={data.journal} />
      <Text align="center" variant="subheadline" color="secondaryLabel">{summary}</Text>
    </>}
    {adding && <TodoSheet {...addingTransition} date={date} onClose={() => setAdding(false)} />}
  </LargeTitleScreen>;
}
