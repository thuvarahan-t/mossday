import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { drawingFrame, strokePath, TOOL_STYLE, type Drawing, type InkColor, type Stroke } from './drawing';

export function useInk() {
  const theme = useTheme();
  return (color: InkColor) => color === 'ink' ? theme.colors.label : theme.accents[color];
}

/** The strokes as SVG paths, in canvas-width units; drawn by the editor and the previews. */
export const Strokes = memo(function Strokes({ strokes }: { strokes: Stroke[] }) {
  const ink = useInk();
  return strokes.map((stroke, index) => <Path key={index} d={strokePath(stroke.points)} stroke={ink(stroke.color)} strokeOpacity={TOOL_STYLE[stroke.tool].opacity}
    strokeWidth={TOOL_STYLE[stroke.tool].width} strokeLinecap="round" strokeLinejoin="round" fill="none" />);
});

/** A drawing at `width`, cropped to the band around its strokes (see `drawingFrame`). */
export function DrawingView({ drawing, width }: { drawing: Drawing; width: number }) {
  const frame = drawingFrame(drawing);
  return <Svg width={width} height={width * frame.height} viewBox={`0 ${frame.y} 1 ${frame.height}`} pointerEvents="none" accessibilityLabel="Drawing">
    <Strokes strokes={drawing.strokes} />
  </Svg>;
}
