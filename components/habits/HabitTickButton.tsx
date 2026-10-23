import { memo, useEffect, useRef } from 'react';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence } from 'react-native-reanimated';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Text } from '@/components/ui/Text';
import { animateTo } from '@/lib/animation';
import { scales } from '@/constants/motion';

export const HabitTickButton = memo(function HabitTickButton({ name, count, goal, emoji, onTick, onUndo }: {
  name: string; count: number; goal: number; emoji?: string; onTick: () => void; onUndo: () => void;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const previous = useRef(count);
  useEffect(() => {
    if (previous.current !== count && !reduced) scale.set(withSequence(animateTo(scales.pop, 'bouncy', false), animateTo(1, 'bouncy', false)));
    previous.current = count;
  }, [count, reduced, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return <PressableScale accessibilityLabel={`Tick ${name}, ${count} of ${goal} today`} accessibilityHint="Long press to undo one tick" onPress={onTick} onLongPress={onUndo}>
    <Animated.View style={style}><ProgressRing progress={count / goal}><Text color="accent" variant={emoji ? 'title2' : 'headline'}>{emoji ?? (count >= goal ? '✓' : goal > 1 ? `${count}/${goal}` : '+')}</Text></ProgressRing></Animated.View>
  </PressableScale>;
});
