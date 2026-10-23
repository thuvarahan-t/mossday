import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DateSelector } from '@/components/ui/DateSelector';
import { FormSheet, type FormSheetTransition } from '@/components/ui/FormSheet';
import { TextField } from '@/components/ui/TextField';
import { Toggle } from '@/components/ui/Toggle';
import { useAction } from '@/hooks/useResource';
import { addTodo } from '@/lib/repos/diary';
import { haptics } from '@/lib/haptics';

export function TodoSheet({ date: initialDate, onClose, ...transition }: { date: string; onClose: () => void } & Partial<FormSheetTransition>) {
  const action = useAction();
  const locked = useRef(false);
  const [text, setText] = useState('');
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState(false);
  const [busy, setBusy] = useState(false);
  return <FormSheet {...transition} title="New To-do" onClose={() => { if (!busy) onClose(); }}>
    <TextField value={text} onChangeText={setText} placeholder="What needs doing?" accessibilityLabel="To-do text" autoFocus />
    <DateSelector date={date} onChange={setDate} />
    <TextField value={time} onChangeText={setTime} placeholder="Optional time (14:30)" accessibilityLabel="Time in 24-hour format" maxLength={5} />
    <Toggle value={priority} onValueChange={setPriority} accessibilityLabel="High priority" />
    <Button title={busy ? 'Saving…' : 'Add To-do'} disabled={busy || !text.trim()} onPress={() => {
      if (locked.current) return;
      locked.current = true; setBusy(true);
      void action(() => addTodo(date, text, time || null, priority ? 1 : 0), () => { haptics.success(); onClose(); })
        .finally(() => { locked.current = false; setBusy(false); });
    }} />
  </FormSheet>;
}
