import { useRef, useState } from 'react';
import { View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '@/hooks/useTheme';
import { haptics } from '@/lib/haptics';
import { ContextMenu, type ContextMenuHandle } from './ContextMenu';
import { IconTile } from './IconTile';
import type { IconName } from './Icon';
import { PressableScale, type PressableScaleProps } from './PressableScale';
import { Text } from './Text';

export type CategoryGridItem = { id: number; name: string; icon: IconName; color: string; isUserCreated?: number };
type CategoryGridProps = {
  items: CategoryGridItem[]; selected: number | null; onSelect: (id: number) => void; onCreate: () => void;
  onReorder?: (ids: number[]) => void; onDraggingChange?: (dragging: boolean) => void; disabled?: boolean;
  onDelete?: (id: number) => void;
  onEdit?: (id: number) => void;
};

/** Compact picker. Long press a tile, drag to its destination, then release to insert. */
export function CategoryGrid({ items, selected, onSelect, onCreate, onReorder, onDraggingChange, disabled, onDelete, onEdit }: CategoryGridProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const gap = theme.spacing.sm;
  const tileWidth = Math.max(0, (width - gap * 2) / 3);
  const move = (from: number, to: number) => {
    const target = Math.max(0, Math.min(items.length - 1, to));
    if (from === target || disabled) return;
    const ids = items.map((item) => item.id);
    const [id] = ids.splice(from, 1);
    ids.splice(target, 0, id);
    onReorder?.(ids);
  };
  return <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
    {items.map((item, index) => <CategoryTile key={item.id} item={item} selected={item.id === selected}
      width={tileWidth} gap={gap} index={index} disabled={disabled} reorderable={!!onReorder}
      onSelect={() => onSelect(item.id)} onMove={(target) => move(index, target)} onDraggingChange={onDraggingChange}
      onEdit={onEdit ? () => onEdit(item.id) : undefined}
      onDelete={item.isUserCreated && onDelete ? () => onDelete(item.id) : undefined} />)}
    <PressableScale accessibilityLabel="New category" disabled={disabled} haptic="tap" onPress={onCreate}
      style={{ width: tileWidth, minHeight: 88, padding: gap, gap, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radii.lg, backgroundColor: theme.colors.card }}>
      <IconTile icon="plus" color="gray" neutral /><Text variant="footnote">New</Text>
    </PressableScale>
  </View>;
}

function CategoryTile({ item, selected, width, gap, index, disabled, reorderable, onSelect, onMove, onDraggingChange, onDelete, onEdit }: {
  item: CategoryGridItem; selected: boolean; width: number; gap: number; index: number;
  disabled?: boolean; reorderable: boolean; onSelect: () => void; onMove: (target: number) => void;
  onDraggingChange?: (dragging: boolean) => void;
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const height = useSharedValue(88);
  const dragging = useSharedValue(false);
  const suppressSelection = useRef(false);
  const menu = useRef<ContextMenuHandle>(null);
  const openMenu = () => menu.current?.open();
  const activate = () => { suppressSelection.current = true; haptics.selection(); onDraggingChange?.(true); };
  const finish = () => onDraggingChange?.(false);
  const gesture = usePanGesture({
    enabled: reorderable && !disabled,
    activateAfterLongPress: 350,
    minDistance: 0,
    onActivate: () => { dragging.set(true); scheduleOnRN(activate); },
    onUpdate: (event) => { x.set(event.translationX); y.set(event.translationY); },
    onDeactivate: (event) => {
      if (event.canceled) return;
      if (Math.abs(event.translationX) < 10 && Math.abs(event.translationY) < 10) {
        if (onDelete || onEdit) scheduleOnRN(openMenu);
        return;
      }
      const column = Math.max(0, Math.min(2, index % 3 + Math.round(event.translationX / Math.max(1, width + gap))));
      const row = Math.max(0, Math.floor(index / 3) + Math.round(event.translationY / (height.get() + gap)));
      scheduleOnRN(onMove, row * 3 + column);
    },
    onFinalize: () => { x.set(0); y.set(0); dragging.set(false); scheduleOnRN(finish); },
  });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: dragging.get() && !reduced ? 1.04 : 1 }],
    zIndex: dragging.get() ? 10 : 0, opacity: dragging.get() ? 0.85 : 1,
  }));
  const triggerProps: PressableScaleProps = {
    disabled,
    onPressIn: () => { suppressSelection.current = false; },
    accessibilityState: { selected },
    accessibilityHint: onDelete || onEdit ? 'Long press for more actions, or drag to reorder' : reorderable ? 'Long press and drag to reorder' : undefined,
    accessibilityActions: reorderable ? [{ name: 'moveEarlier', label: 'Move earlier' }, { name: 'moveLater', label: 'Move later' }] : [],
    onAccessibilityAction: (event) => {
      if (event.nativeEvent.actionName === 'moveEarlier') onMove(index - 1);
      if (event.nativeEvent.actionName === 'moveLater') onMove(index + 1);
    },
  };
  const select = () => { if (!suppressSelection.current) onSelect(); };
  const tileStyle: PressableScaleProps['style'] = {
    minHeight: 88, padding: gap, gap, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radii.lg,
    backgroundColor: selected ? theme.colors.accentFill : theme.colors.card,
  };
  const content = <View style={tileStyle}>
    <IconTile icon={item.icon} color={item.color} />
    <Text variant="footnote" align="center" numberOfLines={2} style={{ minHeight: 36 }}>{item.name}</Text>
  </View>;
  return <GestureDetector gesture={gesture}>
    <Animated.View style={[{ width }, style]} layout={reduced ? undefined : LinearTransition}
      onLayout={(event) => height.set(Math.max(1, event.nativeEvent.layout.height))}>
      {onDelete || onEdit ? <ContextMenu ref={menu} manualTrigger triggerProps={triggerProps} accessibilityLabel={item.name} onPress={select}
        actions={[
          ...(onEdit ? [{ label: 'Edit', icon: 'edit' as const, onPress: onEdit }] : []),
          ...(onDelete ? [{ label: 'Delete', icon: 'trash' as const, destructive: true, onPress: onDelete }] : []),
        ]}>{content}</ContextMenu>
        : <PressableScale {...triggerProps} haptic="selection" accessibilityLabel={item.name} onPress={select}>{content}</PressableScale>}
    </Animated.View>
  </GestureDetector>;
}
