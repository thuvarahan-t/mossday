import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

export type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Spoken name of the value, e.g. "Times a day". */
  accessibilityLabel: string;
};

const STEPPER_WIDTH = 96;

/** iOS stepper: − | + on a grey pill; the − side disables at the minimum. */
export function Stepper({ value, onChange, min = 0, max = Number.MAX_SAFE_INTEGER, accessibilityLabel }: StepperProps) {
  const theme = useTheme();
  const canDecrement = value > min;
  const canIncrement = value < max;
  const button = (icon: 'minus' | 'plus', enabled: boolean, next: number, label: string) => (
    <PressableScale
      style={styles.half}
      disabled={!enabled}
      haptic="tap"
      accessibilityLabel={`${label} ${accessibilityLabel}`}
      onPress={() => onChange(next)}
    >
      <Icon name={icon} size={theme.sizes.iconSmall + 1} color={enabled ? 'label' : 'tertiaryLabel'} strokeWidth={2.4} />
    </PressableScale>
  );
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ now: value, min }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment' && canIncrement) onChange(value + 1);
        if (event.nativeEvent.actionName === 'decrement' && canDecrement) onChange(value - 1);
      }}
      style={[styles.row, {
        width: STEPPER_WIDTH, height: theme.sizes.controlHeight, borderRadius: theme.radii.md,
        backgroundColor: theme.colors.fill,
      }]}
    >
      {button('minus', canDecrement, value - 1, 'Decrease')}
      <View style={{ width: theme.sizes.hairline * 2, height: theme.spacing.lg, backgroundColor: theme.colors.separator }} />
      {button('plus', canIncrement, value + 1, 'Increase')}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderCurve: 'continuous' },
  half: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
});
