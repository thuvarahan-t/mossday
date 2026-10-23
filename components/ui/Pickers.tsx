import { StyleSheet, View } from 'react-native';
import type { AccentName } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';
import { WEEKDAY_LETTERS } from '@/lib/date';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SWATCH_RING = 2.5;
const SWATCH_GAP = 3;

/** Habit colour choices (Add Habit "COLOUR"); selected swatch gets a ring in its own colour. */
export function SwatchPicker({ colors, selected, onSelect }: {
  colors: readonly AccentName[]; selected: AccentName; onSelect: (color: AccentName) => void;
}) {
  const theme = useTheme();
  const swatch = theme.sizes.iconTile;
  const outer = swatch + (SWATCH_RING + SWATCH_GAP) * 2;
  return (
    <View style={[styles.row, { justifyContent: 'space-between' }]} accessibilityRole="radiogroup">
      {colors.map((name) => {
        const isSelected = name === selected;
        const color = theme.accents[name];
        return (
          <PressableScale
            key={name}
            haptic="selection"
            accessibilityRole="radio"
            accessibilityLabel={name}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(name)}
            style={[styles.center, {
              width: outer, height: outer, borderRadius: theme.radii.pill,
              borderWidth: SWATCH_RING, borderColor: isSelected ? color : 'transparent',
            }]}
          >
            <View style={{ width: swatch, height: swatch, borderRadius: theme.radii.pill, backgroundColor: color }} />
          </PressableScale>
        );
      })}
    </View>
  );
}

/** M T W T F S S circles bound to the `activeDays` bitmask (Monday = bit 0). */
export function WeekdayPicker({ mask, onChange }: { mask: number; onChange: (mask: number) => void }) {
  const theme = useTheme();
  const side = theme.sizes.dayCircle;
  return (
    <View style={[styles.row, { justifyContent: 'space-between' }]}>
      {WEEKDAY_LETTERS.map((letter, index) => {
        const bit = 1 << index;
        const on = (mask & bit) !== 0;
        return (
          <PressableScale
            key={WEEKDAY_NAMES[index]}
            haptic="selection"
            accessibilityRole="checkbox"
            accessibilityLabel={WEEKDAY_NAMES[index]}
            accessibilityState={{ checked: on }}
            // Keep at least one active day.
            onPress={() => { if (!on || mask !== bit) onChange(mask ^ bit); }}
            style={[styles.center, {
              width: side, height: side, borderRadius: theme.radii.pill,
              backgroundColor: on ? theme.colors.accent : theme.colors.fill,
            }]}
          >
            <Text variant="headline" weight={on ? 'bold' : 'regular'} color={on ? 'onAccent' : 'secondaryLabel'}>{letter}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
