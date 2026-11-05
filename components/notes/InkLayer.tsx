import { useContext, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
import { scrollTo, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Path } from 'react-native-svg';
import { DragScrollContext } from '@/components/ui/DragScrollContext';
import { strokePath, TOOL_STYLE, type DrawingTool, type InkColor, type Stroke } from './drawing';
import { useInk } from './DrawingView';

export type InkTool = DrawingTool | 'eraser';
export type InkSettings = {
  tool: InkTool; color: InkColor;
  onStroke: (stroke: Stroke) => void;
  /** Page point, in page widths, that the eraser passed over. */
  onErase: (x: number, y: number) => void;
};

/** Points closer than this to the last one are skipped, keeping strokes light. */
const MIN_STEP = 0.003;

/**
 * Drawing directly on the note: laid over the page while the pen is out, it turns one finger
 * into ink. Two fingers still scroll the page, and landing the second finger drops the start of
 * the stroke the first one had begun. Points are in page widths, so a stroke's position does not
 * depend on the phone's size.
 */
export function InkLayer({ width, tool, color, onStroke, onErase }: InkSettings & { width: number }) {
  const ink = useInk();
  const scroll = useContext(DragScrollContext);
  const [height, setHeight] = useState(0);
  const [current, setCurrent] = useState<number[] | null>(null);
  const points = useRef<number[]>([]);
  const startOffset = useSharedValue(0);

  const begin = (x: number, y: number) => {
    if (tool === 'eraser') { onErase(x / width, y / width); return; }
    points.current = [x / width, y / width];
    setCurrent(points.current);
  };
  const extend = (x: number, y: number) => {
    if (tool === 'eraser') { onErase(x / width, y / width); return; }
    const list = points.current;
    const [px, py] = [x / width, y / width];
    if (!list.length || Math.hypot(px - list[list.length - 2], py - list[list.length - 1]) < MIN_STEP) return;
    points.current = [...list, px, py];
    setCurrent(points.current);
  };
  const end = (canceled: boolean) => {
    if (tool !== 'eraser' && points.current.length && !canceled) onStroke({ tool, color, points: points.current });
    points.current = [];
    setCurrent(null);
  };

  const pen = usePanGesture({
    minDistance: 0,
    maxPointers: 1,
    onActivate: (event) => { scheduleOnRN(begin, event.x, event.y); },
    onUpdate: (event) => { scheduleOnRN(extend, event.x, event.y); },
    onFinalize: (event) => { scheduleOnRN(end, event.canceled); },
  });
  const twoFingerScroll = usePanGesture({
    minPointers: 2,
    onActivate: () => { startOffset.set(scroll?.offset.get() ?? 0); },
    onUpdate: (event) => {
      if (!scroll) return;
      const next = Math.max(0, Math.min(scroll.max.get(), startOffset.get() - event.translationY));
      scrollTo(scroll.ref, 0, next, false);
      scroll.offset.set(next);
    },
  });
  const gesture = useSimultaneousGestures(pen, twoFingerScroll);

  return <GestureDetector gesture={gesture}>
    <View accessibilityLabel="Drawing area" collapsable={false} style={[StyleSheet.absoluteFill, styles.layer]} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
      {current && tool !== 'eraser' && height > 0 && <Svg pointerEvents="none" width={width} height={height} viewBox={`0 0 1 ${height / width}`}>
        <Path d={strokePath(current)} stroke={ink(color)} strokeOpacity={TOOL_STYLE[tool].opacity} strokeWidth={TOOL_STYLE[tool].width}
          strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>}
    </View>
  </GestureDetector>;
}

// Above every block, including one that was just picked up.
const styles = StyleSheet.create({ layer: { zIndex: 200 } });
