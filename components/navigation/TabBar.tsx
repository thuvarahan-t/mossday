import type { TabTriggerSlotProps } from 'expo-router/ui';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle, useReducedMotion, useSharedValue, withSequence,
} from 'react-native-reanimated';
import { scales } from '@/constants/motion';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { GlassSurface } from '@/components/ui/glass/GlassSurface';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { haptics } from '@/lib/haptics';

const TAB_BAR_PADDING = 4;

type TabBarContextValue = { onFocusIndex: (index: number) => void };
const TabBarContext = createContext<TabBarContextValue | null>(null);

/**
 * Floating glass pill (design "Component · Floating glass tab bar"). The highlight behind
 * the active item slides between items with `spring.snappy`.
 */
export function TabBar({ children, itemCount }: { children: ReactNode; itemCount: number }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [itemWidth, setItemWidth] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const offset = useSharedValue(0);
  const context = useMemo(() => ({ onFocusIndex: setFocusedIndex }), []);

  useEffect(() => {
    offset.set(animateTo(focusedIndex * itemWidth, 'snappy', reduceMotion));
  }, [focusedIndex, itemWidth, offset, reduceMotion]);

  const highlightStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  const onLayout = (event: LayoutChangeEvent) => {
    setItemWidth((event.nativeEvent.layout.width - TAB_BAR_PADDING * 2) / itemCount);
  };

  return (
    <GlassSurface style={styles.flex} contentStyle={{ height: theme.sizes.tabBarHeight }}>
      <View style={[styles.row, { padding: TAB_BAR_PADDING }]} onLayout={onLayout} accessibilityRole="tablist">
        {itemWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.highlight,
              {
                left: TAB_BAR_PADDING,
                top: (theme.sizes.tabBarHeight - theme.sizes.tabItemHighlight) / 2,
                width: itemWidth,
                height: theme.sizes.tabItemHighlight,
                borderRadius: theme.radii.pill,
                backgroundColor: theme.colors.fill,
              },
              highlightStyle,
            ]}
          />
        )}
        <TabBarContext.Provider value={context}>{children}</TabBarContext.Provider>
      </View>
    </GlassSurface>
  );
}

export type TabBarItemProps = TabTriggerSlotProps & { index: number; title: string; icon: IconName; active?: boolean };

/** Receives `isFocused` / `onPress` from `<TabTrigger asChild>`. */
export function TabBarItem({ index, title, icon, isFocused: triggerFocused = false, active, onPress, onLongPress }: TabBarItemProps) {
  const isFocused = active ?? triggerFocused;
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const tabBar = useContext(TabBarContext);
  const iconScale = useSharedValue(1);

  useEffect(() => {
    if (!isFocused) return;
    tabBar?.onFocusIndex(index);
    if (!reduceMotion) {
      iconScale.set(withSequence(
        animateTo(scales.tabIconBounce, 'bouncy', false),
        animateTo(1, 'bouncy', false),
      ));
    }
  }, [iconScale, index, isFocused, reduceMotion, tabBar]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.get() }] }));

  return (
    <PressableScale
      accessibilityRole="tab"
      accessibilityLabel={title}
      accessibilityState={{ selected: isFocused }}
      style={styles.item}
      onPress={(event) => {
        if (!isFocused) haptics.selection();
        onPress?.(event);
      }}
      onLongPress={onLongPress}
    >
      <Animated.View style={iconStyle}>
        <Icon
          name={icon}
          size={theme.sizes.iconLarge}
          color={isFocused ? 'accent' : 'label'}
          fill={isFocused ? theme.colors.accentFill : undefined}
        />
      </Animated.View>
      <Text variant="caption2" weight={isFocused ? 'semibold' : 'medium'} color={isFocused ? 'accent' : 'label'} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {title}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flex: 1, flexDirection: 'row' },
  highlight: { position: 'absolute', borderCurve: 'continuous' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
});
