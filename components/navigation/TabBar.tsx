import type { TabTriggerSlotProps } from 'expo-router/ui';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { durations, scales } from '@/constants/motion';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { GlassSurface } from '@/components/ui/glass/GlassSurface';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { haptics } from '@/lib/haptics';

const TAB_BAR_PADDING = 6;
/** While sliding to a tab the lens stretches like a drop of liquid, then settles. */
const LENS_STRETCH = 1.14;
/** Held under a finger, the lens swells slightly, as if lifted off the bar. */
const LENS_LIFT = 1.1;

type TabBarContextValue = { onFocusIndex: (index: number) => void };
const TabBarContext = createContext<TabBarContextValue | null>(null);

/**
 * Floating liquid-glass tab bar: a blurred pill with a specular sheen and a glass lens on
 * the focused tab. Tapping a tab slides the lens there; dragging along the bar carries the
 * lens under the finger (with a tick per tab crossed) and releasing opens the tab below it.
 */
export function TabBar({ children, itemCount, onSelect }: {
  children: ReactNode; itemCount: number; onSelect: (index: number) => void;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [innerWidth, setInnerWidth] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const slotWidth = innerWidth / itemCount;
  const lensX = useSharedValue(0);
  const stretch = useSharedValue(1);
  const lift = useSharedValue(1);
  const hovered = useSharedValue(0);
  const context = useMemo(() => ({ onFocusIndex: setFocusedIndex }), []);

  useEffect(() => {
    if (!slotWidth) return;
    lensX.set(animateTo(focusedIndex * slotWidth, 'snappy', reduceMotion));
    if (!reduceMotion) {
      stretch.set(withSequence(withTiming(LENS_STRETCH, { duration: durations.fast }), animateTo(1, 'bouncy', false)));
    }
  }, [focusedIndex, lensX, reduceMotion, slotWidth, stretch]);

  const pan = usePanGesture({
    enabled: slotWidth > 0,
    activeOffsetX: [-8, 8],
    failOffsetY: [-16, 16],
    onActivate: () => {
      hovered.set(Math.round(lensX.get() / slotWidth));
      lift.set(animateTo(LENS_LIFT, 'snappy', reduceMotion));
    },
    onUpdate: (event) => {
      const x = Math.min(Math.max(event.x - TAB_BAR_PADDING - slotWidth / 2, 0), slotWidth * (itemCount - 1));
      lensX.set(x);
      const index = Math.round(x / slotWidth);
      if (index !== hovered.get()) {
        hovered.set(index);
        scheduleOnRN(haptics.selection);
      }
    },
    onDeactivate: () => {
      const index = hovered.get();
      lift.set(animateTo(1, 'bouncy', reduceMotion));
      lensX.set(animateTo(index * slotWidth, 'snappy', reduceMotion));
      scheduleOnRN(onSelect, index);
    },
  });

  const lensStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: lensX.get() },
      { scaleX: stretch.get() * lift.get() },
      { scaleY: (2 - stretch.get()) * lift.get() },
    ],
  }));

  const onLayout = (event: LayoutChangeEvent) => setInnerWidth(event.nativeEvent.layout.width - TAB_BAR_PADDING * 2);
  const lensHeight = theme.sizes.tabItemHighlight;

  return (
    <GlassSurface sheen style={styles.fill} contentStyle={{ height: theme.sizes.tabBarHeight }}>
      <GestureDetector gesture={pan}>
        <View style={[styles.row, { padding: TAB_BAR_PADDING }]} onLayout={onLayout} accessibilityRole="tablist">
          {slotWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.lens,
                {
                  left: TAB_BAR_PADDING,
                  top: (theme.sizes.tabBarHeight - lensHeight) / 2,
                  width: slotWidth,
                  height: lensHeight,
                  borderRadius: theme.radii.pill,
                  backgroundColor: theme.colors.glassLens,
                  borderColor: theme.colors.glassRim,
                  borderWidth: theme.sizes.hairline * 2,
                  boxShadow: theme.shadows.raised,
                },
                lensStyle,
              ]}
            />
          )}
          <TabBarContext.Provider value={context}>{children}</TabBarContext.Provider>
        </View>
      </GestureDetector>
    </GlassSurface>
  );
}

export type TabBarItemProps = TabTriggerSlotProps & {
  index: number; title: string; icon: IconName; active?: boolean;
  /** Home tab in the middle: its icon sits on a small green disc so it reads as the centre. */
  prominent?: boolean;
};

/** Receives `isFocused` / `onPress` from `<TabTrigger asChild>`. */
export function TabBarItem({ index, title, icon, isFocused: triggerFocused = false, active, prominent, onPress, onLongPress }: TabBarItemProps) {
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
      <Animated.View style={[iconStyle, prominent && [styles.disc, {
        width: theme.sizes.tabProminentIcon, height: theme.sizes.tabProminentIcon, borderRadius: theme.radii.pill, backgroundColor: theme.colors.accent,
        // Overhangs the icon row so all labels stay on one baseline.
        marginVertical: (theme.sizes.icon - theme.sizes.tabProminentIcon) / 2,
      }]]}>
        <Icon
          name={icon}
          size={prominent ? theme.sizes.iconSmall + 2 : theme.sizes.icon}
          color={prominent ? 'onTile' : isFocused ? 'accent' : 'secondaryLabel'}
          strokeWidth={isFocused || prominent ? 2.3 : 2}
          fill={isFocused && !prominent ? theme.colors.accentFill : undefined}
        />
      </Animated.View>
      <Text variant="caption2" weight={isFocused ? 'semibold' : 'medium'} color={isFocused ? 'accent' : 'secondaryLabel'}
        numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {title}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flex: 1, flexDirection: 'row' },
  lens: { position: 'absolute', borderCurve: 'continuous' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  disc: { borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
});
