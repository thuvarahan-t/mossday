import { router } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { Keyboard, StyleSheet, TextInput, View, type RefreshControlProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarInset } from '@/hooks/useTabBarInset';
import { useTheme } from '@/hooks/useTheme';
import { useWindowTopOffset } from '@/hooks/useWindowTopOffset';
import { Icon } from './Icon';
import { Text } from './Text';
import { BlurTargetContent, BlurTargetProvider } from './glass/BlurTarget';
import { GlassButton } from './glass/GlassButton';

export type LargeTitleScreenProps = {
  title: string; subtitle?: string;
  /** Fixed actions beside the screen title. */
  titleAccessory?: ReactNode;
  showBack?: boolean; onBack?: () => void; headerRight?: ReactNode;
  children: ReactNode; bottomInset?: 'tabBar' | 'safeArea';
  contentContainerStyle?: StyleProp<ViewStyle>; refreshControl?: React.ReactElement<RefreshControlProps>;
  keyboardShouldPersistTaps?: 'always' | 'handled' | 'never';
};

/** The header lives outside the scroll view, so its title and actions never jump or disappear. */
export function LargeTitleScreen({
  title, subtitle, titleAccessory, showBack, onBack = router.back, headerRight, children, bottomInset = 'tabBar',
  contentContainerStyle, refreshControl, keyboardShouldPersistTaps = 'handled',
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
  return <BlurTargetProvider>
    <View style={[styles.fill, { backgroundColor: theme.colors.groupedBackground }]}>
      <View style={{ paddingTop: insets.top + theme.spacing.sm, paddingBottom: theme.spacing.sm, paddingHorizontal: theme.sizes.screenInset,
        borderBottomWidth: theme.sizes.hairline, borderBottomColor: theme.colors.separator }}>
        <View style={[styles.row, { gap: theme.spacing.sm, minHeight: theme.sizes.circleButton }]}>
          {showBack && <GlassButton accessibilityLabel="Back" haptic="tap" onPress={onBack}><Icon name="chevronLeft" /></GlassButton>}
          <Text variant="title2" weight="bold" accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1, minWidth: 0 }}>{title}</Text>
          <View style={[styles.row, { gap: theme.spacing.sm }]}>{titleAccessory}{headerRight}</View>
        </View>
        {subtitle ? <Text variant="footnote" color="secondaryLabel" style={{ marginTop: theme.spacing.xs }}>{subtitle}</Text> : null}
      </View>
      <BlurTargetContent style={styles.fill}>
        <Animated.ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={16} refreshControl={refreshControl}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps} keyboardDismissMode="on-drag"
          contentContainerStyle={[{ paddingTop: theme.spacing.md, paddingBottom: bottomInset === 'tabBar' ? tabBarInset : insets.bottom + theme.spacing.xxl }, contentContainerStyle]}>
          {children}
          <Animated.View style={keyboardSpace} />
        </Animated.ScrollView>
      </BlurTargetContent>
    </View>
  </BlurTargetProvider>;
}
const styles = StyleSheet.create({ fill: { flex: 1 }, row: { flexDirection: 'row', alignItems: 'center' } });
