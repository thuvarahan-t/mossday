import { View } from 'react-native';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Text } from '@/components/ui/Text';
import type { ColorToken } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatMoney } from '@/lib/money';

/** Amber from 80 % of the budget, red once it is exceeded (spec §5.2 budget). */
export function budgetStatus(spent: number, budget: number): ColorToken {
  if (spent > budget) return 'dangerText';
  return spent >= budget * 0.8 ? 'warningText' : 'accent';
}

/** Budget bar with "Rs. 750 left" / "Rs. 300 over budget" and "of Rs. 2,000" underneath. */
export function BudgetMeter({ spent, budget }: { spent: number; budget: number }) {
  const theme = useTheme();
  const status = budgetStatus(spent, budget);
  const fill = status === 'accent' ? theme.colors.accentBar : status === 'warningText' ? theme.colors.warning : theme.colors.danger;
  return <View style={{ gap: theme.spacing.sm }}>
    <ProgressBar progress={spent / budget} color={fill} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text variant="subheadline" weight="semibold" color={status}>
        {formatMoney(Math.abs(budget - spent))} {spent > budget ? 'over budget' : 'left'}
      </Text>
      <Text variant="subheadline" color="secondaryLabel">of {formatMoney(budget)}</Text>
    </View>
  </View>;
}
