import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation, interpolate, useAnimatedKeyboard, useAnimatedReaction, useAnimatedStyle,
  ReduceMotion, useReducedMotion, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { durations, easing, gestures, spring } from '@/constants/motion';
import { useTheme } from '@/hooks/useTheme';
import { BlurTargetBoundary } from '../glass/BlurTarget';
import { GlassSurface } from '../glass/GlassSurface';
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
};

const LARGE_TOP_GAP = 10;

/**
 * iOS-style sheet: grabber, detents, `spring.gentle` presentation, drag to dismiss with
 * velocity, dimmed background, and the presenter receding while a large detent is shown.
 * Rendered in a transparent `Modal` so it always covers the tab bar (UI-ANALYSIS R12).
 */
export function BottomSheet({
  visible, onClose, children, detents = ['large'], background = 'plain', onDismissed,
}: BottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const parentCover = useSheetCover();
  // Forms can unmount after saving. Never leave their presenter scaled down.
  useEffect(() => () => { parentCover?.set(0); }, [parentCover]);
  const keyboard = useAnimatedKeyboard();
  const [mounted, setMounted] = useState(visible);
  const [contentHeight, setContentHeight] = useState(0);

  const largeHeight = screenHeight - insets.top - LARGE_TOP_GAP;
  const mediumHeight = Math.round(screenHeight * 0.5);
  const heightOf = useCallback((detent: SheetDetent) => {
    if (detent === 'large') return largeHeight;
    if (detent === 'medium') return mediumHeight;
    return Math.min(contentHeight, largeHeight);
  }, [contentHeight, largeHeight, mediumHeight]);

  const sheetHeight = Math.max(...detents.map(heightOf));
  // translateY is measured from the fully-open position; `sheetHeight` = hidden.
  const snapPoints = detents.map((detent) => sheetHeight - heightOf(detent));
  const measured = !detents.includes('content') || contentHeight > 0;

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
      translateY.set(reduceMotion ? snapPoints[0] : withSpring(snapPoints[0], spring.gentle));
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
    // snapPoints is derived from sheetHeight + detents; listing it would restart on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mounted, measured, sheetHeight, reduceMotion, finishDismiss, translateY, opacity]);

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
      const lowest = snapPoints[0];
      const pastThreshold = current > lowest + (sheetHeight - lowest) * gestures.dismissFraction;
      if (event.velocityY > gestures.dismissVelocity || pastThreshold) {
        scheduleOnRN(onClose);
        return;
      }
      const projected = current + event.velocityY * 0.1;
      const target = snapPoints.reduce((best, point) =>
        Math.abs(point - projected) < Math.abs(best - projected) ? point : best, snapPoints[0]);
      translateY.set(reduceMotion ? target : withSpring(target, { ...spring.gentle, velocity: event.velocityY }));
    },
  });

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? opacity.get() : 1,
    transform: [{ translateY: translateY.get() - keyboard.height.get() }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? opacity.get() : interpolate(translateY.get(), [snapPoints[0], sheetHeight], [1, 0], Extrapolation.CLAMP),
  }));

  const onContentLayout = (event: LayoutChangeEvent) => {
    const height = Math.ceil(event.nativeEvent.layout.height);
    if (height !== contentHeight) setContentHeight(height);
  };

  if (!mounted) return null;
  const sizesToContent = detents.length === 1 && detents[0] === 'content';

  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.fill}>
        <BlurTargetBoundary>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }, scrimStyle]}>
            <Pressable style={styles.fill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
          </Animated.View>
          <GestureDetector gesture={pan}>
            <Animated.View
              pointerEvents={visible ? 'auto' : 'none'}
              accessibilityViewIsModal
              style={[styles.sheet, { height: sizesToContent ? undefined : sheetHeight }, sheetStyle]}
            >
              <GlassSurface
                material={background === 'grouped' ? 'groupedSheet' : 'sheet'}
                radius={theme.radii.sheet}
                topCornersOnly
                style={sizesToContent ? undefined : styles.fill}
                contentStyle={sizesToContent ? undefined : styles.fill}
              >
                <SheetCoverable cover={ownCover} radius={theme.radii.sheet} style={sizesToContent ? styles.auto : undefined}>
                  <SheetCoverProvider cover={ownCover}>
                    <View onLayout={sizesToContent || detents.includes('content') ? onContentLayout : undefined}
                      style={[{ paddingBottom: insets.bottom + theme.spacing.sm }, !sizesToContent && styles.fill]}>
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
  auto: { flex: 0 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  grabberRow: { alignItems: 'center' },
});
