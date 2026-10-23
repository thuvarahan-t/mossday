import { memo, useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence } from 'react-native-reanimated';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { dataColors } from '@/lib/dataColors';
import { animateTo } from '@/lib/animation';
import { scales } from '@/constants/motion';

/** The Undo row is drawn short; its hit area still reaches the 44 pt touch target. */
const UNDO_SLOP = 8;

/** A completed check can be tapped again; Undo stays visible for every recorded tick. */
export const HabitTickButton = memo(function HabitTickButton({ name, count, goal, emoji, color = 'green', onTick, onUndo, disabled = false }: {
  name: string; count: number; goal: number; emoji?: string; color?: string; onTick: () => void; onUndo: () => void; disabled?: boolean;
}) {
  const theme = useTheme();
  const palette = dataColors(theme, color);
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const previous = useRef(count);
  const held = useRef(false);
  useEffect(() => {
    if (previous.current !== count && !reduced) scale.set(withSequence(animateTo(scales.pop, 'bouncy', false), animateTo(1, 'bouncy', false)));
    previous.current = count;
  }, [count, reduced, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const done = count >= goal;
  const side = emoji ? theme.sizes.habitRing : theme.sizes.tickButton;
  const circle = { width: side, height: side, borderRadius: side / 2, alignItems: 'center', justifyContent: 'center' } as const;
  return <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
    <PressableScale disabled={disabled} accessibilityLabel={`${done ? 'Undo' : 'Tick'} ${name}, ${count} of ${goal}`}
      accessibilityHint={done ? 'Remove one tick' : 'Add one tick. Use Undo below to remove a tick.'}
      onPressIn={() => { held.current = false; }}
      onPress={() => { if (!held.current) { if (done) onUndo(); else onTick(); } }}
      onLongPress={count > 0 ? () => { held.current = true; onUndo(); } : undefined}
      style={{ minWidth: theme.sizes.touchTarget, minHeight: theme.sizes.touchTarget, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={style}>
        {emoji ? <ProgressRing progress={count / goal} color={palette.accent} trackColor={palette.tint}>
          <View style={[circle, { width: side - 16, height: side - 16, backgroundColor: palette.tint }]}>
            <Text variant="title2">{emoji}</Text>
          </View>
        </ProgressRing> : done ? <View style={[circle, { backgroundColor: palette.accent }]}><Icon name="check" rawColor={palette.onAccent} strokeWidth={3} /></View>
          : <ProgressRing progress={count / goal} color={palette.accent} trackColor={palette.tint} size={side} strokeWidth={4}>
            <Icon name="plus" rawColor={palette.accent} strokeWidth={2.6} />
          </ProgressRing>}
      </Animated.View>
    </PressableScale>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
      <Text variant="footnote" tabular weight="semibold" style={{ color: palette.accent }}>{count}/{goal}</Text>
      <PressableScale disabled={disabled || count === 0} accessibilityLabel={`Undo one tick for ${name}`}
        onPress={onUndo} haptic="tap" hitSlop={{ top: UNDO_SLOP, bottom: UNDO_SLOP }}
        style={{ minHeight: theme.sizes.touchTarget - UNDO_SLOP * 2, minWidth: theme.sizes.touchTarget, alignItems: 'center', justifyContent: 'center', opacity: count > 0 ? 1 : 0.35 }}>
        <Text variant="footnote" weight="semibold" style={{ color: palette.accent }}>Undo</Text>
      </PressableScale>
    </View>
  </View>;
});
