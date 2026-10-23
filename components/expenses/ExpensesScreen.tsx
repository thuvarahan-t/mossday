import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { TabHeaderActions } from '@/components/navigation/HeaderActions';
import { useShareImage } from '@/components/share/ShareImage';
import { AnimatedListItem } from '@/components/ui/AnimatedListItem';
import { BarChart } from '@/components/ui/BarChart';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ContextMenu } from '@/components/ui/ContextMenu';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { GroupedList, ListRow, SectionHeader } from '@/components/ui/GroupedList';
import { LargeTitleScreen } from '@/components/ui/LargeTitleScreen';
import { PressableScale } from '@/components/ui/PressableScale';
import { LoadState } from '@/components/ui/LoadState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SwipeableRow } from '@/components/ui/SwipeableRow';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { resolveAccent, type ColorToken } from '@/constants/theme';
import { useAction, useResource } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { useCurrency } from '@/hooks/useCurrency';
import { useSheetState } from '@/hooks/useSheetState';
import { useToday } from '@/hooks/useToday';
import {
  addDays, addMonths, dateRange, daysBetween, endOfMonth, formatDayHeading, formatLongDate, monthName,
  startOfMonth, startOfWeek, weekdayShort, weekOfMonthLabel,
} from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { deleteExpense, listExpenses, restoreExpense, type Expense } from '@/lib/repos/expenses';
import { getSettings } from '@/lib/repos/settings';
import { BudgetMeter } from './BudgetMeter';
import { expensesShareContent } from './expensesShare';
import { ExpenseSheet, preloadCategories } from './ExpenseSheet';
import { useDatePicker } from '@/components/ui/DateSelector';
import { PeriodHeader } from './PeriodHeader';
import { PeriodSwipeArea } from './PeriodSwipeArea';
import { categoryStyle } from './categoryStyle';
import { categoryTotals, expenseDetail, sum, type CategoryTotal } from './expenseSummary';
import { recordedDayAverage } from './expenseMetrics';
import { BudgetSheet, type BudgetKey } from '@/components/settings/BudgetSheet';

const periods = ['Day', 'Week', 'Month'] as const;
type Period = typeof periods[number];
type PeriodRange = { period: Period; date: string; from: string; to: string };

export function ExpensesScreen() {
  const theme = useTheme();
  useCurrency();
  const action = useAction();
  const toast = useToast();
  const today = useToday();
  const [date, setDate] = useState(today);
  const [period, setPeriod] = useState<Period>('Day');
  // Links such as Today's "Spent today" open a specific day; `at` changes on every link,
  // so repeated taps still jump back even when the day itself is the same.
  const { day, at } = useLocalSearchParams<{ day?: string; at?: string }>();
  const [handledLink, setHandledLink] = useState<string>();
  if (at && at !== handledLink) {
    setHandledLink(at);
    if (typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && day <= today) { setPeriod('Day'); setDate(day); }
  }
  useEffect(preloadCategories, []);
  const [editor, setEditor, editorTransition] = useSheetState<Expense | 'new'>();
  const [budgetEditor, setBudgetEditor, budgetTransition] = useSheetState<BudgetKey>();
  const selected = periodRange(period, date);
  const { data: result, error, refresh } = useResource(useCallback(() => loadPeriod(period, date), [period, date]));
  // While the next period loads, draw the one the data belongs to: switching Month → Day
  // must never lay a whole month of expenses out as the day's list.
  const view = result?.range ?? selected;
  const dailyBudget = view.period === 'Day' ? result?.settings.dailyBudget ?? 0 : 0;
  const data = result?.current;
  const total = sum(data ?? []);
  const days = dateRange(view.from, view.to);
  const amounts = days.map((day) => sum(data?.filter((e) => e.date === day) ?? []));
  const average = recordedDayAverage(data ?? []);
  const monthlyBudget = result?.settings.monthlyBudget ?? 0;

  const remove = (expense: Expense) => {
    void action(() => deleteExpense(expense.id), () => toast({
      message: 'Expense deleted', actionLabel: 'Undo', onAction: () => { void action(() => restoreExpense(expense)); },
    }));
  };
  // A picked date opens that day, whichever period was showing.
  const datePicker = useDatePicker(date, (day) => { setPeriod('Day'); setDate(day); }, today);
  const shift = (delta: -1 | 1) => setDate(period === 'Month' ? addMonths(date, delta) : addDays(date, delta * (period === 'Week' ? 7 : 1)));
  const summary = periodSummary(view.period, total, result ? sum(result.previous) : 0, average, view.date === today);
  const label = periodLabel(view, today);

  const shareImage = useShareImage();
  const shareExpenses = () => {
    if (!data) return;
    void shareImage(expensesShareContent({ theme, label, total, expenses: data, byDay: view.period === 'Day', dailyBudget }));
  };
  return <LargeTitleScreen title="Expenses" titleAccessory={<TabHeaderActions shareLabel="Share expenses" onShare={shareExpenses} addLabel="Add expense" onAdd={() => setEditor('new')} />}
    contentContainerStyle={{ gap: theme.spacing.lg, flexGrow: 1 }}>
    {/* The Day / Week / Month switch stays put; only the period's content slides. */}
    <SegmentedControl segments={periods} selected={period} onChange={setPeriod} />
    {/* Grows into the empty space under short lists, so a swipe anywhere below the switch works. */}
    <PeriodSwipeArea contentKey={view} periods={periods} onSwipe={setPeriod} style={{ gap: theme.spacing.lg, flexGrow: 1 }}>
      <PeriodHeader label={label} total={total} summary={summary.text} summaryColor={summary.color}
        canGoForward={selected.to < today} onShift={shift} onPickDate={datePicker.open} />
      {/* iOS draws the calendar inline, right under the date it changes; Android opens a dialog. */}
      {datePicker.picker}
      {dailyBudget > 0 && <PressableScale accessibilityLabel="Daily budget, edit" haptic="tap" onPress={() => setBudgetEditor('dailyBudget')}
        style={{ paddingHorizontal: theme.sizes.titleInset }}><BudgetMeter spent={total} budget={dailyBudget} /></PressableScale>}
      {monthlyBudget > 0 ? <PressableScale accessibilityLabel={`${monthName(view.date)} budget, edit`} haptic="tap" onPress={() => setBudgetEditor('monthlyBudget')}>
        <Card style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="headline">{monthName(view.date)} budget</Text>
            <Icon name="chevronRight" color="tertiaryLabel" />
          </View>
          <Text variant="footnote" color="secondaryLabel">{formatMoney(result?.monthlySpent ?? 0)} spent · {Math.round((result?.monthlySpent ?? 0) / monthlyBudget * 100)}% used</Text>
          <BudgetMeter spent={result?.monthlySpent ?? 0} budget={monthlyBudget} />
        </Card>
      </PressableScale> : view.period === 'Month' ? <Card><Button title="Set a budget" variant="plain" onPress={() => setBudgetEditor('monthlyBudget')} /></Card> : null}
      {error || !data ? <LoadState error={error} retry={refresh} /> : data.length === 0 ?
        <EmptyState icon="wallet" title={view.period === 'Day' && view.date === today ? 'No expenses today' : `Nothing spent this ${view.period.toLowerCase()}`}
          message="Add one in a few taps." action={{ label: 'Add Expense', onPress: () => setEditor('new') }} /> : view.period === 'Day' ?
        <GroupedList>{[...data].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((expense) => <AnimatedListItem key={expense.id}>
          <ExpenseRow expense={expense} onEdit={() => setEditor(expense)} onDelete={() => remove(expense)} />
        </AnimatedListItem>)}
          {/* The next expense is one tap away at the end of the day's list. */}
          <ListRow key="add" title="Add expense" icon={{ icon: 'plus', color: 'green' }} onPress={() => setEditor('new')} />
        </GroupedList> : <>
          <Card>
            <BarChart values={amounts.map((amount, index) => days[index] > today ? null : amount)} highlightIndex={days.indexOf(today)}
              labels={chartLabels(view.period, days, days.indexOf(today))}
              accessibilityLabel={`Spending per day. ${formatLongDate(view.from)} to ${formatLongDate(view.to)}`} />
          </Card>
          <CategoryBreakdown totals={categoryTotals(data)} total={total}
            footnote={`Highest day: ${formatMoney(Math.max(...amounts))}`} period={view.period} />
        </>}
      {budgetEditor && result && <BudgetSheet {...budgetTransition} initial={budgetEditor} budgets={result.settings} onClose={() => setBudgetEditor(null)} />}
      {editor && <ExpenseSheet {...editorTransition} initial={editor === 'new' ? undefined : editor} date={date} onClose={() => setEditor(null)} />}
    </PeriodSwipeArea>
  </LargeTitleScreen>;
}

/** The period a date falls in, e.g. Week → Monday to Sunday around it. */
function periodRange(period: Period, date: string): PeriodRange {
  const from = period === 'Day' ? date : period === 'Week' ? startOfWeek(date) : startOfMonth(date);
  const to = period === 'Day' ? date : period === 'Week' ? addDays(from, 6) : endOfMonth(date);
  return { period, date, from, to };
}

/** The period's expenses, plus the equally long period before it for the comparison line. */
async function loadPeriod(period: Period, date: string) {
  const range = periodRange(period, date);
  const previousFrom = period === 'Month' ? addMonths(range.from, -1) : addDays(range.from, -(daysBetween(range.from, range.to) + 1));
  const [current, previous, settings, monthExpenses] = await Promise.all([
    listExpenses(range.from, range.to), listExpenses(previousFrom, addDays(range.from, -1)), getSettings(),
    period === 'Month' ? Promise.resolve(null) : listExpenses(startOfMonth(date), endOfMonth(date)),
  ]);
  return { range, current, previous, settings, monthlySpent: sum(monthExpenses ?? current) };
}

/** A day-list row: tap to edit, long press for Edit / Delete, or swipe left to delete. */
function ExpenseRow({ expense, onEdit, onDelete }: { expense: Expense; onEdit: () => void; onDelete: () => void }) {
  const title = expense.title || expense.categoryName || 'One-time';
  return <SwipeableRow onDelete={onDelete}>
    <ContextMenu accessibilityLabel={`${title}, ${formatMoney(expense.amount)}`} onPress={onEdit} actions={[
      { label: 'Edit', icon: 'edit', onPress: onEdit },
      { label: 'Delete', icon: 'trash', destructive: true, onPress: onDelete },
    ]}>
      <ListRow title={title} subtitle={expenseDetail(expense)} valueColor="label" value={formatMoney(expense.amount)}
        icon={categoryStyle(expense.categoryIcon, expense.categoryColor)} />
    </ContextMenu>
  </SwipeableRow>;
}

/** "BY CATEGORY" rows with each category's colour bar (UI analysis R7), plus local insights. */
function CategoryBreakdown({ totals, total, footnote, period }: { totals: CategoryTotal[]; total: number; footnote: string; period: Period }) {
  const theme = useTheme();
  const top = totals[0];
  return <>
    <SectionHeader title="By category" />
    <GroupedList>{totals.map((group) => <ListRow key={group.name} title={group.name} value={formatMoney(group.amount)} icon={group.style}
      footer={<ProgressBar progress={group.amount / total} color={resolveAccent(theme, group.style.color)} />} />)}</GroupedList>
    <Text variant="footnote" color="secondaryLabel" style={{ paddingHorizontal: theme.sizes.screenInset + theme.sizes.rowPadding }}>
      {top.name} is {Math.round(top.amount / total * 100)}% of this {period.toLowerCase()}. {footnote}.
    </Text>
  </>;
}

function periodLabel({ period, date, from }: PeriodRange, today: string) {
  if (period === 'Day') return formatDayHeading(date);
  if (period === 'Week') return weekOfMonthLabel(from, today);
  return date.slice(0, 4) === today.slice(0, 4) ? monthName(date) : `${monthName(date)} ${date.slice(0, 4)}`;
}

function periodSummary(period: Period, total: number, previous: number, average: ReturnType<typeof recordedDayAverage>, isToday: boolean): { text: string; color: ColorToken } {
  if (period !== 'Day') {
    // Whole currency units: cents would read as false precision in an average.
    return { text: `${formatMoney(Math.round(average.amount / 100) * 100)} a day · ${average.days} recorded ${average.days === 1 ? 'day' : 'days'}`, color: 'secondaryLabel' };
  }
  if (!total) return { text: isToday ? 'Nothing spent yet' : 'Nothing spent', color: 'accent' };
  if (!previous) return { text: '', color: 'secondaryLabel' };
  const delta = Math.round((total - previous) / previous * 100);
  if (!delta) return { text: `Same as ${isToday ? 'yesterday' : 'the day before'}`, color: 'secondaryLabel' };
  return { text: `${Math.abs(delta)}% ${delta > 0 ? 'more' : 'less'} than ${isToday ? 'yesterday' : 'the day before'}`, color: delta > 0 ? 'dangerText' : 'accent' };
}

/** Week: M–S under every bar. Month: 1, 8, 15, 22, the last day, and today (labels near today give way). */
function chartLabels(period: Period, days: string[], todayIndex: number) {
  if (period === 'Week') return days.map((day, index) => ({ index, text: weekdayShort(day).slice(0, 1) }));
  const indexes = new Set([0, 7, 14, 21, days.length - 1].filter((index) => todayIndex < 0 || Math.abs(index - todayIndex) > 2));
  if (todayIndex >= 0) indexes.add(todayIndex);
  return [...indexes].sort((a, b) => a - b).map((index) => ({ index, text: String(index + 1) }));
}
