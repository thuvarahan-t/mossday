import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, StyleSheet, TextInput, View, type RefreshControlProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation, interpolate, useAnimatedKeyboard, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarInset } from '@/hooks/useTabBarInset';
import { useTheme } from '@/hooks/useTheme';
import { useWindowTopOffset } from '@/hooks/useWindowTopOffset';
import { Icon } from './Icon';
import { Text } from './Text';
import { BlurTargetBoundary, BlurTargetContent, BlurTargetProvider } from './glass/BlurTarget';
import { GlassButton } from './glass/GlassButton';
import { GlassSurface, OnGlassBar } from './glass/GlassSurface';

export type LargeTitleScreenProps = {
  title: string; subtitle?: string;
  /** Fixed actions beside the screen title. */
  titleAccessory?: ReactNode;
  showBack?: boolean; onBack?: () => void; headerRight?: ReactNode;
  children: ReactNode; bottomInset?: 'tabBar' | 'safeArea';
  contentContainerStyle?: StyleProp<ViewStyle>; refreshControl?: React.ReactElement<RefreshControlProps>;
  keyboardShouldPersistTaps?: 'always' | 'handled' | 'never';
  /** Pause scrolling while a child owns a drag gesture. */
  scrollEnabled?: boolean;
};

/**
 * The header floats over the scroll view, so its title and actions never move. Content
 * scrolls beneath it, and a glass bar (blur + tint + hairline) fades in once it does.
 */
export function LargeTitleScreen({
  title, subtitle, titleAccessory, showBack, onBack = router.back, headerRight, children, bottomInset = 'tabBar',
  contentContainerStyle, refreshControl, keyboardShouldPersistTaps = 'handled', scrollEnabled = true,
}: LargeTitleScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const scrollY = useSharedValue(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const keyboard = useAnimatedKeyboard();
  const windowTop = useWindowTopOffset();
  const keyboardSpace = useAnimatedStyle(() => ({ height: keyboard.height.get() }));
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', (event) => {
      TextInput.State.currentlyFocusedInput()?.measureInWindow((_x, y, _width, height) => {
        const overlap = y + windowTop + height + theme.spacing.xl - event.endCoordinates.screenY;
        if (overlap > 0) scrollRef.current?.scrollTo({ y: scrollY.get() + overlap, animated: true });
      });
    });
    return () => subscription.remove();
  }, [scrollRef, scrollY, theme.spacing.xl, windowTop]);
  const onScroll = useAnimatedScrollHandler((event) => { scrollY.set(event.contentOffset.y); });
  // Estimated until the header measures itself, so the first frame is already close.
  const [headerHeight, setHeaderHeight] = useState(insets.top + theme.spacing.sm * 2 + theme.sizes.circleButton);
  const glassStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.get(), [0, theme.spacing.lg], [0, 1], Extrapolation.CLAMP) }));
  return <BlurTargetProvider>
    <View style={[styles.fill, { backgroundColor: theme.colors.groupedBackground }]}>
      <BlurTargetContent style={styles.fill}>
        <Animated.ScrollView ref={scrollRef} onScroll={onScroll} scrollEnabled={scrollEnabled} scrollEventThrottle={16} refreshControl={refreshControl}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps} keyboardDismissMode="on-drag" scrollIndicatorInsets={{ top: headerHeight }}
          contentContainerStyle={[{ paddingTop: headerHeight + theme.spacing.md, paddingBottom: bottomInset === 'tabBar' ? tabBarInset : insets.bottom + theme.spacing.xxl }, contentContainerStyle]}>
          {children}
          <Animated.View style={keyboardSpace} />
        </Animated.ScrollView>
      </BlurTargetContent>
      <View style={styles.header} onLayout={(event) => setHeaderHeight(Math.ceil(event.nativeEvent.layout.height))}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glassStyle]}>
          <GlassSurface material="bar" radius={0} flat style={styles.fill} />
          <View style={[styles.separator, { height: theme.sizes.hairline, backgroundColor: theme.colors.separator }]} />
        </Animated.View>
        {/* Controls on the bar use solid, shadowless glass: a second blur layer or a floating
            shadow on top of the bar each drew a grey box behind the action pill. */}
        <BlurTargetBoundary><OnGlassBar>
          <View style={{ paddingTop: insets.top + theme.spacing.sm, paddingBottom: theme.spacing.sm, paddingHorizontal: theme.sizes.screenInset }}>
            <View style={[styles.row, { gap: theme.spacing.sm, minHeight: theme.sizes.circleButton }]}>
              {showBack && <GlassButton accessibilityLabel="Back" haptic="tap" onPress={onBack}><Icon name="chevronLeft" /></GlassButton>}
              <Text variant="title2" weight="bold" accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1, minWidth: 0 }}>{title}</Text>
              <View style={[styles.row, { gap: theme.spacing.sm }]}>{titleAccessory}{headerRight}</View>
            </View>
            {subtitle ? <Text variant="footnote" color="secondaryLabel" style={{ marginTop: theme.spacing.xs }}>{subtitle}</Text> : null}
          </View>
        </OnGlassBar></BlurTargetBoundary>
      </View>
    </View>
  </BlurTargetProvider>;
}
const styles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  header: { position: 'absolute', top: 0, left: 0, right: 0 },
  separator: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
