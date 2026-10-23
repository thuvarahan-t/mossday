import { StyleSheet, View } from 'react-native';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import type { ColorToken } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatMoney } from '@/lib/money';

/** Centred period label, hero total between ‹ › arrows, and one summary line (design B/D). */
export function PeriodHeader({ label, total, summary, summaryColor, canGoForward, onShift }: {
  label: string; total: number; summary: string; summaryColor: ColorToken; canGoForward: boolean; onShift: (delta: -1 | 1) => void;
}) {
  const theme = useTheme();
  return <View style={[styles.center, { gap: theme.spacing.xxs, paddingHorizontal: theme.sizes.screenInset }]}>
    <Text color="secondaryLabel">{label}</Text>
    <View style={styles.row}>
      <PressableScale haptic="selection" accessibilityLabel="Previous period" hitSlop={theme.spacing.sm} onPress={() => onShift(-1)}>
        <Icon name="chevronLeft" size={theme.sizes.icon + theme.spacing.xs} color="accent" strokeWidth={2.4} />
      </PressableScale>
      <View style={[styles.center, styles.fill]}>
        <AnimatedNumber value={total} format={formatMoney} variant="hero" />
      </View>
      <PressableScale haptic="selection" accessibilityLabel="Next period" hitSlop={theme.spacing.sm} disabled={!canGoForward}
        accessibilityState={{ disabled: !canGoForward }} onPress={() => onShift(1)}>
        <Icon name="chevronRight" size={theme.sizes.icon + theme.spacing.xs} color={canGoForward ? 'accent' : 'tertiaryLabel'} strokeWidth={2.4} />
      </PressableScale>
    </View>
    <Text variant="subheadline" color={summaryColor}>{summary}</Text>
  </View>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
});
