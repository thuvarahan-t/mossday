import { useRef, useState, type ReactNode } from 'react';
import { Modal, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { useTheme } from '@/hooks/useTheme';
import { eraseAt, INK_COLORS, strokePath, TOOL_STYLE, type Drawing, type DrawingTool, type InkColor, type Stroke } from './drawing';
import { Strokes, useInk } from './DrawingView';

type Tool = DrawingTool | 'eraser';
const TOOLS: { tool: Tool; icon: IconName; label: string }[] = [
  { tool: 'pen', icon: 'pen', label: 'Pen' }, { tool: 'marker', icon: 'brush', label: 'Marker' },
  { tool: 'highlighter', icon: 'highlighter', label: 'Highlighter' }, { tool: 'eraser', icon: 'eraser', label: 'Eraser' },
];
/** Eraser reach, in canvas widths. */
const ERASER_RADIUS = 0.03;
/** Points closer than this to the last one are skipped, keeping strokes light. */
const MIN_STEP = 0.003;

function RoundButton({ icon, label, onPress, disabled, selected, tint }: {
  icon: IconName; label: string; onPress: () => void; disabled?: boolean; selected?: boolean; tint?: string;
}) {
  const theme = useTheme();
  return <PressableScale haptic="selection" accessibilityLabel={label} accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress}
    style={[styles.center, { width: theme.sizes.circleButton, height: theme.sizes.circleButton, borderRadius: theme.radii.pill,
      backgroundColor: tint ?? (selected ? theme.colors.accentBar : theme.colors.fill), opacity: disabled ? 0.4 : 1 }]}>
    <Icon name={icon} color={selected || tint ? 'onAccent' : 'label'} />
  </PressableScale>;
}

/**
 * A full-screen sketch pad (Keep's drawing, Samsung's pen): pen, marker, highlighter and a
 * stroke eraser in seven inks, with undo and redo. Closing in any way keeps the drawing;
 * Clear can be undone.
 */
export function DrawingEditor({ initial, onDone }: { initial: Drawing | null; onDone: (drawing: Drawing) => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const ink = useInk();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [strokes, setStrokes] = useState<Stroke[]>(initial?.strokes ?? []);
  const [undone, setUndone] = useState<Stroke[][]>([]);
  const [history, setHistory] = useState<Stroke[][]>([]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState<InkColor>('ink');
  const [current, setCurrent] = useState<number[] | null>(null);
  const points = useRef<number[]>([]);
  const beforeErase = useRef<Stroke[] | null>(null);
  const scale = size.width || 1;

  const change = (next: Stroke[], before = strokes) => { setHistory((past) => [...past, before]); setUndone([]); setStrokes(next); };
  const undo = () => { const before = history.at(-1); if (!before) return; setHistory(history.slice(0, -1)); setUndone([strokes, ...undone]); setStrokes(before); };
  const redo = () => { const [next, ...rest] = undone; if (!next) return; setHistory([...history, strokes]); setUndone(rest); setStrokes(next); };
  const done = () => onDone({ aspect: Math.max(initial?.aspect ?? 0, size.height / scale) || 1, strokes });

  const at = (event: GestureResponderEvent) => [event.nativeEvent.locationX / scale, event.nativeEvent.locationY / scale] as const;
  const start = (event: GestureResponderEvent) => {
    const [x, y] = at(event);
    if (tool === 'eraser') { beforeErase.current = strokes; setStrokes(eraseAt(strokes, x, y, ERASER_RADIUS)); return; }
    points.current = [x, y];
    setCurrent(points.current);
  };
  const extend = (event: GestureResponderEvent) => {
    const [x, y] = at(event);
    if (tool === 'eraser') { setStrokes((list) => eraseAt(list, x, y, ERASER_RADIUS)); return; }
    const list = points.current;
    if (Math.hypot(x - list[list.length - 2], y - list[list.length - 1]) < MIN_STEP) return;
    points.current = [...list, x, y];
    setCurrent(points.current);
  };
  const finish = () => {
    if (tool === 'eraser') {
      const before = beforeErase.current;
      beforeErase.current = null;
      if (before && before.length !== strokes.length) change(strokes, before);
      return;
    }
    if (points.current.length) change([...strokes, { tool, color, points: points.current }]);
    points.current = [];
    setCurrent(null);
  };

  return <Modal visible animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={done}>
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={[styles.row, { padding: theme.spacing.lg, gap: theme.spacing.sm }]}>
        <RoundButton icon="chevronLeft" label="Save drawing and go back" onPress={done} />
        <View style={{ flex: 1 }} />
        <RoundButton icon="undo" label="Undo" disabled={!history.length} onPress={undo} />
        <RoundButton icon="redo" label="Redo" disabled={!undone.length} onPress={redo} />
        <RoundButton icon="trash" label="Clear drawing" disabled={!strokes.length} onPress={() => change([])} />
        <RoundButton icon="check" label="Done" tint={theme.colors.accent} onPress={done} />
      </View>
      <View style={{ flex: 1, marginHorizontal: theme.spacing.lg, borderRadius: theme.radii.card, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: theme.colors.card }}
        onLayout={(event: LayoutChangeEvent) => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderTerminationRequest={() => false}
        onResponderGrant={start} onResponderMove={extend} onResponderRelease={finish} onResponderTerminate={finish}
        accessibilityLabel="Drawing canvas">
        {size.width > 0 && <Svg pointerEvents="none" width={size.width} height={size.height} viewBox={`0 0 1 ${size.height / scale}`}>
          <Strokes strokes={strokes} />
          {current && tool !== 'eraser' && <Path d={strokePath(current)} stroke={ink(color)} strokeOpacity={TOOL_STYLE[tool].opacity}
            strokeWidth={TOOL_STYLE[tool].width} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
        </Svg>}
      </View>
      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <ToolRow>{TOOLS.map((item) => <RoundButton key={item.tool} icon={item.icon} label={item.label} selected={tool === item.tool} onPress={() => setTool(item.tool)} />)}</ToolRow>
        <ToolRow>{INK_COLORS.map((name) => {
          const selected = color === name && tool !== 'eraser';
          return <PressableScale key={name} haptic="selection" accessibilityRole="radio" accessibilityLabel={name === 'ink' ? 'Black ink' : name}
            accessibilityState={{ selected }} onPress={() => { setColor(name); if (tool === 'eraser') setTool('pen'); }}
            style={[styles.center, { width: theme.sizes.touchTarget, height: theme.sizes.touchTarget, borderRadius: theme.radii.pill,
              borderWidth: 2.5, borderColor: selected ? ink(name) : 'transparent' }]}>
            <View style={{ width: theme.sizes.iconTile, height: theme.sizes.iconTile, borderRadius: theme.radii.pill, backgroundColor: ink(name) }} />
          </PressableScale>;
        })}</ToolRow>
      </View>
    </View>
  </Modal>;
}

function ToolRow({ children }: { children: ReactNode }) {
  return <View style={[styles.row, { justifyContent: 'space-around' }]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
