import { useEffect, useState } from 'react';
import { StyleSheet, View, type TextLayoutEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { easing } from '@/constants/motion';
import { type TextVariant } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './Text';

export type StrikeTextProps = {
  children: string;
  struck: boolean;
  variant?: TextVariant;
  numberOfLines?: number;
};

/** Long enough to read as a pen stroke, short enough that ticking stays quick. */
export const STRIKE_DURATION = 320;
const LINE_THICKNESS = 1.5;

type Line = { start: number; width: number; top: number };

/**
 * Text struck through with a drawn line that sweeps left→right across exactly the text
 * (each wrapped line in turn, never past the last word) and reverses when un-done. The
 * drawn line stays, so there is no jump to a native strikethrough. Done text is secondary.
 */
export function StrikeText({ children, struck, variant = 'body', numberOfLines = 2 }: StrikeTextProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [lines, setLines] = useState<Line[]>([]);
  const progress = useSharedValue(struck ? 1 : 0);
  useEffect(() => {
    progress.set(reduceMotion ? (struck ? 1 : 0) : withTiming(struck ? 1 : 0, { duration: STRIKE_DURATION, easing: easing.standard }));
  }, [progress, reduceMotion, struck]);
  const total = lines.reduce((sum, line) => sum + line.width, 0);
  const onTextLayout = (event: TextLayoutEvent) => {
    let start = 0;
    setLines(event.nativeEvent.lines.slice(0, numberOfLines).map((line) => {
      const measured = { start, width: line.width, top: line.y + line.height / 2 - LINE_THICKNESS / 2 };
      start += line.width;
      return measured;
    }));
  };
  return (
    <View style={styles.flex}>
      <Text variant={variant} color={struck ? 'secondaryLabel' : 'label'} numberOfLines={numberOfLines} onTextLayout={onTextLayout}>
        {children}
      </Text>
      {lines.map((line, index) => <StrikeLine key={index} line={line} total={total} progress={progress} color={theme.colors.secondaryLabel} />)}
    </View>
  );
}

function StrikeLine({ line, total, progress, color }: { line: Line; total: number; progress: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => ({ width: Math.max(0, Math.min(line.width, progress.get() * total - line.start)) }));
  return <Animated.View pointerEvents="none" style={[styles.line, { top: line.top, height: LINE_THICKNESS, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({ flex: { flex: 1 }, line: { position: 'absolute', left: 0 } });
