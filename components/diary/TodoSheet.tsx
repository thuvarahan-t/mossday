import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { DateSelector } from '@/components/ui/DateSelector';
import { FormSheet, type FormSheetTransition } from '@/components/ui/FormSheet';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { TimeField } from '@/components/ui/TimeField';
import { Toggle } from '@/components/ui/Toggle';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { useToast } from '@/components/ui/Toast';
import { useAction } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { addTodo, deleteTodo, restoreTodo, updateTodo, type Todo } from '@/lib/repos/diary';
import { haptics } from '@/lib/haptics';

/** A compact sheet that rests on the keyboard: text, then date + time, then priority. With `initial` it edits that to-do. */
export function TodoSheet({ date: initialDate, initial, onClose, ...transition }: {
  date: string; initial?: Todo; onClose: () => void;
} & Partial<FormSheetTransition>) {
  const theme = useTheme();
  const action = useAction();
  const toast = useToast();
  const locked = useRef(false);
  const [text, setText] = useState(initial?.text ?? '');
  const [date, setDate] = useState(initial?.date ?? initialDate);
  const [time, setTime] = useState(initial?.time ?? '');
  const [priority, setPriority] = useState(!!initial?.priority);
  const [busy, setBusy] = useState(false);
  const canSave = !busy && !!text.trim();
  const save = () => {
    if (!canSave || locked.current) return;
    locked.current = true; setBusy(true);
    const fields = [date, text, time || null, priority ? 1 : 0] as const;
    void action(() => initial ? updateTodo(initial.id, ...fields) : addTodo(...fields), () => { haptics.success(); onClose(); })
      .finally(() => { locked.current = false; setBusy(false); });
  };
  const row = { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm } as const;
  const remove = () => {
    if (!initial || locked.current) return;
    locked.current = true; setBusy(true);
    void action(() => deleteTodo(initial.id), () => {
      onClose();
      toast({ message: 'To-do deleted', actionLabel: 'Undo', onAction: () => { void action(() => restoreTodo(initial)); } });
    }).finally(() => { locked.current = false; setBusy(false); });
  };
  return <FormSheet {...transition} size="fit" dense dockToKeyboard title={initial ? 'Edit To-do' : 'New To-do'} onClose={() => { if (!busy) onClose(); }}
    trailing={<View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {initial && <PressableScale accessibilityLabel="Delete to-do" disabled={busy} onPress={remove}
        style={{ width: theme.sizes.touchTarget, height: theme.sizes.touchTarget, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="trash" color="dangerText" />
      </PressableScale>}
      <Button title={busy ? '…' : initial ? 'Save' : 'Add'} accessibilityLabel={busy ? 'Saving to-do' : initial ? 'Save to-do' : 'Add to-do'}
        size="small" disabled={!canSave} onPress={save} style={{ width: theme.sizes.touchTarget, paddingHorizontal: 0 }} />
    </View>}>
    <TextField value={text} onChangeText={setText} placeholder="What needs doing?" accessibilityLabel="To-do text" autoFocus
      returnKeyType="done" submitBehavior="blurAndSubmit" onSubmitEditing={save} />
    <View style={row}>
      <DateSelector date={date} onChange={setDate} />
      <View style={{ flex: 1 }}>
        <TimeField value={time} onChange={setTime} onClear={() => setTime('')} label="To-do time" />
      </View>
    </View>
    <View style={row}>
      <Text style={{ flex: 1 }}>High priority</Text>
      <Toggle value={priority} onValueChange={setPriority} accessibilityLabel="High priority" />
    </View>
  </FormSheet>;
}
