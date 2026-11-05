import { TabSlot, type TabSlotProps } from 'expo-router/ui';
import { usePathname } from 'expo-router';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Screen } from 'react-native-screens';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { durations, easing } from '@/constants/motion';
import { animateTo } from '@/lib/animation';
import { tabs } from './tabs';

type RenderFn = NonNullable<TabSlotProps['renderFn']>;

/**
 * Expo Router's lazy tab slot with scenes layered on top of each other. Tabs switch
 * with a directional slide and fade on focus. Hidden scenes keep their state.
 */
function SceneTransition({ focused, direction, children }: { focused: boolean; direction: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const offset = useSharedValue(0);
  const opacity = useSharedValue(1);
  const visited = useRef(false);
  const wasFocused = useRef(false);
  useLayoutEffect(() => {
    if (!focused) { wasFocused.current = false; return; }
    if (wasFocused.current) return;
    wasFocused.current = true;
    // Leave the first screen steady; later focuses enter from their side of the tab bar.
    if (direction !== 0 || visited.current) {
      offset.set(reduced ? 0 : direction * width * 0.18);
      opacity.set(reduced ? 1 : 0.4);
      offset.set(animateTo(0, 'gentle', reduced));
      opacity.set(withTiming(1, { duration: reduced ? 0 : durations.normal, easing: easing.standard }));
    }
    visited.current = true;
  }, [focused, direction, reduced, width, offset, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ translateX: offset.get() }] }));
  return <Animated.View style={[styles.fill, style]}>{children}</Animated.View>;
}

export function TabSceneSlot() {
  const pathname = usePathname();
  const index = tabs.findIndex((tab) => tab.href === pathname);
  const [selection, setSelection] = useState({ index, direction: 0 });
  if (index !== selection.index) setSelection({ index, direction: Math.sign(index - selection.index) });
  const { direction } = selection;
  const renderScene: RenderFn = (descriptor, { isFocused, loaded, detachInactiveScreens }) => {
    if (!loaded && !isFocused) return null;
    return (
      <Screen
        key={descriptor.route.key}
        enabled={detachInactiveScreens}
        activityState={isFocused ? 2 : 0}
        freezeOnBlur={false}
        // Scenes overlap instead of stacking: on Android native screens ignore `display: none`,
        // so flex siblings would split the height between every visited tab.
        style={[StyleSheet.absoluteFill, { zIndex: isFocused ? 1 : 0, display: isFocused ? 'flex' : 'none' }]}
        pointerEvents={isFocused ? 'auto' : 'none'}
      >
        <SceneTransition focused={isFocused} direction={direction}>{descriptor.render()}</SceneTransition>
      </Screen>
    );
  };
  return <TabSlot renderFn={renderScene} />;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
