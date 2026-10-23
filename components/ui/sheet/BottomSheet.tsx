import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Keyboard, Modal, Platform, Pressable, StyleSheet, TextInput, View, useWindowDimensions, type LayoutChangeEvent,
} from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation, interpolate, useAnimatedReaction, useAnimatedStyle,
  ReduceMotion, useReducedMotion, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { durations, easing, gestures, spring } from '@/constants/motion';
import { useTheme } from '@/hooks/useTheme';
import { BlurTargetBoundary, useRootBlurTarget } from '../glass/BlurTarget';
import { GlassSurface } from '../glass/GlassSurface';
import { dockedKeyboardLift } from './keyboardDock';
import { SheetCoverable, SheetCoverProvider, useSheetCover } from './SheetCover';

/** `content` sizes to the children; `medium` is half the screen; `large` leaves the status bar. */
export type SheetDetent = 'content' | 'medium' | 'large';

export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Smallest first; the sheet opens at the first one. */
  detents?: SheetDetent[];
  /** `grouped` uses the grey grouped background (forms, lists of cards). */
  background?: 'plain' | 'grouped';
  /** Called after the close animation finishes. */
  onDismissed?: () => void;
  /** Rest the whole sheet on the keyboard (short forms), not just lift the focused field. */
  dockToKeyboard?: boolean;
};

const LARGE_TOP_GAP = 10;
/** Blur of the app behind an open sheet: enough to recede, not enough to lose context. */
const SCRIM_BLUR = 18;

/**
 * iOS-style sheet: grabber, detents, `spring.gentle` presentation, drag to dismiss with
 * velocity, dimmed background, and the presenter receding while a large detent is shown.
 * Rendered in a transparent `Modal` so it always covers the tab bar (UI-ANALYSIS R12).
 */
export function BottomSheet({
  visible, onClose, children, detents = ['large'], background = 'plain', onDismissed, dockToKeyboard = false,
}: BottomSheetProps) {
  const theme = useTheme();
  const contextInsets = useSafeAreaInsets();
  // Sheets nested in another modal window get zero insets; fall back to the device's.
  const insets = {
    top: Math.max(contextInsets.top, initialWindowMetrics?.insets.top ?? 0),
    bottom: Math.max(contextInsets.bottom, initialWindowMetrics?.insets.bottom ?? 0),
  };
  const window = useWindowDimensions();
  // Android reports the window without the system bars, but this modal draws under them;
  // size detents from the modal's measured height so large sheets fill the real screen.
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const screenHeight = measuredHeight || window.height;
  const reduceMotion = useReducedMotion();
  const parentCover = useSheetCover();
  const rootTarget = useRootBlurTarget();
  // Forms can unmount after saving. Never leave their presenter scaled down.
  useEffect(() => () => { parentCover?.set(0); }, [parentCover]);
  const [mounted, setMounted] = useState(visible);
  const [contentHeight, setContentHeight] = useState(0);

  const largeHeight = screenHeight - insets.top - LARGE_TOP_GAP;
  const mediumHeight = Math.round(screenHeight * 0.5);
  const heightOf = useCallback((detent: SheetDetent) => {
    if (detent === 'large') return largeHeight;
    if (detent === 'medium') return mediumHeight;
    return Math.min(contentHeight, largeHeight);
  }, [contentHeight, largeHeight, mediumHeight]);

  // Lifts the sheet just enough to keep the focused field (and anything beside it, like an
  // inline Save) above the keyboard; docked sheets rise until they sit on the keyboard, but
  // never past the status bar. Keyboard events also reach this modal window, which the
  // animated keyboard hook does not track on Android.
  const keyboardLift = useSharedValue(0);
  const openHeight = heightOf(detents[0]);
  const { top: topInset, bottom: bottomInset } = insets;
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => {
      const keyboardTop = event.endCoordinates.screenY;
      const docked = dockToKeyboard
        ? dockedKeyboardLift({ screenHeight, keyboardTop, bottomInset, topLimit: topInset + LARGE_TOP_GAP, sheetHeight: openHeight })
        : 0;
      const lift = (overlap: number) => keyboardLift.set(withTiming(Math.max(docked, overlap), { duration: durations.normal, easing: easing.sheet }));
      const input = TextInput.State.currentlyFocusedInput();
      if (!input) { lift(0); return; }
      input.measureInWindow((_x, y, _width, height) => lift(y + height + theme.spacing.md - keyboardTop));
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      keyboardLift.set(withTiming(0, { duration: durations.normal, easing: easing.sheet }));
    });
    return () => { show.remove(); hide.remove(); };
  }, [keyboardLift, theme.spacing.md, dockToKeyboard, screenHeight, topInset, bottomInset, openHeight]);

  const fitsContent = detents.includes('content');
  // Content sheets use a full-height panel pushed down by the unused space, so a change in
  // content height is a spring on translateY instead of a jump in the panel's height.
  const sheetHeight = fitsContent ? largeHeight : Math.max(...detents.map(heightOf));
  // translateY is measured from the fully-open position; `sheetHeight` = hidden.
  const snapPoints = detents.map((detent) => sheetHeight - heightOf(detent));
  const openPoint = snapPoints[0];
  const measured = !fitsContent || contentHeight > 0;

  const translateY = useSharedValue(screenHeight);
  const opacity = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const ownCover = useSharedValue(0);

  if (visible && !mounted) setMounted(true);

  const finishDismiss = useCallback(() => {
    setMounted(false);
    onDismissed?.();
  }, [onDismissed]);

  useEffect(() => {
    if (!mounted || !measured) return;
    if (visible) {
      opacity.set(withTiming(1, { duration: durations.fast, reduceMotion: ReduceMotion.Never }));
      translateY.set(reduceMotion ? openPoint : withSpring(openPoint, spring.gentle));
    } else {
      if (reduceMotion) {
        opacity.set(withTiming(0, { duration: durations.fast, reduceMotion: ReduceMotion.Never }, (finished) => {
          if (finished) scheduleOnRN(finishDismiss);
        }));
      } else {
        translateY.set(withTiming(sheetHeight, { duration: durations.normal, easing: easing.sheet }, (finished) => {
          if (finished) scheduleOnRN(finishDismiss);
        }));
      }
    }
  }, [visible, mounted, measured, sheetHeight, openPoint, reduceMotion, finishDismiss, translateY, opacity]);

  // The presenter recedes only as the sheet approaches full height (medium sheets just dim).
  useAnimatedReaction(
    () => interpolate(sheetHeight - translateY.get(), [mediumHeight, largeHeight], [0, 1], Extrapolation.CLAMP),
    (cover) => parentCover?.set(cover),
  );

  const pan = usePanGesture({
    activeOffsetY: [-10, 10],
    failOffsetX: [-20, 20],
    onBegin: () => {
      dragStart.set(translateY.get());
    },
    onUpdate: (event) => {
      const next = dragStart.get() + event.translationY;
      // Rubber-band above the tallest detent, like UIKit.
      translateY.set(next < 0 ? next * gestures.rubberBand : next);
    },
    onDeactivate: (event) => {
      const current = translateY.get();
      const lowest = openPoint;
      const pastThreshold = current > lowest + (sheetHeight - lowest) * gestures.dismissFraction;
      if (event.velocityY > gestures.dismissVelocity || pastThreshold) {
        scheduleOnRN(onClose);
        return;
      }
      const projected = current + event.velocityY * 0.1;
      const target = snapPoints.reduce((best, point) =>
        Math.abs(point - projected) < Math.abs(best - projected) ? point : best, openPoint);
      translateY.set(reduceMotion ? target : withSpring(target, { ...spring.gentle, velocity: event.velocityY }));
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? opacity.get() : 1,
    transform: [{ translateY: translateY.get() - keyboardLift.get() }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? opacity.get() : interpolate(translateY.get(), [openPoint, sheetHeight], [1, 0], Extrapolation.CLAMP),
  }));

  const onContentLayout = (event: LayoutChangeEvent) => {
    const height = Math.ceil(event.nativeEvent.layout.height);
    if (height !== contentHeight) setContentHeight(height);
  };

  if (!mounted) return null;

  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent hardwareAccelerated animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.fill} onLayout={(event) => setMeasuredHeight(Math.round(event.nativeEvent.layout.height))}>
        <BlurTargetBoundary>
          <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
            {/* The app behind softly blurs and dims as the sheet rises. */}
            <BlurView blurTarget={rootTarget ?? undefined} blurMethod="dimezisBlurViewSdk31Plus" intensity={SCRIM_BLUR}
              tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }]} />
            <Pressable style={styles.fill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
          </Animated.View>
          <GestureDetector gesture={pan}>
            <Animated.View
              pointerEvents={visible ? 'auto' : 'none'}
              accessibilityViewIsModal
              style={[styles.sheet, { height: sheetHeight }, sheetStyle]}
            >
              <GlassSurface
                material={background === 'grouped' ? 'groupedSheet' : 'sheet'}
                radius={theme.radii.sheet}
                topCornersOnly
                style={styles.fill}
                contentStyle={styles.fill}
              >
                <SheetCoverable cover={ownCover} radius={theme.radii.sheet}>
                  <SheetCoverProvider cover={ownCover}>
                    <View onLayout={fitsContent ? onContentLayout : undefined}
                      style={[{ paddingBottom: insets.bottom + theme.spacing.sm }, !fitsContent && styles.fill]}>
                      <View style={[styles.grabberRow, { paddingTop: theme.spacing.sm }]}>
                        <View style={{
                          width: theme.sizes.grabberWidth, height: theme.sizes.grabberHeight,
                          borderRadius: theme.radii.pill, backgroundColor: theme.colors.tertiaryLabel,
                        }} />
                      </View>
                      {children}
                    </View>
                  </SheetCoverProvider>
                </SheetCoverable>
              </GlassSurface>
            </Animated.View>
          </GestureDetector>
        </BlurTargetBoundary>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  grabberRow: { alignItems: 'center' },
});
