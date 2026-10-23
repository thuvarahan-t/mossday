import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFabAction } from '@/components/navigation/FabAction';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { AnimatedListItem } from '@/components/ui/AnimatedListItem';
import { BarChart } from '@/components/ui/BarChart';
import { Button } from '@/components/ui/Button';
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
import { useAction, useResource } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { useSheetState } from '@/hooks/useSheetState';
import { addDays, addMonths, dateRange, daysBetween, endOfMonth, formatDayHeading, formatLongDate, monthName, startOfMonth, startOfWeek, todayLocalDate, weekdayShort } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import { deleteExpense, listExpenses, restoreExpense, type Expense } from '@/lib/repos/expenses';
import { ExpenseSheet } from './ExpenseSheet';

export function ExpensesScreen() {
  const theme = useTheme();
  const action = useAction();
  const toast = useToast();
  const today = todayLocalDate();
  const [date, setDate] = useState(today);
  const [period, setPeriod] = useState<'Day' | 'Week' | 'Month'>('Day');
  const [editor, setEditor, editorTransition] = useSheetState<Expense | 'new'>();
  useFabAction(useCallback(() => setEditor('new'), [setEditor]));
  const from = period === 'Day' ? date : period === 'Week' ? startOfWeek(date) : startOfMonth(date);
  const to = period === 'Day' ? date : period === 'Week' ? addDays(from, 6) : endOfMonth(date);
  const previousFrom = period === 'Month' ? addMonths(from, -1) : addDays(from, -(daysBetween(from, to) + 1));
  const { data: result, error, refresh } = useResource(useCallback(async () => ({ current: await listExpenses(from, to), previous: await listExpenses(previousFrom, addDays(from, -1)) }), [from, to, previousFrom]));
  const data = result?.current;
  const total = data?.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const previous = result?.previous.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  const delta = previous ? Math.round((total - previous) / previous * 100) : null;
  const days = dateRange(from, to);
  const amounts = days.map((day) => data?.filter((e) => e.date === day).reduce((sum, e) => sum + e.amount, 0) ?? 0);
  const groups = Object.values((data ?? []).reduce<Record<string, { name: string; amount: number }>>((result, e) => {
    const name = e.categoryName ?? 'One-time';
    result[name] ??= { name, amount: 0 }; result[name].amount += e.amount; return result;
  }, {})).sort((a, b) => b.amount - a.amount);
  const remove = (expense: Expense) => { void action(() => deleteExpense(expense.id), () => toast({ message: 'Expense deleted', actionLabel: 'Undo', onAction: () => { void action(() => restoreExpense(expense)); } })); };
  const shift = (delta: number) => setDate(period === 'Month' ? addMonths(date, delta) : addDays(date, delta * (period === 'Week' ? 7 : 1)));
  return <LargeTitleScreen title="Expenses" contentContainerStyle={{ gap: theme.spacing.lg }}>
    <SegmentedControl segments={['Day', 'Week', 'Month'] as const} selected={period} onChange={setPeriod} />
    <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
      <Text color="secondaryLabel">{period === 'Day' ? formatDayHeading(date) : period === 'Month' ? `${monthName(date)} ${date.slice(0, 4)}` : `${formatDayHeading(from)} – ${formatDayHeading(to)}`}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Button title="‹" variant="plain" onPress={() => shift(-1)} />
        <AnimatedNumber value={total} format={formatMoney} variant="title1" />
        <Button title="›" variant="plain" disabled={to >= today} onPress={() => shift(1)} />
      </View>
      {period !== 'Day' && <Text color="secondaryLabel">About {formatMoney(Math.round(total / days.filter((d) => d <= today).length || 0))} a day</Text>}
      {delta !== null && <Text variant="subheadline" color={delta > 0 ? 'dangerText' : 'accent'}>{Math.abs(delta)}% {delta > 0 ? 'more' : 'less'} than {period === 'Day' ? 'yesterday' : `last ${period.toLowerCase()}`}</Text>}
    </View>
    {error || !data ? <LoadState error={error} retry={refresh} /> : data.length === 0 ?
      <EmptyState icon="wallet" title="No expenses here" message="Tap + when you spend." action={{ label: 'Add expense', onPress: () => setEditor('new') }} /> : period === 'Day' ?
      <GroupedList>{data.map((expense) => <AnimatedListItem key={expense.id}><SwipeableRow onDelete={() => remove(expense)}>
        <ListRow title={expense.title || expense.categoryName || 'One-time'} subtitle={`${new Date(expense.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${expense.paymentMethod.toLowerCase()}`}
          value={formatMoney(expense.amount)} onPress={() => setEditor(expense)} icon={{ icon: 'wallet', color: 'orange' }} />
      </SwipeableRow></AnimatedListItem>)}</GroupedList> : <>
        <Card><BarChart values={amounts.map((amount, index) => days[index] > today ? null : amount)} highlightIndex={days.indexOf(today)}
          labels={days.flatMap((day, index) => period === 'Week' || index % 7 === 0 ? [{ index, text: period === 'Week' ? weekdayShort(day).slice(0, 1) : String(index + 1) }] : [])}
          accessibilityLabel={`Spending per day. ${formatLongDate(from)} to ${formatLongDate(to)}`} />
          <Text variant="footnote" color="secondaryLabel">Highest day: {formatMoney(Math.max(...amounts))}</Text>
        </Card>
        <SectionHeader title="By category" />
        <Text variant="footnote" color="secondaryLabel" style={{ paddingHorizontal: theme.sizes.titleInset }}>{groups[0]?.name} is {Math.round((groups[0]?.amount ?? 0) / total * 100)}% of this {period.toLowerCase()}.</Text>
        <GroupedList>{groups.map((group) => <ListRow key={group.name} title={group.name} value={formatMoney(group.amount)}
          footer={<ProgressBar progress={group.amount / total} />} />)}</GroupedList>
      </>}
    {editor && <ExpenseSheet {...editorTransition} initial={editor === 'new' ? undefined : editor} date={date} onClose={() => setEditor(null)} />}
  </LargeTitleScreen>;
}
