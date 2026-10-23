import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { DateSelector } from '@/components/ui/DateSelector';
import { FormSheet, type FormSheetTransition } from '@/components/ui/FormSheet';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { Toggle } from '@/components/ui/Toggle';
import { useAction } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { addTodo } from '@/lib/repos/diary';
import { haptics } from '@/lib/haptics';

/** A compact sheet that rests on the keyboard: text, then date + time, then priority. */
export function TodoSheet({ date: initialDate, onClose, ...transition }: { date: string; onClose: () => void } & Partial<FormSheetTransition>) {
  const theme = useTheme();
  const action = useAction();
  const locked = useRef(false);
  const [text, setText] = useState('');
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState(false);
  const [busy, setBusy] = useState(false);
  const canSave = !busy && !!text.trim();
  const save = () => {
    if (!canSave || locked.current) return;
    locked.current = true; setBusy(true);
    void action(() => addTodo(date, text, time || null, priority ? 1 : 0), () => { haptics.success(); onClose(); })
      .finally(() => { locked.current = false; setBusy(false); });
  };
  const row = { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm } as const;
  return <FormSheet {...transition} size="fit" dense dockToKeyboard title="New To-do" onClose={() => { if (!busy) onClose(); }}
    trailing={<Button title={busy ? 'Saving…' : 'Add'} size="small" disabled={!canSave} onPress={save} />}>
    <TextField value={text} onChangeText={setText} placeholder="What needs doing?" accessibilityLabel="To-do text" autoFocus
      returnKeyType="done" submitBehavior="blurAndSubmit" onSubmitEditing={save} />
    <View style={row}>
      <DateSelector date={date} onChange={setDate} />
      <View style={{ flex: 1 }}>
        <TextField value={time} onChangeText={setTime} placeholder="Time (14:30)" accessibilityLabel="Optional time in 24-hour format" maxLength={5} />
      </View>
    </View>
    <View style={row}>
      <Text style={{ flex: 1 }}>High priority</Text>
      <Toggle value={priority} onValueChange={setPriority} accessibilityLabel="High priority" />
    </View>
  </FormSheet>;
}
