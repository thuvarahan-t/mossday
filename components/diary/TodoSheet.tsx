import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { DateSelector } from '@/components/ui/DateSelector';
import { FormSheet, type FormSheetTransition } from '@/components/ui/FormSheet';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { TimeField } from '@/components/ui/TimeField';
import { Toggle } from '@/components/ui/Toggle';
import { useAction } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { addTodo, updateTodo, type Todo } from '@/lib/repos/diary';
import { haptics } from '@/lib/haptics';

/** A compact sheet that rests on the keyboard: text, then date + time, then priority. With `initial` it edits that to-do. */
export function TodoSheet({ date: initialDate, initial, onClose, ...transition }: {
  date: string; initial?: Todo; onClose: () => void;
} & Partial<FormSheetTransition>) {
  const theme = useTheme();
  const action = useAction();
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
  return <FormSheet {...transition} size="fit" dense dockToKeyboard title={initial ? 'Edit To-do' : 'New To-do'} onClose={() => { if (!busy) onClose(); }}
    trailing={<Button title={busy ? 'Saving…' : initial ? 'Save' : 'Add'} size="small" disabled={!canSave} onPress={save} />}>
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
