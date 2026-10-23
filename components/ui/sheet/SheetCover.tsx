import { createContext, useContext, type ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scales } from '@/constants/motion';
import { useTheme } from '@/hooks/useTheme';

/**
 * iOS card stack: when a large sheet opens, whatever is underneath (the app, or a parent
 * sheet) shrinks slightly and rounds its corners. Each presenter provides a 0→1 "cover"
 * value; the sheet it presents drives it.
 */
const SheetCoverContext = createContext<SharedValue<number> | null>(null);

export function useSheetCover() {
  return useContext(SheetCoverContext);
}

export function SheetCoverProvider({ cover, children }: { cover: SharedValue<number>; children: ReactNode }) {
  return <SheetCoverContext.Provider value={cover}>{children}</SheetCoverContext.Provider>;
}

/** Wraps content that should recede while a sheet it presents is open. */
export function SheetCoverable({ cover, children, style, radius }: {
  cover: SharedValue<number>; children: ReactNode; style?: StyleProp<ViewStyle>; radius: number;
}) {
  const reduced = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => {
    const progress = cover.get();
    return {
      transform: [{ scale: reduced ? 1 : interpolate(progress, [0, 1], [1, scales.sheetBackdrop]) }],
      borderRadius: interpolate(progress, [0, 1], [0, radius]),
    };
  });
  return <Animated.View style={[styles.fill, styles.clip, style, animatedStyle]}>{children}</Animated.View>;
}

/** Root presenter: the whole app recedes over a black underlay. */
export function AppSheetCover({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const cover = useSharedValue(0);
  return (
    <SheetCoverProvider cover={cover}>
      <Animated.View style={[styles.fill, { backgroundColor: theme.colors.underlay }]}>
        <SheetCoverable cover={cover} radius={theme.radii.sheet} style={{ backgroundColor: theme.colors.groupedBackground }}>
          {children}
        </SheetCoverable>
      </Animated.View>
    </SheetCoverProvider>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 }, clip: { overflow: 'hidden' } });
