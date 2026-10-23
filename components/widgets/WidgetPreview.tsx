import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { formatMoney } from '@/lib/money';
import { ProgressRing } from '../ui/ProgressRing';
import { Text } from '../ui/Text';
import { GlassSurface } from '../ui/glass/GlassSurface';

export type SpendWidgetProps = {
  spentCents: number;
  leftCents: number | null;
  meals: { label: string; amountCents: number | null }[];
};

/**
 * Preview of the planned home-screen widgets (design "N · Home Screen widget"). Native
 * widgets are spec v2, so this lives only in the dev gallery for now.
 */
export function SpendWidgetPreview({ spentCents, leftCents, meals }: SpendWidgetProps) {
  const theme = useTheme();
  return (
    <GlassSurface radius={theme.radii.card + 4} contentStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
      <View style={styles.between}>
        <View>
          <Text variant="subheadline" weight="semibold" color="accent">Today</Text>
          <Text variant="title1" tabular>{formatMoney(spentCents)}</Text>
        </View>
        {leftCents !== null && <Text variant="subheadline" color="secondaryLabel">{formatMoney(leftCents)} left</Text>}
      </View>
      <View style={[styles.row, { gap: theme.spacing.sm }]}>
        {meals.map((meal) => (
          <View key={meal.label} style={[styles.tile, {
            borderRadius: theme.radii.lg, height: theme.sizes.touchTarget,
            backgroundColor: meal.amountCents === null ? theme.colors.accent : theme.colors.fill,
          }]}>
            <Text variant="subheadline" weight="semibold" color={meal.amountCents === null ? 'onAccent' : 'label'}>
              {meal.amountCents === null ? `+ ${meal.label}` : formatMoney(meal.amountCents)}
            </Text>
          </View>
        ))}
      </View>
    </GlassSurface>
  );
}

export function HabitsWidgetPreview({ done, total, hint }: { done: number; total: number; hint: string }) {
  const theme = useTheme();
  return (
    <GlassSurface radius={theme.radii.card + 4} contentStyle={{ padding: theme.spacing.lg, gap: theme.spacing.sm, alignItems: 'center' }}>
      <Text variant="subheadline" weight="semibold" color="accent" style={styles.start}>Habits</Text>
      <ProgressRing progress={total ? done / total : 0} size={theme.sizes.habitRing * 1.6} strokeWidth={8}>
        <Text variant="title2" tabular>{`${done}/${total}`}</Text>
      </ProgressRing>
      <Text variant="footnote" color="secondaryLabel">{hint}</Text>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tile: { flex: 1, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  start: { alignSelf: 'flex-start' },
});
