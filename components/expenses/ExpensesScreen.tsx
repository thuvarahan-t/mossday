import { useCallback, useState } from 'react';
import { AddButton } from '@/components/navigation/AddButton';
import { AnimatedListItem } from '@/components/ui/AnimatedListItem';
import { BarChart } from '@/components/ui/BarChart';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { GroupedList, ListRow, SectionHeader } from '@/components/ui/GroupedList';
import { LargeTitleScreen } from '@/components/ui/LargeTitleScreen';
import { LoadState } from '@/components/ui/LoadState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SwipeableRow } from '@/components/ui/SwipeableRow';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { resolveAccent, type ColorToken } from '@/constants/theme';
import { useAction, useResource } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { useSheetState } from '@/hooks/useSheetState';
import { useToday } from '@/hooks/useToday';
import {
  addDays, addMonths, dateRange, daysBetween, endOfMonth, formatClock, formatDayHeading, formatLongDate, monthName,
  startOfMonth, startOfWeek, weekdayShort,
} from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { deleteExpense, listExpenses, restoreExpense, type Expense } from '@/lib/repos/expenses';
import { ExpenseSheet } from './ExpenseSheet';
import { PeriodHeader } from './PeriodHeader';
import { categoryStyle, type CategoryStyle } from './categoryStyle';

type Period = 'Day' | 'Week' | 'Month';
type CategoryTotal = { name: string; amount: number; style: CategoryStyle };

export function ExpensesScreen() {
  const theme = useTheme();
  const action = useAction();
  const toast = useToast();
  const today = useToday();
  const [date, setDate] = useState(today);
  const [period, setPeriod] = useState<Period>('Day');
  const [editor, setEditor, editorTransition] = useSheetState<Expense | 'new'>();
  const from = period === 'Day' ? date : period === 'Week' ? startOfWeek(date) : startOfMonth(date);
  const to = period === 'Day' ? date : period === 'Week' ? addDays(from, 6) : endOfMonth(date);
  const previousFrom = period === 'Month' ? addMonths(from, -1) : addDays(from, -(daysBetween(from, to) + 1));
  const { data: result, error, refresh } = useResource(useCallback(async () => ({
    current: await listExpenses(from, to), previous: await listExpenses(previousFrom, addDays(from, -1)),
  }), [from, to, previousFrom]));
  const data = result?.current;
  const total = sum(data ?? []);
  const days = dateRange(from, to);
  const amounts = days.map((day) => sum(data?.filter((e) => e.date === day) ?? []));
  const elapsedDays = days.filter((day) => day <= today).length;

  const remove = (expense: Expense) => {
    void action(() => deleteExpense(expense.id), () => toast({
      message: 'Expense deleted', actionLabel: 'Undo', onAction: () => { void action(() => restoreExpense(expense)); },
    }));
  };
  const shift = (delta: -1 | 1) => setDate(period === 'Month' ? addMonths(date, delta) : addDays(date, delta * (period === 'Week' ? 7 : 1)));
  const summary = periodSummary(period, total, result ? sum(result.previous) : 0, elapsedDays, date === today);

  return <LargeTitleScreen title="Expenses" titleAccessory={<AddButton accessibilityLabel="Add expense" onPress={() => setEditor('new')} />} contentContainerStyle={{ gap: theme.spacing.lg }}>
    <SegmentedControl segments={['Day', 'Week', 'Month'] as const} selected={period} onChange={setPeriod} />
    <PeriodHeader label={periodLabel(period, date, from, today)} total={total} summary={summary.text} summaryColor={summary.color}
      canGoForward={to < today} onShift={shift} />
    {error || !data ? <LoadState error={error} retry={refresh} /> : data.length === 0 ?
      <EmptyState icon="wallet" title={period === 'Day' && date === today ? 'No expenses today' : `Nothing spent this ${period.toLowerCase()}`}
        message="Tap here to add one." onPress={() => setEditor('new')} /> : period === 'Day' ?
      <GroupedList>{[...data].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((expense) => <AnimatedListItem key={expense.id}>
        <SwipeableRow onDelete={() => remove(expense)}>
          <ListRow title={expense.title || expense.categoryName || 'One-time'} subtitle={expenseDetail(expense)} valueColor="label"
            value={formatMoney(expense.amount)} onPress={() => setEditor(expense)} icon={categoryStyle(expense.categoryIcon, expense.categoryColor)} />
        </SwipeableRow>
      </AnimatedListItem>)}
        {/* The next expense is one tap away at the end of the day's list. */}
        <ListRow key="add" title="Add expense" icon={{ icon: 'plus', color: 'green' }} onPress={() => setEditor('new')} />
      </GroupedList> : <>
        <Card>
          <BarChart values={amounts.map((amount, index) => days[index] > today ? null : amount)} highlightIndex={days.indexOf(today)}
            labels={chartLabels(period, days, days.indexOf(today))}
            accessibilityLabel={`Spending per day. ${formatLongDate(from)} to ${formatLongDate(to)}`} />
        </Card>
        <CategoryBreakdown totals={categoryTotals(data)} total={total}
          footnote={`Highest day: ${formatMoney(Math.max(...amounts))}`} period={period} />
      </>}
    {editor && <ExpenseSheet {...editorTransition} initial={editor === 'new' ? undefined : editor} date={date} onClose={() => setEditor(null)} />}
  </LargeTitleScreen>;
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

const sum = (expenses: Expense[]) => expenses.reduce((total, e) => total + e.amount, 0);

function categoryTotals(expenses: Expense[]): CategoryTotal[] {
  const totals = new Map<string, CategoryTotal>();
  for (const e of expenses) {
    const name = e.categoryName ?? 'One-time';
    const entry = totals.get(name) ?? { name, amount: 0, style: categoryStyle(e.categoryIcon, e.categoryColor) };
    entry.amount += e.amount;
    totals.set(name, entry);
  }
  return [...totals.values()].sort((a, b) => b.amount - a.amount);
}

/** "7:40", "18:10 · One-time", "12:50 · Card" — cash is the default and stays implicit. */
function expenseDetail(expense: Expense) {
  const parts = [formatClock(new Date(expense.createdAt))];
  if (expense.isOneTime) parts.push('One-time');
  if (expense.paymentMethod !== 'CASH') parts.push(expense.paymentMethod[0] + expense.paymentMethod.slice(1).toLowerCase());
  return parts.join(' · ');
}

function periodLabel(period: Period, date: string, from: string, today: string) {
  if (period === 'Day') return formatDayHeading(date);
  if (period === 'Week') return from === startOfWeek(today) ? 'This week' : `Week of ${formatDayHeading(from)}`;
  return date.slice(0, 4) === today.slice(0, 4) ? monthName(date) : `${monthName(date)} ${date.slice(0, 4)}`;
}

function periodSummary(period: Period, total: number, previous: number, elapsedDays: number, isToday: boolean): { text: string; color: ColorToken } {
  if (period !== 'Day') {
    // Daily average in whole rupees: cents would read as false precision here.
    const average = elapsedDays ? Math.round(total / elapsedDays / 100) * 100 : 0;
    return { text: `About ${formatMoney(average)} a day`, color: 'secondaryLabel' };
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
