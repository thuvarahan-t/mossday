import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormSheet, type FormSheetTransition } from '@/components/ui/FormSheet';
import { SwatchPicker } from '@/components/ui/Pickers';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useAction } from '@/hooks/useResource';
import { updateCategory, type Category } from '@/lib/repos/expenses';
import type { AccentName } from '@/constants/colors';

const swatches: readonly AccentName[] = ['green', 'blue', 'indigo', 'orange', 'pink', 'teal', 'red', 'purple', 'yellow'];

export function CategoryEditor({ category, onSaved, onClose, ...transition }: {
  category: Category; onSaved: () => Promise<unknown>; onClose: () => void;
} & Partial<FormSheetTransition>) {
  const action = useAction();
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);
  const save = () => {
    if (locked.current || !name.trim()) return;
    locked.current = true;
    setBusy(true);
    void action(async () => {
      await updateCategory(category.id, name, color);
      await onSaved();
    }, onClose).finally(() => { locked.current = false; setBusy(false); });
  };
  return <FormSheet {...transition} title="Edit Category" size="fit" dense onClose={() => { if (!busy) onClose(); }}
    trailing={<Button title="Save" size="small" disabled={busy || !name.trim()} onPress={save} />}>
    <TextField value={name} onChangeText={setName} accessibilityLabel="Category name" placeholder="Category name" maxLength={100} editable={!busy} />
    <Text variant="footnote" color="secondaryLabel">Colour</Text>
    <SwatchPicker colors={swatches.slice(0, 6)} selected={color} onSelect={setColor} />
    <SwatchPicker colors={swatches.slice(6)} selected={color} onSelect={setColor} />
  </FormSheet>;
}
