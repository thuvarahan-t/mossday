import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { durations, easing, gestures } from '@/constants/motion';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { haptics } from '@/lib/haptics';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type SwipeableRowProps = {
  children: ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
  enabled?: boolean;
};

/**
 * iOS Mail-style swipe-to-delete: drag left to reveal a red Delete action; past the action
 * the row follows the finger with rubber-band resistance; a long swipe deletes outright.
 */
export function SwipeableRow({ children, onDelete, deleteLabel = 'Delete', enabled = true }: SwipeableRowProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const translateX = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const actionWidth = gestures.swipeActionWidth;

  const commitDelete = () => {
    haptics.warning();
    onDelete();
  };

  const swipeAway = () => {
    'worklet';
    translateX.set(withTiming(-width, { duration: durations.fast, easing: easing.standard }, (finished) => {
      if (finished) scheduleOnRN(commitDelete);
    }));
  };

  const pan = usePanGesture({
    enabled,
    activeOffsetX: [-12, 12],
    failOffsetY: [-10, 10],
    onBegin: () => {
      dragStart.set(translateX.get());
    },
    onUpdate: (event) => {
      const raw = Math.min(0, dragStart.get() + event.translationX);
      const overshoot = -raw - actionWidth;
      translateX.set(overshoot > 0 ? -(actionWidth + overshoot * gestures.rubberBand) : raw);
    },
    onDeactivate: (event) => {
      const distance = -(dragStart.get() + event.translationX);
      if (width > 0 && distance > width * gestures.fullSwipeFraction) {
        swipeAway();
        return;
      }
      const open = distance > actionWidth / 2 || event.velocityX < -gestures.dismissVelocity;
      translateX.set(animateTo(open ? -actionWidth : 0, 'snappy', reduceMotion));
    },
  });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.get() }] }));
  const actionStyle = useAnimatedStyle(() => ({ width: Math.max(0, -translateX.get()) }));

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout} style={styles.clip}>
      <Animated.View style={[styles.action, { backgroundColor: theme.colors.danger }, actionStyle]}>
        <PressableScale
          accessibilityLabel={deleteLabel}
          onPress={swipeAway}
          style={[styles.actionButton, { minWidth: actionWidth }]}
        >
          <Text variant="headline" color="onDanger" numberOfLines={1}>
            {deleteLabel}
          </Text>
        </PressableScale>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[{ backgroundColor: theme.colors.card }, rowStyle]}
          accessibilityActions={[{ name: 'delete', label: deleteLabel }]}
          onAccessibilityAction={(event) => { if (event.nativeEvent.actionName === 'delete') commitDelete(); }}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  action: { position: 'absolute', top: 0, bottom: 0, right: 0, alignItems: 'flex-start', justifyContent: 'center' },
  actionButton: { flex: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
});
