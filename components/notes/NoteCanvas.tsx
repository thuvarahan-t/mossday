import { useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { Keyboard, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { scrollTo, useAnimatedStyle, useFrameCallback, useSharedValue, type AnimatedStyle } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Button } from '@/components/ui/Button';
import { DragScrollContext } from '@/components/ui/DragScrollContext';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/lib/haptics';
import { BLOCK_CHROME, canvasFrames, moveBlockLayout, resizeBlockLayout, type BlockFrame, type BlockLayout } from '@/lib/noteCanvas';
import type { NoteBlock } from '@/lib/repos/notes';

const LABELS = { TEXT: 'Text', IMAGE: 'Photo', VOICE: 'Audio', CHECKLIST: 'Checklist', DRAWING: 'Drawing' } as const;

export function NoteCanvas({ blocks, width, selectedId, onSelect, onPlaceText, onFrames, onChangeLayout, onDelete, onManipulating, renderBlock }: {
  blocks: NoteBlock[]; width: number; selectedId: number | null; onSelect: (id: number) => void;
  onPlaceText: (layout: BlockLayout) => void; onChangeLayout: (layouts: Record<number, BlockLayout>) => void;
  onFrames: (frames: Record<number, BlockFrame>) => void;
  onDelete: (block: NoteBlock) => void; onManipulating: (active: boolean) => void;
  renderBlock: (block: NoteBlock, width: number, imageStyle: AnimatedStyle<ViewStyle>) => ReactNode;
}) {
  const theme = useTheme();
  const [measured, setMeasured] = useState<Record<number, { width: number; height: number }>>({});
  const [extraSpace, setExtraSpace] = useState(400);
  const frames = canvasFrames(blocks, width, measured);
  useLayoutEffect(() => { onFrames(frames); }, [frames, onFrames]);
  const bottom = Math.max(0, ...Object.values(frames).map((frame) => frame.y + frame.height));
  const height = Math.max(500, bottom + extraSpace);
  const change = (id: number, layout: BlockLayout) => onChangeLayout({ ...frames, [id]: layout });
  return <View style={{ gap: theme.spacing.sm }}>
    <Text variant="caption1" color="tertiaryLabel">Tap blank space to write. Drag a dotted handle to move. Drag a photo’s corner to resize.</Text>
    <View style={{ height }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Add text anywhere on the note" style={StyleSheet.absoluteFill}
        onPress={(event) => {
          const x = Math.max(0, Math.min(0.7, event.nativeEvent.locationX / width));
          onPlaceText({ x, y: Math.max(0, event.nativeEvent.locationY), width: Math.min(0.8, 1 - x) });
        }} />
      {blocks.map((block) => <CanvasItem key={block.id} block={block} frame={frames[block.id]} canvasWidth={width}
        selected={selectedId === block.id} onSelect={() => onSelect(block.id)} onLayoutChange={(layout) => change(block.id, layout)}
        onDelete={() => onDelete(block)} onManipulating={onManipulating}
        onMeasure={(box) => setMeasured((current) => current[block.id]?.width === box.width && current[block.id]?.height === box.height
          ? current : { ...current, [block.id]: box })} renderBlock={renderBlock} />)}
    </View>
    <Button title="More space" variant="plain" size="small" onPress={() => setExtraSpace((space) => space + 500)} />
  </View>;
}

function CanvasItem({ block, frame, canvasWidth, selected, onSelect, onLayoutChange, onDelete, onManipulating, onMeasure, renderBlock }: {
  block: NoteBlock; frame: BlockFrame; canvasWidth: number; selected: boolean; onSelect: () => void;
  onLayoutChange: (layout: BlockLayout) => void; onDelete: () => void; onManipulating: (active: boolean) => void;
  onMeasure: (box: { width: number; height: number }) => void;
  renderBlock: (block: NoteBlock, width: number, imageStyle: AnimatedStyle<ViewStyle>) => ReactNode;
}) {
  const theme = useTheme();
  const scroll = useContext(DragScrollContext);
  const layout = useSharedValue<BlockLayout>(frame);
  const original = useSharedValue<BlockLayout>(frame);
  const mode = useSharedValue<'move' | 'resize' | null>(null);
  const deltaY = useSharedValue(0);
  const fingerY = useSharedValue(0);
  const startScroll = useSharedValue(0);
  useEffect(() => {
    if (mode.get() === null) layout.set(frame);
  }, [frame, canvasWidth, layout, mode]);
  useEffect(() => () => onManipulating(false), [onManipulating]);
  const begin = () => { Keyboard.dismiss(); onSelect(); haptics.selection(); onManipulating(true); };
  const move = usePanGesture({
    minDistance: 4,
    onActivate: (event) => {
      if (mode.get() !== null) return;
      original.set(layout.get()); startScroll.set(scroll?.offset.get() ?? 0);
      deltaY.set(0); fingerY.set(event.absoluteY); mode.set('move'); scheduleOnRN(begin);
    },
    onUpdate: (event) => {
      if (mode.get() !== 'move') return;
      deltaY.set(event.translationY); fingerY.set(event.absoluteY);
      layout.set(moveBlockLayout(original.get(), event.translationX, event.translationY + (scroll?.offset.get() ?? 0) - startScroll.get(), canvasWidth));
    },
    onDeactivate: (event) => {
      if (mode.get() !== 'move') return;
      if (event.canceled) layout.set(original.get());
      else scheduleOnRN(onLayoutChange, layout.get());
    },
    onFinalize: (event) => {
      if (mode.get() !== 'move') return;
      if (event.canceled) layout.set(original.get());
      mode.set(null); scheduleOnRN(onManipulating, false);
    },
  });
  useFrameCallback((frameInfo) => {
    if (mode.get() !== 'move' || !scroll) return;
    const y = fingerY.get();
    const speed = y < scroll.top.get() + 60 ? -0.5 : y > scroll.bottom.get() - 60 ? 0.5 : 0;
    const next = Math.max(0, Math.min(scroll.max.get(), scroll.offset.get() + speed * Math.min(32, frameInfo.timeSincePreviousFrame ?? 16)));
    if (next === scroll.offset.get()) return;
    scrollTo(scroll.ref, 0, next, false); scroll.offset.set(next);
    layout.set({ ...layout.get(), y: Math.max(0, original.get().y + deltaY.get() + next - startScroll.get()) });
  });
  const resize = usePanGesture({
    minDistance: 4,
    onActivate: () => { if (mode.get() !== null) return; original.set(layout.get()); mode.set('resize'); scheduleOnRN(begin); },
    onUpdate: (event) => {
      if (mode.get() !== 'resize') return;
      const next = resizeBlockLayout(original.get(), event.translationX, event.translationY, canvasWidth);
      layout.set(block.type === 'IMAGE' ? next : { ...original.get(), width: next.width });
    },
    onDeactivate: (event) => {
      if (mode.get() !== 'resize') return;
      if (event.canceled) layout.set(original.get()); else scheduleOnRN(onLayoutChange, layout.get());
    },
    onFinalize: (event) => {
      if (mode.get() !== 'resize') return;
      if (event.canceled) layout.set(original.get());
      mode.set(null); scheduleOnRN(onManipulating, false);
    },
  });
  const style = useAnimatedStyle(() => ({ width: layout.get().width * canvasWidth,
    transform: [{ translateX: layout.get().x * canvasWidth }, { translateY: layout.get().y }], zIndex: mode.get() !== null ? 100 : selected ? 2 : 1 }));
  const imageStyle = useAnimatedStyle(() => ({ height: canvasWidth * layout.get().width / (layout.get().ratio ?? 4 / 3) }));
  const label = LABELS[block.type];
  return <Animated.View onTouchStart={onSelect} onLayout={(event) => {
    if (mode.get() === null) onMeasure({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height });
  }} style={[styles.item, { paddingBottom: BLOCK_CHROME - 44, borderColor: selected ? theme.colors.accent : 'transparent' }, style]}>
    <View style={{ height: 44, flexDirection: 'row', alignItems: 'center' }}>
      <GestureDetector gesture={move}><View style={{ flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}
        accessible accessibilityRole="adjustable" accessibilityLabel={`Move ${label.toLowerCase()}`}
        accessibilityHint="Drag in any direction to move this block"
        accessibilityActions={[
          { name: 'left', label: 'Move left' }, { name: 'right', label: 'Move right' },
          { name: 'up', label: 'Move up' }, { name: 'down', label: 'Move down' },
        ]} onAccessibilityAction={(event) => {
          const name = event.nativeEvent.actionName;
          onLayoutChange(moveBlockLayout(frame, name === 'left' ? -24 : name === 'right' ? 24 : 0, name === 'up' ? -32 : name === 'down' ? 32 : 0, canvasWidth));
        }}>
        <Icon name="more" size={18} color="tertiaryLabel" />
        <Text variant="caption1" color="tertiaryLabel" numberOfLines={1}>{label}</Text>
      </View></GestureDetector>
      {selected && <PressableScale accessibilityLabel={`Delete ${label.toLowerCase()}`} onPress={onDelete}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="trash" color="dangerText" size={18} /></PressableScale>}
    </View>
    {renderBlock(block, frame.width * canvasWidth, imageStyle)}
    {(selected || block.type === 'IMAGE') && <GestureDetector gesture={resize}><View accessible accessibilityRole="adjustable" accessibilityLabel={`Resize ${label.toLowerCase()}`}
      accessibilityActions={[{ name: 'increment', label: `Enlarge ${label.toLowerCase()}` }, { name: 'decrement', label: `Shrink ${label.toLowerCase()}` }]}
      onAccessibilityAction={(event) => {
        const amount = event.nativeEvent.actionName === 'increment' ? 24 : -24;
        const next = resizeBlockLayout(frame, amount, amount / (frame.ratio ?? 4 / 3), canvasWidth);
        onLayoutChange(block.type === 'IMAGE' ? next : { ...frame, width: next.width });
      }} style={{ position: 'absolute', right: -8, bottom: -8, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: theme.colors.accent, borderWidth: 2, borderColor: theme.colors.background }} />
    </View></GestureDetector>}
  </Animated.View>;
}

const styles = StyleSheet.create({ item: { position: 'absolute', left: 0, top: 0, borderWidth: 1, borderRadius: 8 } });
