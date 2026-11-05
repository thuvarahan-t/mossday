import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, StyleSheet, TextInput, View, type RefreshControlProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Extrapolation, interpolate, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useTabBarInset } from '@/hooks/useTabBarInset';
import { useTheme } from '@/hooks/useTheme';
import { useWindowTopOffset } from '@/hooks/useWindowTopOffset';
import { FloatingAddButton, FLOATING_ADD_SIZE, type FloatingAddAction } from '@/components/navigation/FloatingAddButton';
import { useSceneMotionStyles } from '@/components/navigation/SceneMotion';
import { Icon } from './Icon';
import { Text } from './Text';
import { DragScrollContext } from './DragScrollContext';
import { BlurTargetBoundary, BlurTargetContent, BlurTargetProvider } from './glass/BlurTarget';
import { GlassButton } from './glass/GlassButton';
import { GlassSurface, OnGlassBar } from './glass/GlassSurface';

export type LargeTitleScreenProps = {
  title: string; subtitle?: string;
  /** Shown before the title, e.g. the habit's emoji on its detail screen. */
  titleLeading?: ReactNode;
  /** Fixed actions beside the screen title. */
  titleAccessory?: ReactNode;
  /** Controls that stay visible below the title while the page scrolls. */
  fixedContent?: ReactNode;
  floatingAdd?: FloatingAddAction;
  /** Wraps the page's scroll view, so a swipe works anywhere on it, including its blank space. */
  swipeArea?: (page: ReactNode) => ReactNode;
  showBack?: boolean; onBack?: () => void; headerRight?: ReactNode;
  children: ReactNode; bottomInset?: 'tabBar' | 'safeArea';
  contentContainerStyle?: StyleProp<ViewStyle>; refreshControl?: React.ReactElement<RefreshControlProps>;
  keyboardShouldPersistTaps?: 'always' | 'handled' | 'never';
  /** Pause scrolling while a child owns a drag gesture. */
  scrollEnabled?: boolean;
};

/**
 * The header floats over the scroll view, so its title and actions never move. Content
 * scrolls beneath it, and a glass bar (blur + tint + hairline) fades in once it does. A tab
 * switch moves the page's content only; the actions and floating add button stay still.
 */
export function LargeTitleScreen({
  title, subtitle, titleLeading, titleAccessory, fixedContent, floatingAdd, swipeArea = (page) => page, showBack, onBack = router.back, headerRight, children, bottomInset = 'tabBar',
  contentContainerStyle, refreshControl, keyboardShouldPersistTaps = 'handled', scrollEnabled = true,
}: LargeTitleScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scene = useSceneMotionStyles();
  const tabBarInset = useTabBarInset();
  const scrollY = useSharedValue(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const viewportHeight = useSharedValue(0);
  const scrollContentHeight = useSharedValue(0);
  const dragTop = useSharedValue(0);
  const dragBottom = useSharedValue(0);
  const dragMax = useSharedValue(0);
  const keyboardHeight = useKeyboardHeight();
  const windowTop = useWindowTopOffset();
  const keyboardSpace = useAnimatedStyle(() => ({ height: keyboardHeight.get() }));
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', (event) => {
      TextInput.State.currentlyFocusedInput()?.measureInWindow((_x, y, _width, height) => {
        const overlap = y + windowTop + height + theme.spacing.xl - event.endCoordinates.screenY;
        if (overlap > 0) scrollRef.current?.scrollTo({ y: scrollY.get() + overlap, animated: true });
      });
    });
    // A field whose keyboard was dismissed (tap outside, Android back) stays focused with a
    // blinking cursor; blur it so editing visibly ends. Autosaving fields keep their text.
    const hidden = Keyboard.addListener('keyboardDidHide', () => TextInput.State.currentlyFocusedInput()?.blur());
    return () => { subscription.remove(); hidden.remove(); };
  }, [scrollRef, scrollY, theme.spacing.xl, windowTop]);
  const onScroll = useAnimatedScrollHandler((event) => { scrollY.set(event.contentOffset.y); });
  // Estimated until the header measures itself, so the first frame is already close.
  const [headerHeight, setHeaderHeight] = useState(insets.top + theme.spacing.sm * 2 + theme.sizes.circleButton);
  // A page only scrolls as far as it needs: its last row clears the tab bar and sits level with
  // the middle of the add button, which covers nothing but the row's far edge.
  const glassStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.get(), [0, theme.spacing.lg], [0, 1], Extrapolation.CLAMP) }));
  return <BlurTargetProvider>
    <View style={[styles.fill, { backgroundColor: theme.colors.groupedBackground }]}>
      <BlurTargetContent style={styles.fill}>
        <Animated.View style={[styles.fill, scene.content]}>{swipeArea(<Animated.ScrollView ref={scrollRef} onScroll={onScroll} scrollEnabled={scrollEnabled} scrollEventThrottle={16} refreshControl={refreshControl}
          onLayout={(event) => {
            viewportHeight.set(event.nativeEvent.layout.height);
            dragMax.set(Math.max(0, scrollContentHeight.get() - viewportHeight.get()));
            scrollRef.current?.measureInWindow((_x, y, _width, height) => {
              dragTop.set(y + windowTop + headerHeight);
              dragBottom.set(y + windowTop + height - (bottomInset === 'tabBar' ? tabBarInset : insets.bottom));
            });
          }}
          onContentSizeChange={(_width, height) => {
            scrollContentHeight.set(height);
            dragMax.set(Math.max(0, height - viewportHeight.get()));
          }}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps} keyboardDismissMode="on-drag" scrollIndicatorInsets={{ top: headerHeight }}
          contentContainerStyle={[{ paddingTop: headerHeight + theme.spacing.md,
            paddingBottom: (bottomInset === 'tabBar' ? tabBarInset : insets.bottom + theme.spacing.xxl) + (floatingAdd ? FLOATING_ADD_SIZE / 2 : 0) }, contentContainerStyle]}>
          <DragScrollContext.Provider value={{ ref: scrollRef, offset: scrollY, top: dragTop, bottom: dragBottom, max: dragMax }}>{children}</DragScrollContext.Provider>
          <Animated.View style={keyboardSpace} />
        </Animated.ScrollView>)}</Animated.View>
      </BlurTargetContent>
      {floatingAdd && <FloatingAddButton {...floatingAdd} />}
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
              {titleLeading}
              <Animated.View style={[{ flex: 1, minWidth: 0 }, scene.fade]}>
                <Text variant="title2" weight="bold" accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
              </Animated.View>
              <View style={[styles.row, { gap: theme.spacing.sm }]}>{titleAccessory}{headerRight}</View>
            </View>
            {subtitle ? <Animated.View style={scene.fade}><Text variant="footnote" color="secondaryLabel" style={{ marginTop: theme.spacing.xs }}>{subtitle}</Text></Animated.View> : null}
          </View>
          {fixedContent ? <Animated.View style={scene.content}>{fixedContent}</Animated.View> : null}
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
