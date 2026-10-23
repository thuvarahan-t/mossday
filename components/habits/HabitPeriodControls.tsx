import { View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { addMonths } from '@/lib/date';
import { habitYear } from './habitPeriod';

/** Previous / year / next. Future years are not reachable. */
export function HabitPeriodControls({ anchor, today, onAnchorChange }: { anchor: string; today: string; onAnchorChange: (date: string) => void }) {
  const theme = useTheme();
  const period = habitYear(anchor);
  const previous = addMonths(period.start, -12);
  const next = addMonths(period.start, 12);
  const canGoBack = previous >= '1970-01-01';
  const canGoForward = next <= today;
  const arrow = { minWidth: theme.sizes.touchTarget, minHeight: theme.sizes.touchTarget, alignItems: 'center', justifyContent: 'center' } as const;
  return <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: theme.sizes.screenInset - theme.spacing.sm }}>
    <PressableScale haptic="selection" disabled={!canGoBack} accessibilityLabel="Previous year" onPress={() => onAnchorChange(previous)} style={arrow}>
      <Icon name="chevronLeft" color={canGoBack ? 'label' : 'tertiaryLabel'} />
    </PressableScale>
    <Text variant="headline" align="center" style={{ flex: 1 }}>{period.label}</Text>
    <PressableScale haptic="selection" disabled={!canGoForward} accessibilityLabel="Next year" onPress={() => onAnchorChange(next)} style={arrow}>
      <Icon name="chevronRight" color={canGoForward ? 'label' : 'tertiaryLabel'} />
    </PressableScale>
  </View>;
}
