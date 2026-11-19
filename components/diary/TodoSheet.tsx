import { useRef, useState } from 'react';
import { View } from 'react-native';
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

/** A compact sheet for the task, its optional schedule, and priority. */
export function TodoSheet({ date: initialDate, initial, onClose, ...transition }: {
  date: string; initial?: Todo; onClose: () => void;
} & Partial<FormSheetTransition>) {
  const theme = useTheme();
  const action = useAction();
  const toast = useToast();
  const locked = useRef(false);
  const [text, setText] = useState(initial?.text ?? '');
  const [date, setDate] = useState(initial?.date ?? initialDate);
  const [startTime, setStartTime] = useState(initial?.time ?? '');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '');
  const [priority, setPriority] = useState(!!initial?.priority);
  const [busy, setBusy] = useState(false);
  const canSave = !busy && !!text.trim();
  const save = () => {
    if (!canSave || locked.current) return;
    locked.current = true; setBusy(true);
    const fields = [date, text, startTime || null, priority ? 1 : 0, endTime || null] as const;
    void action(() => initial ? updateTodo(initial.id, ...fields) : addTodo(...fields), () => { haptics.success(); onClose(); })
      .finally(() => { locked.current = false; setBusy(false); });
  };
  const row = { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm } as const;
  const headerButton = {
    width: theme.sizes.circleButton, height: theme.sizes.circleButton, alignItems: 'center', justifyContent: 'center',
  } as const;
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
        style={headerButton}>
        <Icon name="trash" color="dangerText" />
      </PressableScale>}
      <PressableScale accessibilityLabel={busy ? 'Saving to-do' : initial ? 'Save to-do' : 'Add to-do'}
        accessibilityState={{ busy, disabled: !canSave }} disabled={!canSave} onPress={save}
        style={[headerButton, { borderRadius: theme.radii.pill, backgroundColor: theme.colors.accent, opacity: canSave ? 1 : 0.4 }]}>
        <Icon name="check" color="onAccent" strokeWidth={2.8} />
      </PressableScale>
    </View>}>
    <TextField value={text} onChangeText={setText} placeholder="What needs doing?" accessibilityLabel="To-do text" autoFocus
      returnKeyType="done" submitBehavior="blurAndSubmit" onSubmitEditing={save} />
    <View style={row}>
      <DateSelector date={date} onChange={setDate} />
    </View>
    <View style={{ gap: theme.spacing.xs }}>
      <Text variant="subheadline">Start time</Text>
      <TimeField value={startTime} onChange={setStartTime} onClear={() => setStartTime('')} label="Start time" />
    </View>
    <View style={{ gap: theme.spacing.xs }}>
      <Text variant="subheadline">End time</Text>
      <TimeField value={endTime} onChange={setEndTime} onClear={() => setEndTime('')} label="End time" />
    </View>
    <View style={row}>
      <Text style={{ flex: 1 }}>High priority</Text>
      <Toggle value={priority} onValueChange={setPriority} accessibilityLabel="High priority" />
    </View>
  </FormSheet>;
}
