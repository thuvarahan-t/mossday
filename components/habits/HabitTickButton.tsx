import { memo, useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence } from 'react-native-reanimated';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { scales } from '@/constants/motion';

/**
 * Tap = +1 tick, long-press = undo. With an emoji (Today) it is a large progress ring around
 * the emoji. Without one (habit cards) it follows the list design: "+" while untouched,
 * a "5/8" ring while a multi-tick goal is in progress and a filled check once done.
 */
export const HabitTickButton = memo(function HabitTickButton({ name, count, goal, emoji, onTick, onUndo }: {
  name: string; count: number; goal: number; emoji?: string; onTick: () => void; onUndo: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const previous = useRef(count);
  useEffect(() => {
    if (previous.current !== count && !reduced) scale.set(withSequence(animateTo(scales.pop, 'bouncy', false), animateTo(1, 'bouncy', false)));
    previous.current = count;
  }, [count, reduced, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const done = count >= goal;
  const side = theme.sizes.tickButton;
  const circle = { width: side, height: side, borderRadius: side / 2, alignItems: 'center', justifyContent: 'center' } as const;
  let face;
  if (emoji) face = <ProgressRing progress={count / goal}><Text variant="title2">{emoji}</Text></ProgressRing>;
  else if (done) face = <View style={[circle, { backgroundColor: theme.colors.accent }]}><Icon name="check" color="onAccent" strokeWidth={3} /></View>;
  else if (count > 0) face = <ProgressRing progress={count / goal} size={side} strokeWidth={4}><Text variant="footnote" weight="semibold" tabular>{count}/{goal}</Text></ProgressRing>;
  else face = <View style={[circle, { backgroundColor: theme.colors.fill }]}><Icon name="plus" color="accent" strokeWidth={2.6} /></View>;
  return <PressableScale accessibilityLabel={`Tick ${name}, ${count} of ${goal} today`} accessibilityHint="Long press to undo one tick" onPress={onTick} onLongPress={onUndo}>
    <Animated.View style={style}>{face}</Animated.View>
  </PressableScale>;
});
