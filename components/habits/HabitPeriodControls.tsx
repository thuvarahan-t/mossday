import { View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { addMonths } from '@/lib/date';
import { habitPeriod, type HabitTrackerMode } from './habitPeriod';

export function HabitPeriodControls({ mode, anchor, today, onModeChange, onAnchorChange }: {
  mode: HabitTrackerMode; anchor: string; today: string;
  onModeChange: (mode: HabitTrackerMode) => void; onAnchorChange: (date: string) => void;
}) {
  const theme = useTheme();
  const period = habitPeriod(mode, anchor);
  const step = mode === 'Month' ? 1 : 12;
  const previous = addMonths(period.start, -step);
  const next = addMonths(period.start, step);
  const canGoBack = previous >= '1970-01-01';
  const canGoForward = next <= today;
  return <View style={{ gap: theme.spacing.sm }}>
    <SegmentedControl segments={['Month', 'Year']} selected={mode} onChange={onModeChange} />
    <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: theme.sizes.screenInset }}>
      <PressableScale haptic="selection" disabled={!canGoBack} accessibilityLabel={`Previous ${mode.toLowerCase()}`} onPress={() => onAnchorChange(previous)}
        style={{ minWidth: theme.sizes.touchTarget, minHeight: theme.sizes.touchTarget, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="chevronLeft" color={canGoBack ? 'label' : 'tertiaryLabel'} />
      </PressableScale>
      <Text variant="headline" align="center" style={{ flex: 1 }}>{period.label}</Text>
      <PressableScale haptic="selection" disabled={!canGoForward} accessibilityLabel={`Next ${mode.toLowerCase()}`} onPress={() => onAnchorChange(next)}
        style={{ minWidth: theme.sizes.touchTarget, minHeight: theme.sizes.touchTarget, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="chevronRight" color={canGoForward ? 'label' : 'tertiaryLabel'} />
      </PressableScale>
    </View>
  </View>;
}
