import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import type { AccentName } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';
import { WEEKDAY_LETTERS } from '@/lib/date';
import { animateTo } from '@/lib/animation';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SWATCH_RING = 2.5;
const SWATCH_GAP = 3;

function ColorSwatch({ name, selected, onSelect }: { name: AccentName; selected: boolean; onSelect: () => void }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(selected ? 1 : 0);
  useEffect(() => { progress.set(animateTo(selected ? 1 : 0, 'snappy', reduced)); }, [progress, reduced, selected]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: progress.get(), transform: [{ scale: reduced ? 1 : 0.8 + progress.get() * 0.2 }] }));
  const size = theme.sizes.iconTile;
  const outer = size + (SWATCH_RING + SWATCH_GAP) * 2;
  return <PressableScale haptic="selection" accessibilityRole="radio" accessibilityLabel={name} accessibilityState={{ selected }} onPress={onSelect}
    style={[styles.center, { width: outer, height: outer }]}>
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: theme.radii.pill, borderWidth: SWATCH_RING, borderColor: theme.accents[name] }, ringStyle]} />
    <View style={{ width: size, height: size, borderRadius: theme.radii.pill, backgroundColor: theme.accents[name] }} />
  </PressableScale>;
}

function DayButton({ index, selected, onPress }: { index: number; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(selected ? 1 : 0);
  useEffect(() => { progress.set(animateTo(selected ? 1 : 0, 'snappy', reduced)); }, [progress, reduced, selected]);
  const { fill, accent } = theme.colors;
  const style = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(progress.get(), [0, 1], [fill, accent]) }));
  return <PressableScale haptic="selection" accessibilityRole="checkbox" accessibilityLabel={WEEKDAY_NAMES[index]} accessibilityState={{ checked: selected }} onPress={onPress}>
    <Animated.View style={[styles.center, { width: theme.sizes.dayCircle, height: theme.sizes.dayCircle, borderRadius: theme.radii.pill }, style]}>
      <Text variant="headline" weight={selected ? 'bold' : 'regular'} color={selected ? 'onAccent' : 'secondaryLabel'}>{WEEKDAY_LETTERS[index]}</Text>
    </Animated.View>
  </PressableScale>;
}

/** Habit colour choices (Add Habit "COLOUR"); selected swatch gets a ring in its own colour. */
export function SwatchPicker({ colors, selected, onSelect }: {
  colors: readonly AccentName[]; selected: AccentName; onSelect: (color: AccentName) => void;
}) {
  return (
    <View style={[styles.row, { justifyContent: 'space-between' }]} accessibilityRole="radiogroup">
      {colors.map((name) => <ColorSwatch key={name} name={name} selected={name === selected} onSelect={() => onSelect(name)} />)}
    </View>
  );
}

/** M T W T F S S circles bound to the `activeDays` bitmask (Monday = bit 0). */
export function WeekdayPicker({ mask, onChange }: { mask: number; onChange: (mask: number) => void }) {
  return (
    <View style={[styles.row, { justifyContent: 'space-between' }]}>
      {WEEKDAY_LETTERS.map((_, index) => {
        const bit = 1 << index;
        const on = (mask & bit) !== 0;
        return (
          <DayButton
            key={WEEKDAY_NAMES[index]}
            index={index}
            selected={on}
            // Keep at least one active day.
            onPress={() => { if (!on || mask !== bit) onChange(mask ^ bit); }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
