import { TabSlot, type TabSlotProps } from 'expo-router/ui';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Screen } from 'react-native-screens';
import { durations, easing } from '@/constants/motion';

type RenderFn = NonNullable<TabSlotProps['renderFn']>;

function FadeIn({ isFocused, children }: { isFocused: boolean; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (!isFocused) return;
    opacity.set(0);
    opacity.set(withTiming(1, { duration: reduceMotion ? durations.fast : durations.normal, easing: easing.standard }));
  }, [isFocused, opacity, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}

/** Same lazy behaviour as Expo Router's default slot, plus a cross-fade when a tab gains focus. */
const renderFadingScene: RenderFn = (descriptor, { isFocused, loaded, detachInactiveScreens }) => {
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
      <FadeIn isFocused={isFocused}>{descriptor.render()}</FadeIn>
    </Screen>
  );
};

export function FadeTabSlot() {
  return <TabSlot renderFn={renderFadingScene} />;
}
