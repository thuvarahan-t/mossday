import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type AccessibilityActionEvent, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { haptics } from '@/lib/haptics';
import { moveItem, stackDropIndex, stackTops } from './listOrder';

type StackDrag = {
  order: SharedValue<number[]>; heights: SharedValue<Record<number, number>>; activeId: SharedValue<number | null>;
  /** Rows glide only during and after a drag; mounting and data refreshes place them instantly. */
  animating: SharedValue<boolean>; startTop: SharedValue<number>; dragY: SharedValue<number>; gap: number;
};
type StackItem = {
  id: number; drag: StackDrag; disabled: boolean;
  commit: (ids: number[]) => void; setDragging: (dragging: boolean) => void;
};

const StackItemContext = createContext<StackItem | null>(null);
const LONG_PRESS_MS = 350;
const MOVE_THRESHOLD = 10;

/**
 * A vertical list of rows with different heights, reordered by holding a `ReorderHandle`
 * and dragging. Positions and drop previews stay on the UI thread; only the final order is
 * passed to `onReorder`, and a failed save (`false`) snaps the rows back to `items`.
 */
export function ReorderableStack<T extends { id: number }>({ items, gap, renderItem, onReorder, onDraggingChange, disabled = false }: {
  items: readonly T[]; gap: number; renderItem: (item: T) => ReactNode;
  onReorder: (ids: number[]) => Promise<boolean>; onDraggingChange?: (dragging: boolean) => void; disabled?: boolean;
}) {
  const reduced = useReducedMotion();
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const latestIds = useRef(ids);
  useEffect(() => { latestIds.current = ids; }, [ids]);
  const [measuredHeights, setMeasuredHeights] = useState<Record<number, number>>({});
  const drag: StackDrag = {
    order: useSharedValue(ids), heights: useSharedValue<Record<number, number>>({}), activeId: useSharedValue<number | null>(null),
    animating: useSharedValue(false), startTop: useSharedValue(0), dragY: useSharedValue(0), gap,
  };
  const { order, activeId, animating } = drag;
  useEffect(() => {
    // Additions, deletions and outside changes are placed instantly. A just-saved drag
    // already matches `order`, so the dropped row keeps gliding into its slot.
    const current = order.get();
    if (activeId.get() !== null || (ids.length === current.length && ids.every((id, index) => id === current[index]))) return;
    order.set(ids);
    animating.set(false);
  }, [ids, activeId, animating, order]);
  useEffect(() => () => onDraggingChange?.(false), [onDraggingChange]);
  // Rows render in normal flow until each has a height, then move to absolute positions.
  const placed = items.every((item) => measuredHeights[item.id] !== undefined);
  const total = items.reduce((sum, item) => sum + (measuredHeights[item.id] ?? 0), 0) + gap * Math.max(0, items.length - 1);
  // React state is the source of truth. Copying the shared value on the JS thread instead
  // lost heights when several rows measured in one frame, so rows stacked on each other.
  const { heights } = drag;
  useLayoutEffect(() => { heights.set(measuredHeights); }, [heights, measuredHeights]);
  const measure = (id: number, height: number) => {
    setMeasuredHeights((current) => current[id] === height ? current : { ...current, [id]: height });
  };
  const commit = (next: number[]) => {
    if (disabled || next.every((id, index) => id === latestIds.current[index])) return;
    void onReorder(next).then((saved) => { if (!saved && activeId.get() === null) order.set(latestIds.current); });
  };
  const setDragging = (dragging: boolean) => onDraggingChange?.(dragging);
  return <View style={placed ? { height: total } : { gap }}>
    {items.map((item) => <StackRow key={item.id} id={item.id} drag={drag} placed={placed} reduced={reduced} onMeasure={measure}>
      <StackItemContext.Provider value={{ id: item.id, drag, disabled, commit, setDragging }}>{renderItem(item)}</StackItemContext.Provider>
    </StackRow>)}
  </View>;
}

function StackRow({ id, drag, placed, reduced, onMeasure, children }: {
  id: number; drag: StackDrag; placed: boolean; reduced: boolean; onMeasure: (id: number, height: number) => void; children: ReactNode;
}) {
  const raised = useTheme().shadows.raised;
  const { order, heights, activeId, animating, startTop, dragY, gap } = drag;
  const style = useAnimatedStyle(() => {
    // Every branch sets the same keys: Reanimated does not reset keys a later frame omits.
    if (!placed) return { transform: [{ translateY: 0 }, { scale: 1 }], zIndex: 0, boxShadow: 'none' };
    const active = activeId.get() === id;
    const top = stackTops(order.get(), heights.get(), gap)[id] ?? 0;
    const glide = animating.get() && !reduced;
    return {
      transform: [
        { translateY: active ? startTop.get() + dragY.get() : glide ? animateTo(top, 'gentle', false) : top },
        { scale: reduced ? 1 : animateTo(active ? 1.02 : 1, 'snappy', false) },
      ],
      zIndex: active ? 10 : 1,
      boxShadow: active ? raised : 'none',
    };
  });
  return <Animated.View style={[placed && styles.placed, style]} onLayout={(event) => onMeasure(id, Math.ceil(event.nativeEvent.layout.height))}>{children}</Animated.View>;
}

/**
 * The part of a row that starts a drag. Hold and drag to move the row; hold and release
 * without moving calls `onHold` (for example to open the row's context menu).
 */
export function ReorderHandle({ children, onHold, style }: { children: ReactNode; onHold?: () => void; style?: StyleProp<ViewStyle> }) {
  const item = useContext(StackItemContext);
  const originalOrder = useSharedValue<number[]>([]);
  const moved = useSharedValue(false);
  // Plain values and functions, captured directly by the gesture worklets.
  const id = item?.id ?? -1;
  const drag = item?.drag;
  const commit = item?.commit;
  const setDragging = item?.setDragging;
  const gesture = usePanGesture({
    enabled: !!item && !item.disabled,
    activateAfterLongPress: LONG_PRESS_MS,
    minDistance: 0,
    onActivate: () => {
      if (!drag || drag.activeId.get() !== null) return;
      originalOrder.set(drag.order.get().slice());
      drag.startTop.set(stackTops(drag.order.get(), drag.heights.get(), drag.gap)[id] ?? 0);
      drag.dragY.set(0); moved.set(false); drag.animating.set(true); drag.activeId.set(id);
      scheduleOnRN(haptics.selection);
      if (setDragging) scheduleOnRN(setDragging, true);
    },
    onUpdate: (event) => {
      if (!drag || drag.activeId.get() !== id) return;
      const heights = drag.heights.get();
      const order = drag.order.get();
      const bottom = order.reduce((sum, row) => sum + (heights[row] ?? 0), 0) + drag.gap * Math.max(0, order.length - 1) - (heights[id] ?? 0);
      drag.dragY.set(Math.max(-drag.startTop.get(), Math.min(bottom - drag.startTop.get(), event.translationY)));
      if (Math.abs(event.translationY) > MOVE_THRESHOLD) moved.set(true);
      if (!moved.get()) return;
      const target = stackDropIndex(order, heights, drag.gap, id, drag.startTop.get() + drag.dragY.get());
      if (target !== order.indexOf(id)) {
        drag.order.set(moveItem(order, id, target));
        scheduleOnRN(haptics.selection);
      }
    },
    onDeactivate: (event) => {
      if (!drag || !commit || drag.activeId.get() !== id) return;
      if (event.canceled) { drag.order.set(originalOrder.get()); return; }
      if (!moved.get()) { if (onHold) scheduleOnRN(onHold); return; }
      scheduleOnRN(commit, drag.order.get().slice());
    },
    onFinalize: (event) => {
      if (!drag || !setDragging || drag.activeId.get() !== id) return;
      if (event.canceled) drag.order.set(originalOrder.get());
      drag.activeId.set(null);
      scheduleOnRN(setDragging, false);
    },
  });
  if (!item) return <View style={style}>{children}</View>;
  return <GestureDetector gesture={gesture}><View style={style}>{children}</View></GestureDetector>;
}

/** Move Up / Move Down accessibility actions for the row's main control (spread into its props). */
export function useReorderActions() {
  const item = useContext(StackItemContext);
  if (!item) return {};
  return {
    accessibilityActions: [{ name: 'moveUp', label: 'Move up' }, { name: 'moveDown', label: 'Move down' }],
    onAccessibilityAction: (event: AccessibilityActionEvent) => {
      const { order, activeId } = item.drag;
      const offset = event.nativeEvent.actionName === 'moveUp' ? -1 : event.nativeEvent.actionName === 'moveDown' ? 1 : 0;
      if (!offset || item.disabled || activeId.get() !== null) return;
      item.commit(moveItem(order.get(), item.id, order.get().indexOf(item.id) + offset));
    },
  };
}

const styles = StyleSheet.create({ placed: { position: 'absolute', left: 0, right: 0, top: 0 } });
