import { TabSlot, type TabSlotProps } from 'expo-router/ui';
import { usePathname } from 'expo-router';
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Screen } from 'react-native-screens';
import { useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { durations, easing } from '@/constants/motion';
import { animateTo } from '@/lib/animation';
import { SceneMotionContext } from './SceneMotion';
import { tabs } from './tabs';

type RenderFn = NonNullable<TabSlotProps['renderFn']>;
/** A hint of direction, not a page sliding across: tab bars should feel almost instant. */
const SCENE_TRAVEL = 0.06;

/**
 * Expo Router's lazy tab slot with scenes layered on top of each other. Tabs switch
 * with a directional slide and fade on focus, which each screen applies to its own content
 * (see `useSceneMotionStyles`) so its fixed controls stay put. Hidden scenes keep their state.
 */
function SceneTransition({ focused, direction, children }: { focused: boolean; direction: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const offset = useSharedValue(0);
  const opacity = useSharedValue(1);
  const entries = useSharedValue(0);
  const visited = useRef(false);
  const wasFocused = useRef(false);
  useLayoutEffect(() => {
    if (!focused) { wasFocused.current = false; return; }
    if (wasFocused.current) return;
    wasFocused.current = true;
    entries.set(entries.get() + 1);
    // Leave the first screen steady; later focuses enter from their side of the tab bar.
    if (direction !== 0 || visited.current) {
      offset.set(reduced ? 0 : direction * width * SCENE_TRAVEL);
      opacity.set(reduced ? 1 : 0.6);
      offset.set(animateTo(0, 'gentle', reduced));
      opacity.set(withTiming(1, { duration: reduced ? 0 : durations.fast, easing: easing.standard }));
    }
    visited.current = true;
  }, [focused, direction, reduced, width, offset, opacity, entries]);
  const motion = useMemo(() => ({ offset, opacity, entries }), [offset, opacity, entries]);
  return <SceneMotionContext.Provider value={motion}><View style={styles.fill}>{children}</View></SceneMotionContext.Provider>;
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
