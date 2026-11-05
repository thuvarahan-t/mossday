import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { TextField } from '@/components/ui/TextField';
import { useAction } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { addTodo } from '@/lib/repos/diary';

/** A temporary list row; Return saves it and keeps the cursor ready for the next task. */
export function InlineTodoEntry({ date, onClose }: { date: string; onClose: () => void }) {
  const theme = useTheme();
  const action = useAction();
  const [text, setText] = useState('');
  const draft = useRef('');
  const saving = useRef(false);
  const closeAfterSave = useRef(false);
  useFocusEffect(useCallback(() => () => {
    // Moving to another day/tab must not silently discard a typed task.
    const value = draft.current;
    if (value.trim() && !saving.current) {
      saving.current = true;
      void action(() => addTodo(date, value, null)).then((saved) => {
        saving.current = false;
        if (saved && draft.current === value) { draft.current = ''; setText(''); }
      });
    }
  }, [action, date]));
  const submit = (keepTyping: boolean) => {
    closeAfterSave.current = !keepTyping;
    if (saving.current) return;
    const value = draft.current;
    if (!value.trim()) { if (!keepTyping) onClose(); return; }
    saving.current = true;
    void action(() => addTodo(date, value, null)).then((saved) => {
      saving.current = false;
      if (!saved) return;
      if (draft.current === value) { draft.current = ''; setText(''); }
      if (closeAfterSave.current && !draft.current) onClose();
    });
  };
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingHorizontal: theme.sizes.rowPadding,
    paddingVertical: theme.spacing.lg, minHeight: theme.sizes.rowMinHeight }}>
    <Icon name="plus" color="accent" size={theme.sizes.checkbox} />
    <View style={{ flex: 1 }}>
      <TextField appearance="bare" accessibilityLabel="New to-do" placeholder="What needs doing?" autoFocus value={text}
        onChangeText={(value) => { draft.current = value; setText(value); }} returnKeyType="next" submitBehavior="submit"
        onSubmitEditing={() => submit(true)} onBlur={() => submit(false)} />
    </View>
  </View>;
}
