import { BlurView } from 'expo-blur';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { useBlurTarget } from './BlurTarget';

export type GlassMaterial = 'regular' | 'hud';

export type GlassSurfaceProps = {
  children?: ReactNode;
  /** Corner radius applied to every layer; defaults to a full pill. */
  radius?: number;
  /** `hud` is the always-dark material used by toasts (UI-ANALYSIS R14). */
  material?: GlassMaterial;
  /** 0→1 press progress from `PressableScale`; brightens the surface while pressed. */
  pressProgress?: SharedValue<number>;
  /** Drop the floating shadow (e.g. glass that is part of a sheet edge). */
  flat?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

const BLUR_INTENSITY = { light: 60, dark: 50 } as const;

function useReduceTransparency() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled().then(setEnabled, () => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setEnabled);
    return () => subscription.remove();
  }, []);
  return enabled;
}

/**
 * iOS "Liquid Glass" surface: real blur of the content behind it, a translucent tint,
 * a bright top-edge highlight and a soft floating shadow. Without a blur target (or with
 * Reduce Transparency) it renders a near-opaque fill that reads the same.
 */
export function GlassSurface({
  children, radius, material = 'regular', pressProgress, flat, style, contentStyle,
}: GlassSurfaceProps) {
  const theme = useTheme();
  const target = useBlurTarget();
  const reduceTransparency = useReduceTransparency();
  const { colors } = theme;
  const cornerRadius = radius ?? theme.radii.pill;
  const isHud = material === 'hud';
  const canBlur = !!target && !reduceTransparency;

  const tint = isHud ? colors.hudTint : canBlur ? colors.glassTint : colors.glassFallback;
  const blurTint = isHud || theme.isDark ? 'dark' : 'light';

  const pressedStyle = useAnimatedStyle(() => ({ opacity: pressProgress?.get() ?? 0 }));
  const corners = { borderRadius: cornerRadius, borderCurve: 'continuous' } as const;

  return (
    <View style={[corners, !flat && { boxShadow: theme.shadows.floating }, style]}>
      <View style={[StyleSheet.absoluteFill, corners, styles.clip]} pointerEvents="none">
        {canBlur && (
          <BlurView
            blurTarget={target}
            blurMethod="dimezisBlurViewSdk31Plus"
            intensity={BLUR_INTENSITY[theme.scheme]}
            tint={blurTint}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
        {pressProgress && (
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: isHud ? colors.hudFill : colors.glassTintPressed }, pressedStyle]}
          />
        )}
        <View
          style={[
            StyleSheet.absoluteFill, corners,
            {
              borderWidth: theme.sizes.hairline,
              borderColor: colors.glassBorder,
              borderTopColor: isHud ? colors.hudFill : colors.glassHighlight,
            },
          ]}
        />
      </View>
      <View style={[corners, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({ clip: { overflow: 'hidden' } });
