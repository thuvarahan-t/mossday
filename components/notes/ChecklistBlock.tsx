import { useEffect, useRef, useState } from 'react';
import { Platform, View, type TextInputInstance } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { Checkbox } from '@/components/ui/Checkbox';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { StrikeText } from '@/components/ui/StrikeText';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useTheme } from '@/hooks/useTheme';
import { checklistItems, type ChecklistItem } from '@/lib/repos/notes';
import { checklistOrder } from './noteText';

const move = LinearTransition.springify().damping(24).stiffness(260);

/**
 * A Google Keep checklist. Return adds the next item, Backspace on an empty item removes it,
 * and ticking an item moves it under an "N ticked items" fold that can be closed. Items
 * glide to their new place. `onChange` gets a group for typing, so a burst of typing in one
 * item is one undo step, and `null` for everything else.
 */
export function ChecklistBlock({ blockId, content, onChange, onFocus, autoFocus }: {
  blockId: number; content: string | null;
  /** A checklist just added from the toolbar: start typing in its first item. */
  autoFocus?: boolean;
  onChange: (content: string, group: string | null) => void;
  onFocus?: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const items = checklistItems(content);
  // Items are stored without ids; these keep each row's identity across inserts and removals
  // made here, and are renewed when the list changes some other way (undo).
  const [ids, setIds] = useState(() => items.map((_, index) => index));
  const fresh = () => Math.max(-1, ...ids) + 1;
  let rowIds = ids;
  if (ids.length !== items.length) {
    const first = fresh();
    rowIds = items.map((_, index) => first + index);
    setIds(rowIds);
  }
  const inputs = useRef(new Map<number, TextInputInstance>());
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const pendingFocus = useRef<number | null>(autoFocus ? rowIds[0] ?? null : null);
  const [foldOpen, setFoldOpen] = useState(true);
  useEffect(() => {
    if (pendingFocus.current === null) return;
    inputs.current.get(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  });

  const save = (next: ChecklistItem[], group: string | null = null) => onChange(JSON.stringify(next), group);
  const insertAfter = (index: number) => {
    const id = fresh();
    const next = [...items];
    next.splice(index + 1, 0, { text: '', done: false });
    setIds(rowIds.toSpliced(index + 1, 0, id));
    pendingFocus.current = id;
    save(next);
  };
  const remove = (index: number) => {
    const { open } = checklistOrder(items);
    const above = open[open.indexOf(index) - 1];
    if (above !== undefined) pendingFocus.current = rowIds[above];
    setIds(rowIds.toSpliced(index, 1));
    save(items.filter((_, i) => i !== index));
  };
  const update = (index: number, change: Partial<ChecklistItem>, group: string | null) => save(items.map((item, i) => i === index ? { ...item, ...change } : item), group);

  const { open, done } = checklistOrder(items);
  const layout = reduced || Platform.OS === 'web' ? undefined : move;
  const row = (index: number) => {
    const item = items[index];
    const id = rowIds[index];
    return <Animated.View key={id} layout={layout} entering={reduced ? undefined : FadeIn} exiting={reduced ? undefined : FadeOut}
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: theme.sizes.touchTarget }}>
      <Checkbox checked={item.done} accessibilityLabel={item.text || 'List item'} onToggle={() => update(index, { done: !item.done }, null)} />
      <View style={{ flex: 1 }}>
        {item.done ? <StrikeText struck>{item.text}</StrikeText>
          : <TextField ref={(input) => { if (input) inputs.current.set(id, input); else inputs.current.delete(id); }}
            value={item.text} appearance="bare" multiline submitBehavior="submit" returnKeyType="next" placeholder="List item" accessibilityLabel="List item"
            onFocus={() => { setFocusedId(id); onFocus?.(); }} onBlur={() => setFocusedId((current) => current === id ? null : current)}
            onChangeText={(text) => update(index, { text }, `check:${blockId}:${id}`)}
            onSubmitEditing={() => insertAfter(index)}
            onKeyPress={(event) => { if (event.nativeEvent.key === 'Backspace' && !item.text) remove(index); }} />}
      </View>
      {focusedId === id || item.done ? <PressableScale haptic="tap" hitSlop={theme.spacing.sm} accessibilityLabel={`Delete ${item.text || 'item'}`} onPress={() => remove(index)}>
        <Icon name="close" size={theme.sizes.iconSmall} color="tertiaryLabel" />
      </PressableScale> : null}
    </Animated.View>;
  };

  return <View>
    {open.map(row)}
    <Animated.View layout={layout}>
      <PressableScale haptic="tap" accessibilityLabel="Add list item" onPress={() => insertAfter(open.at(-1) ?? -1)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: theme.sizes.touchTarget }}>
        <View style={{ width: theme.sizes.checkbox, alignItems: 'center' }}><Icon name="plus" size={theme.sizes.iconSmall} color="secondaryLabel" /></View>
        <Text color="secondaryLabel">List item</Text>
      </PressableScale>
    </Animated.View>
    {done.length > 0 && <>
      <Animated.View layout={layout} style={{ height: 1, backgroundColor: theme.colors.separator, marginVertical: theme.spacing.xs }} />
      <Animated.View layout={layout}>
        <PressableScale haptic="selection" accessibilityRole="button" accessibilityState={{ expanded: foldOpen }} onPress={() => setFoldOpen((value) => !value)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: theme.sizes.touchTarget }}>
          <View style={{ width: theme.sizes.checkbox, alignItems: 'center', transform: [{ rotate: foldOpen ? '0deg' : '-90deg' }] }}>
            <Icon name="chevronDown" size={theme.sizes.iconSmall} color="secondaryLabel" />
          </View>
          <Text variant="subheadline" color="secondaryLabel">{done.length === 1 ? '1 ticked item' : `${done.length} ticked items`}</Text>
        </PressableScale>
      </Animated.View>
      {foldOpen && done.map(row)}
    </>}
  </View>;
}
