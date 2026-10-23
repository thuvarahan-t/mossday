import type { ReactNode } from 'react';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { animateTo } from '@/lib/animation';

/** Long-press and drag vertically; accessibility actions provide the same ordering controls. */
export function ReorderableRow({ children, onMove, label }: { children: ReactNode; onMove: (offset: number) => void; label: string }) {
  const reduced = useReducedMotion();
  const offset = useSharedValue(0);
  const height = useSharedValue(52);
  const gesture = usePanGesture({
    activateAfterLongPress: 350,
    onUpdate: (event) => { offset.set(event.translationY); },
    onDeactivate: (event) => {
      const slots = Math.round(event.translationY / height.get());
      if (slots) scheduleOnRN(onMove, slots);
    },
    onFinalize: () => { offset.set(animateTo(0, 'snappy', reduced)); },
  });
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: reduced ? 0 : offset.get() }], zIndex: offset.get() === 0 ? 0 : 1 }));
  return <GestureDetector gesture={gesture}>
    <Animated.View onLayout={(event) => height.set(Math.max(1, event.nativeEvent.layout.height))}
      entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} layout={reduced ? undefined : LinearTransition}
      accessibilityLabel={label} accessibilityActions={[{ name: 'moveUp', label: 'Move up' }, { name: 'moveDown', label: 'Move down' }]}
      onAccessibilityAction={(event) => onMove(event.nativeEvent.actionName === 'moveUp' ? -1 : 1)} style={style}>
      {children}
    </Animated.View>
  </GestureDetector>;
}
