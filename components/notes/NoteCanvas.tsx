import { useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { Keyboard, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
import Animated, { scrollTo, useAnimatedStyle, useFrameCallback, useSharedValue, type AnimatedStyle } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { DragScrollContext } from '@/components/ui/DragScrollContext';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/lib/haptics';
import { canvasFrames, moveBlockLayout, scaleBlockLayout, textPlacement, type BlockFrame, type BlockLayout } from '@/lib/noteCanvas';
import type { NoteBlock } from '@/lib/repos/notes';

const LABELS = { TEXT: 'Text', IMAGE: 'Photo', VOICE: 'Audio', CHECKLIST: 'Checklist', DRAWING: 'Drawing' } as const;
const LONG_PRESS_MS = 300;
/** Blank page to touch below the last block; a short note simply fills the screen and doesn't scroll. */
const SPACE_BELOW = 160;
const DELETE_SIZE = 36;
/** Text blocks keep long press for native text selection, so only these can be picked up. */
const isMovable = (block: NoteBlock) => block.type === 'IMAGE' || block.type === 'VOICE' || block.type === 'DRAWING';

export type RenderBlock = (block: NoteBlock, width: number, imageStyle: AnimatedStyle<ViewStyle>,
  /** True once if this touch picked the block up, whose release must not also open it. */
  wasHeld: () => boolean) => ReactNode;

/**
 * The note's page. There are no boxes or handles: a touch on blank space puts the cursor at
 * the left edge of that line, a long press picks up a photo, audio clip or drawing to move
 * anywhere, and two fingers resize a photo. A block that was picked up offers its delete button
 * until the next touch on blank space.
 */
export function NoteCanvas({ blocks, width, selectedId, onSelect, onPlaceText, onFrames, onChangeLayout, onDelete, onManipulating, renderBlock }: {
  blocks: NoteBlock[]; width: number; selectedId: number | null; onSelect: (id: number | null) => void;
  onPlaceText: (layout: BlockLayout) => void; onChangeLayout: (layouts: Record<number, BlockLayout>) => void;
  onFrames: (frames: Record<number, BlockFrame>) => void;
  onDelete: (block: NoteBlock) => void; onManipulating: (active: boolean) => void;
  renderBlock: RenderBlock;
}) {
  const [measured, setMeasured] = useState<Record<number, { width: number; height: number }>>({});
  const frames = canvasFrames(blocks, width, measured);
  useLayoutEffect(() => { onFrames(frames); }, [frames, onFrames]);
  const bottom = Math.max(0, ...Object.values(frames).map((frame) => frame.y + frame.height));
  const change = (id: number, layout: BlockLayout) => onChangeLayout({ ...frames, [id]: layout });
  const selected = blocks.find((block) => block.id === selectedId);
  return <View style={{ flexGrow: 1, minHeight: bottom + SPACE_BELOW }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Write on this line" style={StyleSheet.absoluteFill}
      onPress={(event) => {
        if (selected && isMovable(selected)) onSelect(null);
        else onPlaceText(textPlacement(blocks, frames, event.nativeEvent.locationY));
      }} />
    {blocks.map((block) => <CanvasItem key={block.id} block={block} frame={frames[block.id]} canvasWidth={width}
      selected={selectedId === block.id} onSelect={() => onSelect(block.id)} onLayoutChange={(layout) => change(block.id, layout)}
      onDelete={() => onDelete(block)} onManipulating={onManipulating}
      onMeasure={(box) => setMeasured((current) => current[block.id]?.width === box.width && current[block.id]?.height === box.height
        ? current : { ...current, [block.id]: box })} renderBlock={renderBlock} />)}
  </View>;
}

function CanvasItem({ block, frame, canvasWidth, selected, onSelect, onLayoutChange, onDelete, onManipulating, onMeasure, renderBlock }: {
  block: NoteBlock; frame: BlockFrame; canvasWidth: number; selected: boolean; onSelect: () => void;
  onLayoutChange: (layout: BlockLayout) => void; onDelete: () => void; onManipulating: (active: boolean) => void;
  onMeasure: (box: { width: number; height: number }) => void;
  renderBlock: RenderBlock;
}) {
  const theme = useTheme();
  const scroll = useContext(DragScrollContext);
  const layout = useSharedValue<BlockLayout>(frame);
  const original = useSharedValue<BlockLayout>(frame);
  const mode = useSharedValue<'move' | 'pinch' | null>(null);
  const deltaY = useSharedValue(0);
  const fingerY = useSharedValue(0);
  const startScroll = useSharedValue(0);
  const held = useSharedValue(false);
  useEffect(() => {
    if (mode.get() === null) layout.set(frame);
  }, [frame, canvasWidth, layout, mode]);
  useEffect(() => () => onManipulating(false), [onManipulating]);
  const begin = () => { held.set(true); Keyboard.dismiss(); onSelect(); haptics.selection(); onManipulating(true); };
  const wasHeld = () => { const value = held.get(); held.set(false); return value; };
  const movable = isMovable(block);
  const move = usePanGesture({
    enabled: movable,
    maxPointers: 1,
    activateAfterLongPress: LONG_PRESS_MS,
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
  const pinch = usePinchGesture({
    enabled: block.type === 'IMAGE',
    onActivate: () => {
      if (mode.get() !== null) return;
      original.set(layout.get()); mode.set('pinch'); scheduleOnRN(onManipulating, true);
    },
    onUpdate: (event) => {
      if (mode.get() === 'pinch') layout.set(scaleBlockLayout(original.get(), event.scale, canvasWidth));
    },
    onDeactivate: (event) => {
      if (mode.get() !== 'pinch') return;
      if (event.canceled) layout.set(original.get());
      else scheduleOnRN(onLayoutChange, layout.get());
    },
    onFinalize: (event) => {
      if (mode.get() !== 'pinch') return;
      if (event.canceled) layout.set(original.get());
      mode.set(null); scheduleOnRN(onManipulating, false);
    },
  });
  const gesture = useSimultaneousGestures(move, pinch);
  const style = useAnimatedStyle(() => ({ width: layout.get().width * canvasWidth,
    transform: [{ translateX: layout.get().x * canvasWidth }, { translateY: layout.get().y }], zIndex: mode.get() !== null ? 100 : selected ? 2 : 1,
    boxShadow: mode.get() !== null ? theme.shadows.raised : 'none' }));
  const imageStyle = useAnimatedStyle(() => ({ height: canvasWidth * layout.get().width / (layout.get().ratio ?? 4 / 3) }));
  const label = LABELS[block.type].toLowerCase();
  const item = <Animated.View onTouchStart={() => { held.set(false); }} onLayout={(event) => {
    if (mode.get() === null) onMeasure({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height });
  }} style={[styles.item, style]}>
    {renderBlock(block, frame.width * canvasWidth, imageStyle, wasHeld)}
    {movable && selected && <PressableScale haptic="tap" accessibilityLabel={`Delete ${label}`} onPress={onDelete} hitSlop={theme.spacing.xs}
      style={[styles.delete, { top: -theme.spacing.sm, right: -theme.spacing.sm, backgroundColor: theme.colors.card, boxShadow: theme.shadows.raised }]}>
      <Icon name="trash" color="dangerText" size={theme.sizes.iconSmall} />
    </PressableScale>}
    {/* Holding and pinching cannot be performed with a screen reader; this offers the same moves. */}
    {movable && <View pointerEvents="none" accessible accessibilityRole="adjustable" accessibilityLabel={`Arrange ${label}`}
      accessibilityActions={[
        { name: 'left', label: 'Move left' }, { name: 'right', label: 'Move right' },
        { name: 'up', label: 'Move up' }, { name: 'down', label: 'Move down' },
        ...(block.type === 'IMAGE' ? [{ name: 'increment', label: 'Enlarge photo' }, { name: 'decrement', label: 'Shrink photo' }] : []),
        { name: 'delete', label: `Delete ${label}` },
      ]}
      onAccessibilityAction={(event) => {
        const name = event.nativeEvent.actionName;
        if (name === 'delete') onDelete();
        else if (name === 'increment' || name === 'decrement') onLayoutChange(scaleBlockLayout(frame, name === 'increment' ? 1.1 : 0.9, canvasWidth));
        else onLayoutChange(moveBlockLayout(frame, name === 'left' ? -24 : name === 'right' ? 24 : 0, name === 'up' ? -32 : name === 'down' ? 32 : 0, canvasWidth));
      }} style={styles.accessibilityHandle} />}
  </Animated.View>;
  return movable ? <GestureDetector gesture={gesture}>{item}</GestureDetector> : item;
}

const styles = StyleSheet.create({
  item: { position: 'absolute', left: 0, top: 0 },
  delete: { position: 'absolute', width: DELETE_SIZE, height: DELETE_SIZE, borderRadius: DELETE_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  accessibilityHandle: { position: 'absolute', top: 0, left: 0, width: 44, height: 44 },
});
