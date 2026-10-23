import { useEffect, useRef, useState } from 'react';
import { Keyboard, ScrollView, View } from 'react-native';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { DateSelector } from '@/components/ui/DateSelector';
import { FormSheet } from '@/components/ui/FormSheet';
import { NumberKeypad } from '@/components/ui/NumberKeypad';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { SwatchPicker } from '@/components/ui/Pickers';
import { LoadState } from '@/components/ui/LoadState';
import { useAction } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { todayLocalDate } from '@/lib/date';
import { amountToInput, applyKeypadKey, formatMoney, parseAmountInput } from '@/lib/money';
import { addCategory, listCategories, saveExpense, type Category, type Expense } from '@/lib/repos/expenses';
import { haptics } from '@/lib/haptics';
import type { AccentName } from '@/constants/colors';

export function ExpenseSheet({ initial, mealId, date: initialDate, onClose }: {
  initial?: Expense; mealId?: number; date?: string; onClose: () => void;
}) {
  const theme = useTheme();
  const action = useAction();
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState(initial ? amountToInput(initial.amount) : '');
  const [categoryId, setCategoryId] = useState<number | null>(initial?.categoryId ?? mealId ?? null);
  const [oneTime, setOneTime] = useState(!!initial?.isOneTime);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [showNote, setShowNote] = useState(!!initial?.note);
  const [date, setDate] = useState(initial?.date ?? initialDate ?? todayLocalDate());
  const [payment, setPayment] = useState<Expense['paymentMethod']>(initial?.paymentMethod ?? 'CASH');
  const [other, setOther] = useState(false);
  const [newCategory, setNewCategory] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [color, setColor] = useState<AccentName>('blue');
  const load = () => {
    void listCategories().then((rows) => {
      setCategories(rows); setError(null);
      if (!initial && !mealId) setCategoryId((current) => current ?? rows.find((r) => r.type === 'MEAL')?.id ?? null);
    }, () => setError('Could not load categories.'));
  };
  // This form owns its draft; external refreshes must not reset an edit in progress.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);
  const selected = categories?.find((category) => category.id === categoryId);
  const amount = parseAmountInput(input);
  const save = async () => {
    if (saving.current || !amount) return;
    saving.current = true; setBusy(true);
    const success = await action(() => saveExpense({ amount, categoryId, title, note, date, paymentMethod: payment, isOneTime: oneTime ? 1 : 0 }, initial?.id));
    saving.current = false; setBusy(false);
    if (success) { Keyboard.dismiss(); haptics.success(); onClose(); }
  };
  return <FormSheet title={initial ? 'Edit Expense' : oneTime ? 'One-time Expense' : 'New Expense'} onClose={() => { if (!busy) onClose(); }}>
    {!categories ? <LoadState error={error} retry={load} /> : <>
      <AmountDisplay input={input} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.spacing.sm }}>
        {categories.filter((c) => c.type === 'MEAL').map((c) => <Chip key={c.id} label={c.name} selected={!oneTime && c.id === categoryId} onPress={() => { setCategoryId(c.id); setOneTime(false); }} />)}
        <Chip label={selected?.type === 'OTHER' && !oneTime ? selected.name : 'Other ›'} selected={!oneTime && selected?.type === 'OTHER'} onPress={() => setOther(true)} />
        <Chip label="One-time" selected={oneTime} onPress={() => setOneTime(true)} />
      </View>
      {!input && selected?.lastAmount && !oneTime ? <Button title={`Same as last time · ${formatMoney(selected.lastAmount)}`} variant="tinted" size="small" onPress={() => setInput(amountToInput(selected.lastAmount!))} /> : null}
      {oneTime && <TextField value={title} onChangeText={setTitle} placeholder="What was it?" accessibilityLabel="Expense title" />}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
        <DateSelector date={date} onChange={setDate} />
        <Button size="small" variant="tinted" title={payment[0] + payment.slice(1).toLowerCase()} onPress={() => setPayment(payment === 'CASH' ? 'CARD' : payment === 'CARD' ? 'ONLINE' : 'CASH')} />
        <Button size="small" variant="plain" title="Add note" onPress={() => setShowNote(!showNote)} />
      </View>
      {showNote && <TextField value={note} onChangeText={setNote} placeholder="Add a note" accessibilityLabel="Expense note" />}
      <NumberKeypad onKey={(key) => setInput((value) => applyKeypadKey(value, key))} onClear={() => setInput('')} />
      <Button title={busy ? 'Saving…' : 'Save'} disabled={busy || !amount || (oneTime ? !title.trim() : !categoryId)} onPress={() => { void save(); }} fullWidth />
    </>}
    {other && <FormSheet title="Categories" onClose={() => setOther(false)}>
      <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
        {categories?.filter((c) => c.type === 'OTHER').map((c) => <Button key={c.id} title={c.name} size="small" variant="tinted" onPress={() => { setCategoryId(c.id); setOneTime(false); setOther(false); }} />)}
      </ScrollView>
      <Button title="New category" onPress={() => setNewCategory(true)} />
      {newCategory && <>
        <TextField value={categoryName} onChangeText={setCategoryName} placeholder="Category name" accessibilityLabel="Category name" />
        <Text variant="footnote" color="secondaryLabel">Colour</Text>
        <SwatchPicker colors={['green', 'blue', 'indigo', 'orange', 'pink', 'teal']} selected={color} onSelect={setColor} />
        <Button title="Create category" disabled={!categoryName.trim() || busy} onPress={() => {
          setBusy(true);
          void action(async () => { const id = await addCategory(categoryName, 'tag', color); setCategories(await listCategories()); setCategoryId(id); setOneTime(false); setOther(false); setNewCategory(false); }).finally(() => setBusy(false));
        }} />
      </>}
    </FormSheet>}
  </FormSheet>;
}
