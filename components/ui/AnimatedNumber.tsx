import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { LinearTransition, FadeIn, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import type { ColorToken } from '@/constants/theme';
import { textVariants, type FontWeight, type TextVariant } from '@/constants/typography';
import { animateTo } from '@/lib/animation';
import { durations } from '@/constants/motion';
import { Text } from './Text';

export type AnimatedNumberProps = {
  value: number;
  /** Turns the number into display text, e.g. `formatMoney`. Digits roll; other characters stay. */
  format?: (value: number) => string;
  variant?: TextVariant;
  color?: ColorToken;
  weight?: FontWeight;
  accessibilityLabel?: string;
};

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const RollingDigit = memo(function RollingDigit({ digit, variant, color, weight }: {
  digit: number; variant: TextVariant; color: ColorToken; weight?: FontWeight;
}) {
  const reduceMotion = useReducedMotion();
  const lineHeight = textVariants[variant].lineHeight;
  const position = useSharedValue(digit);

  useEffect(() => {
    position.set(animateTo(digit, 'default', reduceMotion));
  }, [digit, position, reduceMotion]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -position.get() * lineHeight }] }));

  return (
    <View style={[styles.clip, { height: lineHeight }]}>
      {reduceMotion ? <Text variant={variant} color={color} weight={weight} tabular>{digit}</Text> : <Animated.View style={style}>
        {DIGITS.map((d) => (
          <Text key={d} variant={variant} color={color} weight={weight} tabular>{d}</Text>
        ))}
      </Animated.View>}
    </View>
  );
});

/**
 * Odometer-style number: each digit rolls to its new value with `spring.default`, so totals
 * visibly count up after a save. Digits are keyed from the right so units stay in place.
 */
export function AnimatedNumber({
  value, format = String, variant = 'hero', color = 'label', weight, accessibilityLabel,
}: AnimatedNumberProps) {
  const text = format(value);
  const reduceMotion = useReducedMotion();
  const characters = text.split('');
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={accessibilityLabel ?? text} style={styles.row}>
      {characters.map((character, index) => {
        const key = characters.length - index;
        const animation = { entering: FadeIn.duration(durations.fast), exiting: FadeOut.duration(durations.fast), layout: reduceMotion ? undefined : LinearTransition.duration(durations.normal) };
        return /\d/.test(character) ? (
          <Animated.View key={`d${key}`} {...animation}>
            <RollingDigit digit={Number(character)} variant={variant} color={color} weight={weight} />
          </Animated.View>
        ) : (
          <Animated.View key={`c${key}${character}`} {...animation}>
            <Text variant={variant} color={color} weight={weight} tabular>{character}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  clip: { overflow: 'hidden' },
});
