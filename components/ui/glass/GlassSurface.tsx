import { BlurView } from 'expo-blur';
import { createContext, useContext, useEffect, useId, useState, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { ColorToken } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useBlurTarget } from './BlurTarget';

/**
 * - `regular`: translucent bars and buttons.
 * - `hud`: always-dark material for toasts (UI-ANALYSIS R14).
 * - `sheet` / `groupedSheet`: the near-opaque sheet materials from the design, still with
 *   the glass edge highlight.
 */
export type GlassMaterial = 'regular' | 'hud' | 'sheet' | 'groupedSheet';

export type GlassSurfaceProps = {
  children?: ReactNode;
  /** Corner radius applied to every layer; defaults to a full pill. */
  radius?: number;
  /** Round only the top corners (sheets). */
  topCornersOnly?: boolean;
  material?: GlassMaterial;
  /** 0→1 press progress from `PressableScale`; brightens the surface while pressed. */
  pressProgress?: SharedValue<number>;
  /** Drop the floating shadow. */
  flat?: boolean;
  /** Liquid glass depth: a specular sheen from the top edge and a soft shade at the bottom. */
  sheen?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

const BLUR_INTENSITY = { light: 60, dark: 50 } as const;

/**
 * Glass resting on another glass bar (the screen header) drops its floating shadow: there
 * its 30 pt blur read as a grey box around the action pill rather than as depth.
 */
const OnGlassBarContext = createContext(false);
export function OnGlassBar({ children }: { children: ReactNode }) {
  return <OnGlassBarContext.Provider value>{children}</OnGlassBarContext.Provider>;
}

const OPAQUE_MATERIALS: Partial<Record<GlassMaterial, ColorToken>> = { sheet: 'sheet', groupedSheet: 'groupedSheet' };

function useReduceTransparency() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (typeof AccessibilityInfo.isReduceTransparencyEnabled !== 'function') return;
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
  children, radius, topCornersOnly, material = 'regular', pressProgress, flat, sheen, style, contentStyle,
}: GlassSurfaceProps) {
  // SVG url() references cannot contain the colons React puts in generated ids.
  const gradientId = `sheen${useId().replace(/:/g, '')}`;
  const theme = useTheme();
  const target = useBlurTarget();
  const reduceTransparency = useReduceTransparency();
  const onGlassBar = useContext(OnGlassBarContext);
  const { colors } = theme;
  const cornerRadius = radius ?? theme.radii.pill;
  const isHud = material === 'hud';
  const opaqueToken = OPAQUE_MATERIALS[material];
  const canBlur = !!target && !reduceTransparency && !opaqueToken;

  const tint = opaqueToken
    ? colors[opaqueToken]
    : isHud ? colors.hudTint : canBlur ? colors.glassTint : colors.glassFallback;
  const blurTint = isHud || theme.isDark ? 'dark' : 'light';

  const pressedStyle = useAnimatedStyle(() => ({ opacity: pressProgress?.get() ?? 0 }));
  const corners: ViewStyle = topCornersOnly
    ? { borderTopLeftRadius: cornerRadius, borderTopRightRadius: cornerRadius, borderCurve: 'continuous' }
    : { borderRadius: cornerRadius, borderCurve: 'continuous' };
  const shadow = material === 'sheet' || material === 'groupedSheet' ? theme.shadows.sheet : theme.shadows.floating;

  return (
    <View style={[corners, !flat && !onGlassBar && { boxShadow: shadow }, style]}>
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
        {sheen && (
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={theme.glassSheen.sheen} />
                <Stop offset="0.48" stopColor="#FFFFFF" stopOpacity={0} />
                <Stop offset="0.7" stopColor="#000000" stopOpacity={0} />
                <Stop offset="1" stopColor="#000000" stopOpacity={theme.glassSheen.shade} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
          </Svg>
        )}
        {pressProgress && (
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: isHud ? colors.hudFill : colors.glassTintPressed }, pressedStyle]}
          />
        )}
        <View
          style={[
            StyleSheet.absoluteFill, corners,
            {
              borderColor: opaqueToken ? 'transparent' : colors.glassBorder,
              borderTopColor: isHud ? colors.hudFill : sheen ? colors.glassRim : colors.glassHighlight,
              borderWidth: sheen ? theme.sizes.hairline * 2 : theme.sizes.hairline,
            },
          ]}
        />
      </View>
      <View style={[corners, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({ clip: { overflow: 'hidden' } });
