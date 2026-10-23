import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { GroupedList, ListRow } from '@/components/ui/GroupedList';
import { MonthGrid } from '@/components/ui/MonthGrid';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { formatLongDate } from '@/lib/date';
import { formatMoney } from '@/lib/money';
import type { Todo } from '@/lib/repos/diary';
import type { Expense } from '@/lib/repos/expenses';

/**
 * Month view of the diary (design I): spending tint per day, to-do dots, a legend and a
 * summary row for the selected day that opens its diary page.
 */
export function DiaryCalendar({ month, today, selected, monthlyExpenses, monthlyTodos, selectedSpend, selectedOpenTodos, onSelect, onOpenDay }: {
  month: string; today: string; selected: string; monthlyExpenses: Expense[]; monthlyTodos: Todo[];
  selectedSpend: number; selectedOpenTodos: number; onSelect: (date: string) => void; onOpenDay: () => void;
}) {
  const theme = useTheme();
  const amounts = monthlyExpenses.reduce<Record<string, number>>((result, e) => { result[e.date] = (result[e.date] ?? 0) + e.amount; return result; }, {});
  const maxSpend = Math.max(1, ...Object.values(amounts));
  const spendLevels = Object.fromEntries(Object.entries(amounts).map(([day, amount]) => [day, Math.ceil(amount / maxSpend * 4)]));
  const dot = { width: theme.spacing.sm, height: theme.spacing.sm, borderRadius: theme.spacing.xs };
  return <>
    <Card><MonthGrid month={month} today={today} selected={selected} onSelect={onSelect} spendLevels={spendLevels}
      todoDates={new Set(monthlyTodos.map((t) => t.date))} /></Card>
    <View style={[styles.legend, { gap: theme.spacing.xl }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.legendItem, { gap: theme.spacing.sm }]}>
        <View style={[dot, { width: theme.spacing.lg, height: theme.spacing.lg, borderRadius: theme.spacing.sm, backgroundColor: theme.spend[3] }]} />
        <Text variant="footnote" color="secondaryLabel">More spent</Text>
      </View>
      <View style={[styles.legendItem, { gap: theme.spacing.sm }]}>
        <View style={[dot, { backgroundColor: theme.colors.secondaryLabel }]} />
        <Text variant="footnote" color="secondaryLabel">Has to-dos</Text>
      </View>
    </View>
    <GroupedList>
      <ListRow title={formatLongDate(selected)} subtitle={`${formatMoney(selectedSpend)} · ${selectedOpenTodos} to-dos left`}
        accessory="chevron" accessibilityLabel={`Open diary for ${formatLongDate(selected)}`} onPress={onOpenDay} />
    </GroupedList>
  </>;
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
});
