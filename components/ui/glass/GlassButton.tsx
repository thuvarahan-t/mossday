import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { PressableScale, type PressableScaleProps } from '../PressableScale';
import { GlassSurface } from './GlassSurface';

export type GlassButtonProps = Omit<PressableScaleProps, 'children' | 'pressProgress'> & {
  children: ReactNode;
  /** `circle` is the 44 pt icon button; `pill` sizes to its content (e.g. "Edit"). */
  shape?: 'circle' | 'pill';
  size?: number;
  accessibilityLabel: string;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Floating glass control (back, gear, calendar, close, Edit): scales and brightens on press. */
export function GlassButton({
  children, shape = 'circle', size, style, contentStyle, ...pressableProps
}: GlassButtonProps) {
  const theme = useTheme();
  const progress = useSharedValue(0);
  const side = size ?? theme.sizes.circleButton;
  const shapeStyle = shape === 'circle'
    ? { width: side, height: side }
    : { height: side, paddingHorizontal: theme.spacing.lg };

  return (
    <PressableScale pressProgress={progress} style={style} {...pressableProps}>
      <GlassSurface pressProgress={progress} contentStyle={[styles.center, shapeStyle, contentStyle]}>
        {children}
      </GlassSurface>
    </PressableScale>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row' } });
