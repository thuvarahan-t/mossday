import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { textVariants } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { haptics } from '@/lib/haptics';
import { ContextMenu, type ContextMenuHandle } from './ContextMenu';
import { categoryDropIndex, moveCategory } from './categoryGridOrder';
import { IconTile } from './IconTile';
import type { IconName } from './Icon';
import { PressableScale, type PressableScaleProps } from './PressableScale';
import { Text } from './Text';

export type CategoryGridItem = { id: number; name: string; icon: IconName; color: string; isUserCreated?: number };
type CategoryGridProps = {
  items: CategoryGridItem[]; selected: number | null; onSelect: (id: number) => void; onCreate: () => void;
  onReorder?: (ids: number[]) => void; onDraggingChange?: (dragging: boolean) => void; disabled?: boolean;
  onDelete?: (id: number) => void; onEdit?: (id: number) => void;
};
type GridDrag = {
  order: SharedValue<number[]>; activeId: SharedValue<number | null>; startIndex: SharedValue<number>;
  x: SharedValue<number>; y: SharedValue<number>;
};

/** Positions and gap previews stay on the UI thread; only the final order is persisted. */
export function CategoryGrid({ items, selected, onSelect, onCreate, onReorder, onDraggingChange, disabled, onDelete, onEdit }: CategoryGridProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const gap = theme.spacing.sm;
  const tileWidth = Math.max(0, (width - gap * 2) / 3);
  const labelHeight = Math.ceil(textVariants.footnote.lineHeight * Math.min(fontScale, 1.6) * 2);
  const tileHeight = theme.sizes.iconTile + gap * 3 + labelHeight;
  const columnStep = tileWidth + gap;
  const rowStep = tileHeight + gap;
  const order = useSharedValue(items.map((item) => item.id));
  const activeId = useSharedValue<number | null>(null);
  const startIndex = useSharedValue(0);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const drag: GridDrag = { order, activeId, startIndex, x, y };
  useEffect(() => {
    // Save failures, additions and deletions reconcile to repository data after a drag.
    if (activeId.get() === null) order.set(items.map((item) => item.id));
  }, [items, activeId, order]);
  useEffect(() => () => onDraggingChange?.(false), [onDraggingChange]);
  const commit = (ids: number[]) => {
    if (!disabled && ids.some((id, index) => id !== items[index]?.id)) onReorder?.(ids);
  };
  const placeholderStyle = useAnimatedStyle(() => {
    const id = activeId.get();
    const index = id === null ? 0 : Math.max(0, order.get().indexOf(id));
    const left = index % 3 * columnStep;
    const top = Math.floor(index / 3) * rowStep;
    return {
      opacity: id === null ? 0 : 1,
      transform: [{ translateX: reduced ? left : animateTo(left, 'gentle', false) }, { translateY: reduced ? top : animateTo(top, 'gentle', false) }],
    };
  });
  return <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height: Math.ceil((items.length + 1) / 3) * rowStep - gap }}>
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[styles.cell, { width: tileWidth, height: tileHeight, borderRadius: theme.radii.lg, borderWidth: 1,
        borderStyle: 'dashed', borderColor: theme.colors.accent, backgroundColor: theme.colors.accentFill }, placeholderStyle]} />
    {items.map((item) => <CategoryTile key={item.id} item={item} selected={item.id === selected} drag={drag}
      width={tileWidth} height={tileHeight} labelHeight={labelHeight} gap={gap} disabled={disabled || !width} reorderable={!!onReorder}
      onSelect={() => { if (activeId.get() === null) onSelect(item.id); }} onCommit={commit} onDraggingChange={onDraggingChange}
      onEdit={onEdit ? () => onEdit(item.id) : undefined}
      onDelete={item.isUserCreated && onDelete ? () => onDelete(item.id) : undefined} />)}
    <PressableScale accessibilityLabel="New category" disabled={disabled} haptic="tap" onPress={() => { if (activeId.get() === null) onCreate(); }}
      style={[styles.cell, { left: items.length % 3 * columnStep, top: Math.floor(items.length / 3) * rowStep,
        width: tileWidth, height: tileHeight, padding: gap, gap, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radii.lg, backgroundColor: theme.colors.card }]}>
      <IconTile icon="plus" color="gray" neutral /><Text variant="footnote" align="center" style={{ height: labelHeight }}>New</Text>
    </PressableScale>
  </View>;
}

function CategoryTile({ item, selected, drag, width, height, labelHeight, gap, disabled, reorderable, onSelect, onCommit, onDraggingChange, onDelete, onEdit }: {
  item: CategoryGridItem; selected: boolean; drag: GridDrag; width: number; height: number; labelHeight: number; gap: number;
  disabled?: boolean; reorderable: boolean; onSelect: () => void; onCommit: (ids: number[]) => void;
  onDraggingChange?: (dragging: boolean) => void; onDelete?: () => void; onEdit?: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const { order, activeId, startIndex, x, y } = drag;
  const originalOrder = useSharedValue<number[]>([]);
  const moved = useSharedValue(false);
  const suppressSelection = useRef(false);
  const menu = useRef<ContextMenuHandle>(null);
  const openMenu = () => menu.current?.open();
  const activate = () => { suppressSelection.current = true; haptics.selection(); onDraggingChange?.(true); };
  const finish = () => onDraggingChange?.(false);
  const columnStep = width + gap;
  const rowStep = height + gap;
  const gesture = usePanGesture({
    enabled: (reorderable || !!onEdit || !!onDelete) && !disabled,
    activateAfterLongPress: 350,
    minDistance: 0,
    onActivate: () => {
      if (activeId.get() !== null) return;
      originalOrder.set(order.get().slice());
      startIndex.set(order.get().indexOf(item.id));
      moved.set(false); x.set(0); y.set(0); activeId.set(item.id);
      scheduleOnRN(activate);
    },
    onUpdate: (event) => {
      if (activeId.get() !== item.id) return;
      const from = startIndex.get();
      x.set(Math.max(-(from % 3) * columnStep, Math.min((2 - from % 3) * columnStep, event.translationX)));
      y.set(Math.max(-Math.floor(from / 3) * rowStep, Math.min((Math.ceil(order.get().length / 3) - 1 - Math.floor(from / 3)) * rowStep, event.translationY)));
      if (Math.abs(event.translationX) > 10 || Math.abs(event.translationY) > 10) moved.set(true);
      if (!reorderable || !moved.get()) return;
      const target = categoryDropIndex(from, x.get(), y.get(), columnStep, rowStep, order.get().length);
      if (target !== order.get().indexOf(item.id)) {
        order.set(moveCategory(order.get(), item.id, target));
        scheduleOnRN(haptics.selection);
      }
    },
    onDeactivate: (event) => {
      if (activeId.get() !== item.id) return;
      if (event.canceled) { order.set(originalOrder.get()); return; }
      if (!moved.get()) { if (onEdit || onDelete) scheduleOnRN(openMenu); return; }
      if (reorderable) scheduleOnRN(onCommit, order.get().slice());
    },
    onFinalize: (event) => {
      if (activeId.get() !== item.id) return;
      if (event.canceled) order.set(originalOrder.get());
      activeId.set(null);
      scheduleOnRN(finish);
    },
  });
  const style = useAnimatedStyle(() => {
    const index = Math.max(0, order.get().indexOf(item.id));
    const active = activeId.get() === item.id;
    const left = index % 3 * columnStep;
    const top = Math.floor(index / 3) * rowStep;
    return {
      transform: [
        { translateX: active ? startIndex.get() % 3 * columnStep + x.get() : reduced ? left : animateTo(left, 'gentle', false) },
        { translateY: active ? Math.floor(startIndex.get() / 3) * rowStep + y.get() : reduced ? top : animateTo(top, 'gentle', false) },
        { scale: reduced ? 1 : animateTo(active ? 1.04 : 1, 'snappy', false) },
      ],
      zIndex: active ? 10 : 1,
      boxShadow: active ? theme.shadows.raised : 'none',
    };
  });
  const triggerProps: PressableScaleProps = {
    disabled,
    onPressIn: () => { suppressSelection.current = false; },
    accessibilityState: { selected },
    accessibilityHint: onDelete || onEdit ? 'Long press for more actions, or drag to reorder' : reorderable ? 'Long press and drag to reorder' : undefined,
    accessibilityActions: reorderable ? [{ name: 'moveEarlier', label: 'Move earlier' }, { name: 'moveLater', label: 'Move later' }] : [],
    onAccessibilityAction: (event) => {
      if (disabled || activeId.get() !== null) return;
      const direction = event.nativeEvent.actionName === 'moveEarlier' ? -1 : event.nativeEvent.actionName === 'moveLater' ? 1 : 0;
      if (direction) onCommit(moveCategory(order.get(), item.id, order.get().indexOf(item.id) + direction));
    },
  };
  const select = () => { if (!suppressSelection.current) onSelect(); };
  const content = <View style={{ height, padding: gap, gap, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radii.lg,
    backgroundColor: selected ? theme.colors.accentFill : theme.colors.card }}>
    <IconTile icon={item.icon} color={item.color} />
    <Text variant="footnote" align="center" numberOfLines={2} style={{ height: labelHeight }}>{item.name}</Text>
  </View>;
  return <GestureDetector gesture={gesture}>
    <Animated.View style={[styles.cell, { width, height, borderRadius: theme.radii.lg }, style]}>
      {onDelete || onEdit ? <ContextMenu ref={menu} manualTrigger triggerProps={triggerProps} accessibilityLabel={item.name} onPress={select}
        actions={[
          ...(onEdit ? [{ label: 'Edit', icon: 'edit' as const, onPress: onEdit }] : []),
          ...(onDelete ? [{ label: 'Delete', icon: 'trash' as const, destructive: true, onPress: onDelete }] : []),
        ]}>{content}</ContextMenu>
        : <PressableScale {...triggerProps} haptic="selection" accessibilityLabel={item.name} onPress={select}>{content}</PressableScale>}
    </Animated.View>
  </GestureDetector>;
}

const styles = StyleSheet.create({ cell: { position: 'absolute', left: 0, top: 0 } });
