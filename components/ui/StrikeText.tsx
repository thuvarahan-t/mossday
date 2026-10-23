import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { durations, easing } from '@/constants/motion';
import { textVariants, type TextVariant } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './Text';

export type StrikeTextProps = {
  children: string;
  struck: boolean;
  variant?: TextVariant;
  numberOfLines?: number;
};

/**
 * Text that gets struck through left→right when completed (to-dos, checklist items).
 * A line sweeps across the first line, then the real `line-through` takes over so wrapped
 * lines are struck too. Done text is always secondary (UI-ANALYSIS R4).
 */
export function StrikeText({ children, struck, variant = 'body', numberOfLines = 2 }: StrikeTextProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [previousStruck, setPreviousStruck] = useState(struck);
  const [sweeping, setSweeping] = useState(false);
  const sweep = useSharedValue(0);

  // Start the sweep when the item becomes done (adjusting state during render, not in an effect).
  if (struck !== previousStruck) {
    setPreviousStruck(struck);
    setSweeping(struck && !reduceMotion);
  }

  useEffect(() => {
    if (!sweeping) return;
    sweep.set(0);
    sweep.set(withTiming(1, { duration: durations.normal, easing: easing.standard }, (finished) => {
      if (finished) scheduleOnRN(setSweeping, false);
    }));
  }, [sweep, sweeping]);

  const lineStyle = useAnimatedStyle(() => ({ width: sweep.get() * width }));
  const lineTop = textVariants[variant].lineHeight / 2;

  return (
    <View style={styles.flex} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      <Text variant={variant} color={struck ? 'secondaryLabel' : 'label'} strikethrough={struck && !sweeping} numberOfLines={numberOfLines}>
        {children}
      </Text>
      {sweeping && (
        <Animated.View
          pointerEvents="none"
          style={[styles.line, { top: lineTop, height: 1.5, backgroundColor: theme.colors.secondaryLabel }, lineStyle]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 }, line: { position: 'absolute', left: 0 } });
