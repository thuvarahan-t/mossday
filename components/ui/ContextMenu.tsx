import { BlurView } from 'expo-blur';
import { Fragment, useCallback, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { durations, easing, scales } from '@/constants/motion';
import { useTheme } from '@/hooks/useTheme';
import { useWindowTopOffset } from '@/hooks/useWindowTopOffset';
import { animateTo } from '@/lib/animation';
import { haptics } from '@/lib/haptics';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { BlurTargetBoundary, useRootBlurTarget } from './glass/BlurTarget';
import { GlassSurface } from './glass/GlassSurface';

export type ContextMenuAction = {
  label: string;
  icon: IconName;
  destructive?: boolean;
  onPress: () => void;
};

export type ContextMenuProps = {
  actions: ContextMenuAction[];
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
};

type Frame = { x: number; y: number; width: number; height: number };

const MENU_WIDTH = 250;
const MENU_ROW_HEIGHT = 44;

/**
 * Long-press menu with the iOS context-menu feel: the app blurs, the pressed card lifts
 * and grows slightly, and the action list springs out beside it.
 */
export function ContextMenu({ actions, children, onPress, accessibilityLabel, style }: ContextMenuProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const windowTop = useWindowTopOffset();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const rootTarget = useRootBlurTarget();
  const anchor = useRef<ComponentRef<typeof View>>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  const progress = useSharedValue(0);

  const open = () => {
    anchor.current?.measureInWindow((x, y, width, height) => {
      haptics.tick();
      // The menu's modal window covers the whole screen, which may start above the app window.
      setFrame({ x, y: y + windowTop, width, height });
      progress.set(0);
      progress.set(animateTo(1, 'default', reduceMotion));
    });
  };

  const close = useCallback((after?: () => void) => {
    const finish = () => {
      setFrame(null);
      after?.();
    };
    progress.set(withTiming(0, { duration: durations.fast, easing: easing.standard }, (finished) => {
      if (finished) scheduleOnRN(finish);
    }));
  }, [progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, progress.get()) }));
  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 + (scales.contextMenuLift - 1) * progress.get() }],
  }));
  const menuStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.get()),
    transform: [{ scale: reduceMotion ? 1 : 0.6 + 0.4 * progress.get() }],
  }));

  const menuHeight = actions.length * MENU_ROW_HEIGHT;
  const gap = theme.spacing.md;
  const fitsBelow = frame ? frame.y + frame.height + gap + menuHeight < screenHeight - insets.bottom - gap : true;
  const menuTop = frame ? (fitsBelow ? frame.y + frame.height + gap : frame.y - gap - menuHeight) : 0;
  const alignRight = frame ? frame.x + frame.width / 2 > screenWidth / 2 : false;
  const menuLeft = frame
    ? Math.min(Math.max(theme.sizes.screenInset, alignRight ? frame.x + frame.width - MENU_WIDTH : frame.x),
      screenWidth - theme.sizes.screenInset - MENU_WIDTH)
    : 0;

  return (
    <>
      <PressableScale
        ref={anchor}
        style={style}
        onPress={onPress}
        onLongPress={open}
        delayLongPress={350}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Long press for more actions"
        accessibilityActions={actions.map((action) => ({ name: action.label, label: action.label }))}
        onAccessibilityAction={(event) => actions.find((action) => action.label === event.nativeEvent.actionName)?.onPress()}
      >
        {children}
      </PressableScale>

      {frame && (
        <Modal transparent visible statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={() => close()}>
          <BlurTargetBoundary>
            <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
              <BlurView
                blurTarget={rootTarget ?? undefined}
                blurMethod="dimezisBlurViewSdk31Plus"
                intensity={40}
                tint={theme.isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
              <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.menuScrim }]}
                onPress={() => close()} accessibilityRole="button" accessibilityLabel="Close menu" />
            </Animated.View>

            <Animated.View
              pointerEvents="none"
              style={[styles.absolute, { left: frame.x, top: frame.y, width: frame.width, boxShadow: theme.shadows.lifted, borderRadius: theme.radii.card }, liftStyle]}
            >
              {children}
            </Animated.View>

            <Animated.View
              style={[
                styles.absolute,
                { top: menuTop, left: menuLeft, width: MENU_WIDTH, transformOrigin: `${alignRight ? 'right' : 'left'} ${fitsBelow ? 'top' : 'bottom'}` },
                menuStyle,
              ]}
            >
              <GlassSurface radius={theme.radii.lg}>
                {actions.map((action, index) => (
                  <Fragment key={action.label}>
                    {index > 0 && <View style={{ height: theme.sizes.hairline, backgroundColor: theme.colors.separator }} />}
                    <PressableScale
                      pressedScale={1}
                      accessibilityLabel={action.label}
                      onPress={() => close(action.onPress)}
                      style={[styles.menuRow, { height: MENU_ROW_HEIGHT, paddingHorizontal: theme.spacing.lg }]}
                    >
                      <Text color={action.destructive ? 'dangerText' : 'label'}>{action.label}</Text>
                      <Icon name={action.icon} size={theme.sizes.iconSmall + 2} color={action.destructive ? 'dangerText' : 'label'} />
                    </PressableScale>
                  </Fragment>
                ))}
              </GlassSurface>
            </Animated.View>
          </BlurTargetBoundary>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  absolute: { position: 'absolute' },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
