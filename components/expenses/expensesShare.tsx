import { View } from 'react-native';
import { ShareLine, SharePanel, type ShareCardContent } from '@/components/share/ShareCard';
import { IconTile } from '@/components/ui/IconTile';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import { resolveAccent, type Theme } from '@/constants/theme';
import { formatMoney } from '@/lib/money';
import type { Expense } from '@/lib/repos/expenses';
import { BudgetMeter } from './BudgetMeter';
import { categoryStyle } from './categoryStyle';
import { categoryTotals, expenseDetail } from './expenseSummary';

/** Rows beyond this are summarised as "+ 3 more" so the image stays a postcard, not a list. */
const MAX_ROWS = 8;

/** Expenses tab as an image: the period total, the day's budget and entries, or category bars. */
export function expensesShareContent({ theme, label, total, expenses, byDay, dailyBudget }: {
  theme: Theme; label: string; total: number; expenses: Expense[]; byDay: boolean; dailyBudget: number;
}): ShareCardContent {
  const rows = byDay ? [...expenses].sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : [];
  const totals = byDay ? [] : categoryTotals(expenses);
  const hidden = (byDay ? rows.length : totals.length) - MAX_ROWS;
  return {
    icon: 'wallet',
    title: formatMoney(total),
    subtitle: `${label} · ${expenses.length === 1 ? '1 expense' : `${expenses.length} expenses`}`,
    body: <View style={{ gap: theme.spacing.md }}>
      {dailyBudget > 0 && <SharePanel><BudgetMeter spent={total} budget={dailyBudget} animated={false} /></SharePanel>}
      {expenses.length > 0 && <SharePanel>
        {byDay
          ? rows.slice(0, MAX_ROWS).map((expense) => <ShareLine key={expense.id} title={expense.title || expense.categoryName || 'One-time'}
            detail={expenseDetail(expense)} value={formatMoney(expense.amount)} leading={<IconTile {...categoryStyle(expense.categoryIcon, expense.categoryColor)} />} />)
          : totals.slice(0, MAX_ROWS).map((group) => <View key={group.name} style={{ gap: theme.spacing.xs }}>
            <ShareLine title={group.name} value={formatMoney(group.amount)} leading={<IconTile {...group.style} />} />
            <View style={{ paddingLeft: theme.sizes.iconTile + theme.spacing.md }}>
              <ProgressBar progress={group.amount / total} color={resolveAccent(theme, group.style.color)} animated={false} />
            </View>
          </View>)}
        {hidden > 0 && <Text variant="footnote" color="secondaryLabel" align="center">+ {hidden} more</Text>}
      </SharePanel>}
    </View>,
  };
}
