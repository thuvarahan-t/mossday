import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, StyleSheet, TextInput, View, type LayoutChangeEvent, type RefreshControlProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation, interpolate, useAnimatedKeyboard, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarInset } from '@/hooks/useTabBarInset';
import { useTheme } from '@/hooks/useTheme';
import { useWindowTopOffset } from '@/hooks/useWindowTopOffset';
import { Icon } from './Icon';
import { Text } from './Text';
import { BlurTargetContent, BlurTargetProvider } from './glass/BlurTarget';
import { GlassButton } from './glass/GlassButton';
import { GlassSurface } from './glass/GlassSurface';

export type LargeTitleScreenProps = {
  title: string;
  subtitle?: string;
  /** Control beside the large title that scrolls with it (Today's gear, Diary's calendar). */
  titleAccessory?: ReactNode;
  /** Pushed screens: shows the glass back button and reserves a nav bar row. */
  showBack?: boolean;
  /** Back action for in-screen modes (Diary calendar); defaults to popping the route. */
  onBack?: () => void;
  /** Fixed controls on the right of the nav bar (Edit, pin/share). */
  headerRight?: ReactNode;
  /** Content directly under the title (segmented control, search) that scrolls with it. */
  children: ReactNode;
  /** Space below content: clears the floating tab bar on tab screens. */
  bottomInset?: 'tabBar' | 'safeArea';
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  keyboardShouldPersistTaps?: 'always' | 'handled' | 'never';
};

const NAV_BAR_HEIGHT = 44;

/**
 * iOS large-title screen. The 34 pt title scrolls away and a small centred title fades in
 * on a glass nav bar that blurs the content scrolling beneath it. The fade is driven by
 * the scroll position on the UI thread, so it tracks the finger exactly.
 */
export function LargeTitleScreen({
  title, subtitle, titleAccessory, showBack, onBack = router.back, headerRight, children, bottomInset = 'tabBar',
  contentContainerStyle, refreshControl, keyboardShouldPersistTaps = 'handled',
}: LargeTitleScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const scrollY = useSharedValue(0);
  const [titleBottom, setTitleBottom] = useState(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const keyboard = useAnimatedKeyboard();
  const windowTop = useWindowTopOffset();
  // Room to scroll content above the keyboard; the window is not always resized for it.
  const keyboardSpace = useAnimatedStyle(() => ({ height: keyboard.height.get() }));

  // Brings the focused field (e.g. the diary journal) above the keyboard once it is shown.
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', (event) => {
      TextInput.State.currentlyFocusedInput()?.measureInWindow((_x, y, _width, height) => {
        const overlap = y + windowTop + height + theme.spacing.xl - event.endCoordinates.screenY;
        if (overlap > 0) scrollRef.current?.scrollTo({ y: scrollY.get() + overlap, animated: true });
      });
    });
    return () => subscription.remove();
  }, [scrollRef, scrollY, theme.spacing.xl, windowTop]);

  const hasNavRow = showBack || !!headerRight;
  const navBarHeight = insets.top + NAV_BAR_HEIGHT;
  const contentTop = hasNavRow ? navBarHeight : insets.top + theme.spacing.md;

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });

  // Collapse happens while the large title passes under the nav bar.
  const collapseStart = Math.max(0, titleBottom - navBarHeight - theme.spacing.xl);
  const collapseEnd = Math.max(1, titleBottom - navBarHeight);

  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [collapseStart, collapseEnd], [0, 1], Extrapolation.CLAMP),
  }));
  const smallTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [collapseEnd - theme.spacing.sm, collapseEnd + theme.spacing.sm], [0, 1], Extrapolation.CLAMP),
  }));

  const onTitleLayout = (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setTitleBottom(y + height);
  };

  return (
    <BlurTargetProvider>
      <View style={[styles.fill, { backgroundColor: theme.colors.groupedBackground }]}>
        <BlurTargetContent style={styles.fill}>
          <Animated.ScrollView
            ref={scrollRef}
            onScroll={onScroll}
            scrollEventThrottle={16}
            refreshControl={refreshControl}
            keyboardShouldPersistTaps={keyboardShouldPersistTaps}
            keyboardDismissMode="on-drag"
            contentContainerStyle={[
              {
                paddingTop: contentTop,
                paddingBottom: bottomInset === 'tabBar' ? tabBarInset : insets.bottom + theme.spacing.xxl,
              },
              contentContainerStyle,
            ]}
          >
            <View
              onLayout={onTitleLayout}
              style={[styles.titleRow, { paddingHorizontal: theme.sizes.titleInset, paddingBottom: theme.spacing.lg, gap: theme.spacing.md }]}
            >
              <View style={styles.fill}>
                <Text variant="largeTitle" accessibilityRole="header">{title}</Text>
                {subtitle ? <Text color="secondaryLabel">{subtitle}</Text> : null}
              </View>
              {titleAccessory}
            </View>
            {children}
            <Animated.View style={keyboardSpace} />
          </Animated.ScrollView>
        </BlurTargetContent>

        <View pointerEvents="box-none" style={[styles.navBar, { height: navBarHeight }]}>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, barStyle]}>
            <GlassSurface radius={0} flat style={styles.fill} />
            <View style={[styles.separator, { height: theme.sizes.hairline, backgroundColor: theme.colors.separator }]} />
          </Animated.View>
          <View
            pointerEvents="box-none"
            style={[styles.navRow, { top: insets.top, height: NAV_BAR_HEIGHT, paddingHorizontal: theme.sizes.screenInset }]}
          >
            <View style={styles.navSide}>
              {showBack && (
                <GlassButton accessibilityLabel="Back" haptic="tap" onPress={onBack}>
                  <Icon name="chevronLeft" size={theme.sizes.iconLarge} />
                </GlassButton>
              )}
            </View>
            <Animated.View pointerEvents="none" style={[styles.smallTitle, smallTitleStyle]}>
              <Text variant="headline" numberOfLines={1}>{title}</Text>
            </Animated.View>
            <View style={[styles.navSide, styles.navRight]}>{headerRight}</View>
          </View>
        </View>
      </View>
    </BlurTargetProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  navBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  separator: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  navRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  navSide: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  navRight: { justifyContent: 'flex-end' },
  smallTitle: { flex: 2, alignItems: 'center' },
});
