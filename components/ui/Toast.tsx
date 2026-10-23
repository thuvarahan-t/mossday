import { useSegments } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { durations, easing, toastDuration } from '@/constants/motion';
import { useTabBarBottom } from '@/hooks/useTabBarInset';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { GlassSurface } from './glass/GlassSurface';

export type ToastOptions = { message: string; actionLabel?: string; onAction?: () => void };
type ToastEntry = ToastOptions & { id: number };

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);

/** `const showToast = useToast(); showToast({ message: 'Expense deleted', actionLabel: 'Undo', onAction })` */
export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside ToastProvider.');
  return show;
}

/** Hosts one toast at a time; a new toast replaces the current one (iOS banner behaviour). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastEntry | null>(null);
  const nextId = useRef(0);
  const show = useCallback((options: ToastOptions) => {
    nextId.current += 1;
    setToast({ ...options, id: nextId.current });
  }, []);
  const dismiss = useCallback((id: number) => {
    setToast((current) => (current?.id === id ? null : current));
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && <ToastView key={toast.id} toast={toast} onDismissed={dismiss} />}
    </ToastContext.Provider>
  );
}

const HIDDEN_OFFSET = 160;

function ToastView({ toast, onDismissed }: { toast: ToastEntry; onDismissed: (id: number) => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarBottom = useTabBarBottom();
  const segments = useSegments();
  const reduceMotion = useReducedMotion();
  const translateY = useSharedValue(HIDDEN_OFFSET);
  const { id } = toast;

  const overTabBar = segments[0] === '(tabs)';
  const bottom = overTabBar
    ? tabBarBottom + theme.sizes.tabBarHeight + theme.spacing.md
    : insets.bottom + theme.spacing.md;

  const hide = useCallback(() => {
    translateY.set(withTiming(HIDDEN_OFFSET, { duration: durations.normal, easing: easing.standard }, (finished) => {
      if (finished) scheduleOnRN(onDismissed, id);
    }));
  }, [id, onDismissed, translateY]);

  useEffect(() => {
    translateY.set(animateTo(0, 'default', reduceMotion));
    const timer = setTimeout(hide, toastDuration);
    return () => clearTimeout(timer);
  }, [hide, reduceMotion, translateY]);

  const pan = usePanGesture({
    activeOffsetY: 8,
    onUpdate: (event) => {
      translateY.set(Math.max(0, event.translationY));
    },
    onDeactivate: (event) => {
      if (event.translationY > theme.sizes.toastHeight / 2 || event.velocityY > 500) scheduleOnRN(hide);
      else translateY.set(animateTo(0, 'snappy', reduceMotion));
    },
  });

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.get() }] }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        accessibilityLiveRegion="polite"
        style={[styles.host, { bottom, left: theme.spacing.xxl, right: theme.spacing.xxl }, style]}
      >
        <GlassSurface material="hud">
          <View style={[styles.row, {
            minHeight: theme.sizes.toastHeight, paddingLeft: theme.spacing.xl, paddingRight: theme.spacing.xs,
            gap: theme.spacing.md,
          }]}>
            <Text color="hudLabel" numberOfLines={2} style={styles.message}>{toast.message}</Text>
            {toast.actionLabel && (
              <PressableScale
                haptic="tap"
                accessibilityLabel={toast.actionLabel}
                onPress={() => { toast.onAction?.(); hide(); }}
                style={{
                  backgroundColor: theme.colors.hudFill, borderRadius: theme.radii.pill,
                  minHeight: theme.sizes.toastHeight - theme.spacing.sm, paddingHorizontal: theme.spacing.xl,
                  justifyContent: 'center',
                }}
              >
                <Text variant="headline" color="hudAccent">{toast.actionLabel}</Text>
              </PressableScale>
            )}
          </View>
        </GlassSurface>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute' },
  row: { flexDirection: 'row', alignItems: 'center' },
  message: { flex: 1 },
});
