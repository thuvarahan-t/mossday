import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { drawingViewBox, strokePath, TOOL_STYLE, type Drawing, type InkColor, type Stroke } from './drawing';

export function useInk() {
  const theme = useTheme();
  return (color: InkColor) => color === 'ink' ? theme.colors.label : theme.accents[color];
}

/** The strokes as SVG paths, in the drawing's own units; drawn by the note and its previews. */
export const Strokes = memo(function Strokes({ strokes }: { strokes: Stroke[] }) {
  const ink = useInk();
  return strokes.map((stroke, index) => <Path key={index} d={strokePath(stroke.points)} stroke={ink(stroke.color)} strokeOpacity={TOOL_STYLE[stroke.tool].opacity}
    strokeWidth={TOOL_STYLE[stroke.tool].width} strokeLinecap="round" strokeLinejoin="round" fill="none" />);
});

/**
 * A drawing cropped to its strokes. Without a `width` it fills its parent and keeps its shape,
 * so it follows a live pinch on the page the same way a photo does.
 */
export function DrawingView({ drawing, width }: { drawing: Drawing; width?: number }) {
  const box = drawingViewBox(drawing);
  const ratio = box.width / box.height;
  return <View pointerEvents="none" style={width === undefined ? { width: '100%', aspectRatio: ratio } : { width, height: width / ratio }}>
    <Svg width="100%" height="100%" viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} accessibilityLabel="Drawing">
      <Strokes strokes={drawing.strokes} />
    </Svg>
  </View>;
}
