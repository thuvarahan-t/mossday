import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { scrollTo, useAnimatedStyle, useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { haptics } from '@/lib/haptics';
import { ContextMenu, type ContextMenuAction, type ContextMenuHandle } from './ContextMenu';
import { DragScrollContext } from './DragScrollContext';
import { moveItem } from './listOrder';
import { masonryDropIndex, masonryLayout, masonryTargets, type MasonrySlot } from './masonryOrder';

type GridDrag = {
  order: SharedValue<number[]>; activeId: SharedValue<number | null>; heights: SharedValue<Record<number, number>>;
  x: SharedValue<number>; y: SharedValue<number>; fingerY: SharedValue<number>; startScroll: SharedValue<number>;
  targets: SharedValue<MasonrySlot[]>; moved: SharedValue<boolean>;
};

/** Cards retain their React identity across columns; only UI-thread positions change during a drag. */
export function ReorderableMasonryGrid<T extends { id: number }>({ items, estimateHeight, renderItem, label, actions, onPress, onReorder, onDraggingChange }: {
  items: readonly T[]; estimateHeight: (item: T, width: number) => number; renderItem: (item: T, width: number) => ReactNode;
  label: (item: T) => string; actions: (item: T) => ContextMenuAction[]; onPress: (item: T) => void;
  onReorder: (ids: number[]) => Promise<boolean>; onDraggingChange: (active: boolean) => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const scroll = useContext(DragScrollContext);
  const [width, setWidth] = useState(0);
  const [measured, setMeasured] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const gap = theme.spacing.md;
  const inset = theme.sizes.screenInset;
  const columnWidth = Math.max(1, (width - inset * 2 - gap) / 2);
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const latestIds = useRef(ids);
  const sourceIds = useRef(ids);
  useLayoutEffect(() => { latestIds.current = ids; }, [ids]);
  const drag: GridDrag = {
    order: useSharedValue(ids), activeId: useSharedValue<number | null>(null), heights: useSharedValue<Record<number, number>>({}),
    x: useSharedValue(0), y: useSharedValue(0), fingerY: useSharedValue(0), startScroll: useSharedValue(0),
    targets: useSharedValue<MasonrySlot[]>([]), moved: useSharedValue(false),
  };
  const { order, activeId, heights, x, y, moved, targets, fingerY, startScroll } = drag;
  useEffect(() => {
    // Parent rerenders during a save still contain the old query. Keep the drop preview
    // until the repository publishes a different sequence (or the save rolls back).
    if (ids.length === sourceIds.current.length && ids.every((id, index) => id === sourceIds.current[index])) return;
    if (activeId.get() === null) { sourceIds.current = ids; order.set(ids); }
  }, [ids, activeId, order]);
  useEffect(() => () => onDraggingChange(false), [onDraggingChange]);
  useLayoutEffect(() => {
    const next: Record<number, number> = {};
    for (const item of items) next[item.id] = measured[item.id] ?? estimateHeight(item, columnWidth);
    heights.set(next);
  }, [items, measured, estimateHeight, columnWidth, heights]);
  const layout = useDerivedValue(() => masonryLayout(order.get(), heights.get(), columnWidth, gap));
  const gridStyle = useAnimatedStyle(() => ({ height: layout.get().height }));
  const placeholderStyle = useAnimatedStyle(() => {
    const id = activeId.get();
    const slot = id === null ? { x: 0, y: 0 } : layout.get().slots[id] ?? { x: 0, y: 0 };
    return { opacity: id === null ? 0 : 1, height: id === null ? 0 : heights.get()[id] ?? 0,
      transform: [{ translateX: slot.x }, { translateY: slot.y }] };
  });
  useFrameCallback((frame) => {
    const id = activeId.get();
    if (id === null || !moved.get() || !scroll) return;
    const edge = 64;
    const finger = fingerY.get();
    const velocity = finger < scroll.top.get() + edge ? -Math.min(1, (scroll.top.get() + edge - finger) / edge)
      : finger > scroll.bottom.get() - edge ? Math.min(1, (finger - scroll.bottom.get() + edge) / edge) : 0;
    const next = Math.max(0, Math.min(scroll.max.get(), scroll.offset.get() + velocity * Math.min(frame.timeSincePreviousFrame ?? 16, 32) * 0.5));
    if (next !== scroll.offset.get()) {
      scrollTo(scroll.ref, 0, next, false);
      scroll.offset.set(next);
    }
    const current = order.get();
    const target = masonryDropIndex(targets.get(), x.get(), y.get() + next - startScroll.get(), current.indexOf(id));
    if (target !== current.indexOf(id)) { order.set(moveItem(current, id, target)); scheduleOnRN(haptics.selection); }
  });
  const commit = (next: number[]) => {
    if (saving || next.every((id, index) => id === latestIds.current[index])) return;
    setSaving(true);
    void onReorder(next).then((saved) => {
      if (!saved) order.set(latestIds.current);
    }).finally(() => setSaving(false));
  };
  return <View onLayout={(event) => {
    const next = event.nativeEvent.layout.width;
    if (next !== width) { setWidth(next); setMeasured({}); }
  }} style={{ paddingHorizontal: inset }}>
    <Animated.View style={gridStyle}>
      <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[styles.cell, { width: columnWidth, borderRadius: theme.radii.card, borderWidth: 1, borderStyle: 'dashed',
          borderColor: theme.colors.accent, backgroundColor: theme.colors.accentFill }, placeholderStyle]} />
      {!!width && items.map((item) => <MasonryCard key={item.id} id={item.id} drag={drag} width={columnWidth} gap={gap} reduced={reduced}
        layout={layout}
        disabled={saving} label={label(item)} actions={actions(item)} onPress={() => onPress(item)} onCommit={commit}
        onDraggingChange={onDraggingChange} onMeasure={(height) => setMeasured((current) => current[item.id] === height ? current : { ...current, [item.id]: height })}>
        {renderItem(item, columnWidth)}
      </MasonryCard>)}
    </Animated.View>
  </View>;
}

function MasonryCard({ id, drag, width, gap, reduced, layout, disabled, label, actions, onPress, onCommit, onDraggingChange, onMeasure, children }: {
  id: number; drag: GridDrag; width: number; gap: number; reduced: boolean; disabled: boolean; label: string; actions: ContextMenuAction[];
  layout: SharedValue<ReturnType<typeof masonryLayout>>;
  onPress: () => void; onCommit: (ids: number[]) => void; onDraggingChange: (active: boolean) => void;
  onMeasure: (height: number) => void; children: ReactNode;
}) {
  const theme = useTheme();
  const scroll = useContext(DragScrollContext);
  const menu = useRef<ContextMenuHandle>(null);
  const suppressPress = useRef(false);
  const original = useSharedValue<number[]>([]);
  const origin = useSharedValue<MasonrySlot>({ x: 0, y: 0 });
  const { order, activeId, heights, x, y, moved, targets, fingerY, startScroll } = drag;
  const activate = () => { suppressPress.current = true; haptics.selection(); onDraggingChange(true); };
  const openMenu = () => menu.current?.open();
  const gesture = usePanGesture({
    // minDistance: 0 activates Android's pan on touch-down, before its hold timer.
    // Keep the native movement threshold so a quick tap reaches the note's onPress.
    enabled: !disabled, activateAfterLongPress: 350,
    onActivate: (event) => {
      if (activeId.get() !== null) return;
      original.set(order.get().slice());
      const slot = masonryLayout(order.get(), heights.get(), width, gap).slots[id];
      origin.set(slot); x.set(slot.x); y.set(slot.y); fingerY.set(event.absoluteY);
      startScroll.set(scroll?.offset.get() ?? 0);
      targets.set(masonryTargets(order.get(), heights.get(), width, gap, id));
      moved.set(false); activeId.set(id); scheduleOnRN(activate);
    },
    onUpdate: (event) => {
      if (activeId.get() !== id) return;
      x.set(Math.max(0, Math.min(width + gap, origin.get().x + event.translationX)));
      y.set(origin.get().y + event.translationY); fingerY.set(event.absoluteY);
      if (Math.abs(event.translationX) > 10 || Math.abs(event.translationY) > 10) moved.set(true);
      if (!moved.get()) return;
      const current = order.get();
      const target = masonryDropIndex(targets.get(), x.get(), y.get() + (scroll?.offset.get() ?? 0) - startScroll.get(), current.indexOf(id));
      if (target !== current.indexOf(id)) { order.set(moveItem(current, id, target)); scheduleOnRN(haptics.selection); }
    },
    onDeactivate: (event) => {
      if (activeId.get() !== id) return;
      if (event.canceled) { order.set(original.get()); return; }
      if (!moved.get()) { scheduleOnRN(openMenu); return; }
      scheduleOnRN(onCommit, order.get().slice());
    },
    onFinalize: (event) => {
      if (activeId.get() !== id) return;
      if (event.canceled) order.set(original.get());
      activeId.set(null); scheduleOnRN(onDraggingChange, false);
    },
  });
  const style = useAnimatedStyle(() => {
    const active = activeId.get() === id;
    const slot = layout.get().slots[id] ?? { x: 0, y: 0 };
    return { zIndex: active ? 10 : 1, boxShadow: active ? theme.shadows.raised : 'none',
      transform: [
        { translateX: active ? x.get() : reduced ? slot.x : animateTo(slot.x, 'gentle', false) },
        { translateY: active ? y.get() + (scroll?.offset.get() ?? 0) - startScroll.get() : reduced ? slot.y : animateTo(slot.y, 'gentle', false) },
        { scale: reduced ? 1 : animateTo(active ? 1.03 : 1, 'snappy', false) },
      ] };
  });
  return <GestureDetector gesture={gesture}><Animated.View onLayout={(event) => onMeasure(Math.ceil(event.nativeEvent.layout.height))}
    style={[styles.cell, { width, borderRadius: theme.radii.card }, style]}>
    <ContextMenu ref={menu} manualTrigger accessibilityLabel={label} actions={actions}
      onPress={() => { if (!suppressPress.current && activeId.get() === null) onPress(); }}
      triggerProps={{ disabled, onPressIn: () => { suppressPress.current = false; },
        accessibilityHint: 'Hold and drag to reorder. Hold and release for more actions.',
        accessibilityActions: [{ name: 'moveEarlier', label: 'Move earlier' }, { name: 'moveLater', label: 'Move later' }],
        onAccessibilityAction: (event) => {
          if (disabled || activeId.get() !== null) return;
          const delta = event.nativeEvent.actionName === 'moveEarlier' ? -1 : event.nativeEvent.actionName === 'moveLater' ? 1 : 0;
          if (delta) onCommit(moveItem(order.get(), id, order.get().indexOf(id) + delta));
        },
      }}>{children}</ContextMenu>
  </Animated.View></GestureDetector>;
}

const styles = StyleSheet.create({ cell: { position: 'absolute', left: 0, top: 0 } });
