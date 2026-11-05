import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { GlassSurface } from '@/components/ui/glass/GlassSurface';
import { durations } from '@/constants/motion';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { INK_COLORS, type InkColor } from './drawing';
import { useInk } from './DrawingView';
import type { InkTool } from './InkLayer';

const TOOLS: { tool: InkTool; icon: IconName; label: string }[] = [
  { tool: 'pen', icon: 'pen', label: 'Pen' }, { tool: 'marker', icon: 'brush', label: 'Marker' },
  { tool: 'highlighter', icon: 'highlighter', label: 'Highlighter' }, { tool: 'eraser', icon: 'eraser', label: 'Eraser' },
];

/**
 * The pen's options, growing up out of the toolbar's pen button while drawing: pen, marker,
 * highlighter and a stroke eraser, in seven inks. They sit over the page, so opening them does
 * not move what is being drawn on.
 */
export function DrawingTools({ tool, color, onTool, onColor }: {
  tool: InkTool; color: InkColor; onTool: (tool: InkTool) => void; onColor: (color: InkColor) => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const ink = useInk();
  const grown = useSharedValue(reduced ? 1 : 0);
  useEffect(() => { grown.set(animateTo(1, 'snappy', reduced)); }, [grown, reduced]);
  const growStyle = useAnimatedStyle(() => ({ opacity: grown.get(), transform: [{ scale: 0.85 + grown.get() * 0.15 }] }));
  const swatch = theme.sizes.touchTarget - theme.spacing.sm;
  return <Animated.View exiting={reduced ? undefined : FadeOut.duration(durations.fast)}
    style={[styles.panel, { left: theme.spacing.md, right: theme.spacing.md, bottom: theme.sizes.toolbarHeight + theme.spacing.sm * 2 }, growStyle]}>
    <GlassSurface sheen radius={theme.radii.card} contentStyle={{ padding: theme.spacing.sm, gap: theme.spacing.xs }}>
      <View style={styles.row}>
        {TOOLS.map((item) => {
          const selected = tool === item.tool;
          return <PressableScale key={item.tool} haptic="selection" accessibilityLabel={item.label} accessibilityState={{ selected }} onPress={() => onTool(item.tool)}
            style={[styles.center, { width: theme.sizes.circleButton, height: theme.sizes.circleButton, borderRadius: theme.radii.pill,
              backgroundColor: selected ? theme.colors.accentFill : 'transparent' }]}>
            <Icon name={item.icon} color={selected ? 'accent' : 'label'} />
          </PressableScale>;
        })}
      </View>
      <View style={styles.row}>
        {INK_COLORS.map((name) => {
          const selected = color === name && tool !== 'eraser';
          return <PressableScale key={name} haptic="selection" accessibilityRole="radio" accessibilityLabel={name === 'ink' ? 'Black ink' : name} accessibilityState={{ selected }}
            onPress={() => onColor(name)} style={[styles.center, { width: swatch, height: swatch, borderRadius: theme.radii.pill, borderWidth: 2.5, borderColor: selected ? ink(name) : 'transparent' }]}>
            <View style={{ width: swatch - theme.spacing.md, height: swatch - theme.spacing.md, borderRadius: theme.radii.pill, backgroundColor: ink(name) }} />
          </PressableScale>;
        })}
      </View>
    </GlassSurface>
  </Animated.View>;
}

const styles = StyleSheet.create({
  // Expands from the pen, the toolbar's rightmost button.
  panel: { position: 'absolute', transformOrigin: '90% 100%' },
  row: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
