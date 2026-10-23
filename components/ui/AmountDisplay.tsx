import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { durations } from '@/constants/motion';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './Text';

export type AmountDisplayProps = {
  /** Raw keypad input ("450", "12.5"); empty shows a placeholder 0. */
  input: string;
  /** Increment to shake the amount (rejected key). */
  shakeSignal?: number;
  /** Smaller 48 pt amount for short screens. */
  compact?: boolean;
};

function groupThousands(input: string) {
  const [whole, fraction] = input.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/** "Rs." + the big 64 pt amount at the top of the Add Expense sheet. */
export function AmountDisplay({ input, shakeSignal = 0, compact }: AmountDisplayProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const shake = useSharedValue(0);

  useEffect(() => {
    if (shakeSignal === 0 || reduceMotion) return;
    const step = durations.fast / 3;
    shake.set(withSequence(
      withTiming(-theme.spacing.sm, { duration: step }),
      withTiming(theme.spacing.sm, { duration: step }),
      withTiming(0, { duration: step }),
    ));
  }, [reduceMotion, shake, shakeSignal, theme.spacing.sm]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const empty = input === '';

  return (
    <Animated.View
      accessible
      accessibilityLabel={`Amount, ${empty ? 'zero' : input} rupees`}
      accessibilityLiveRegion="polite"
      style={[styles.row, { gap: theme.spacing.xs, paddingHorizontal: theme.spacing.xxl }, style]}
    >
      <View style={{ paddingBottom: theme.spacing.sm }}>
        <Text variant="title1" color="secondaryLabel">Rs.</Text>
      </View>
      <Text variant={compact ? 'hero' : 'display'} tabular color={empty ? 'tertiaryLabel' : 'label'} numberOfLines={1} adjustsFontSizeToFit style={styles.amount}>
        {empty ? '0' : groupThousands(input)}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  amount: { flexShrink: 1 },
});
