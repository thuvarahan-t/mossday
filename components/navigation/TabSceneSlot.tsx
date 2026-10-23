import { TabSlot, type TabSlotProps } from 'expo-router/ui';
import { StyleSheet } from 'react-native';
import { Screen } from 'react-native-screens';

type RenderFn = NonNullable<TabSlotProps['renderFn']>;

/**
 * Expo Router's lazy tab slot with scenes layered on top of each other. Tabs switch
 * instantly, as on iOS; only the tab bar's lens moves.
 */
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
      {descriptor.render()}
    </Screen>
  );
};

export function TabSceneSlot() {
  return <TabSlot renderFn={renderScene} />;
}
