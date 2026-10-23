import { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { Button } from '@/components/ui/Button';
import { AnimatedListItem } from '@/components/ui/AnimatedListItem';
import { CategoryGrid } from '@/components/ui/CategoryGrid';
import { Chip } from '@/components/ui/Chip';
import { useDatePicker } from '@/components/ui/DateSelector';
import { OptionsBar } from '@/components/ui/OptionsBar';
import { FormSheet, type FormSheetTransition } from '@/components/ui/FormSheet';
import { useSheetState } from '@/hooks/useSheetState';
import { NumberKeypad } from '@/components/ui/NumberKeypad';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { SwatchPicker } from '@/components/ui/Pickers';
import { LoadState } from '@/components/ui/LoadState';
import { useAction } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { formatLongDate, formatShortDate, todayLocalDate } from '@/lib/date';
import { amountToInput, applyKeypadKey, formatMoney, parseAmountInput } from '@/lib/money';
import { addCategory, listCategories, saveExpense, type Category, type Expense } from '@/lib/repos/expenses';
import { haptics } from '@/lib/haptics';
import type { AccentName } from '@/constants/colors';
import { categoryStyle } from './categoryStyle';

/** Window height taken by the Add Expense sheet apart from the keypad rows and optional fields. */
const KEYPAD_FREE_SPACE = 416;
/** Below this window height (small phones) the amount and spacing tighten to keep Save visible. */
const SHORT_WINDOW = 700;
const paymentLabels = { CASH: 'Cash', CARD: 'Card', ONLINE: 'Online' } as const;
const nextPayment = { CASH: 'CARD', CARD: 'ONLINE', ONLINE: 'CASH' } as const;

export function ExpenseSheet({ initial, mealId, date: initialDate, onClose, ...transition }: {
  initial?: Expense; mealId?: number; date?: string; onClose: () => void;
} & Partial<FormSheetTransition>) {
  const theme = useTheme();
  const window = useWindowDimensions();
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
  const [other, setOtherValue, otherTransition] = useSheetState<true>();
  const setOther = (open: boolean) => setOtherValue(open ? true : null);
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
  const datePicker = useDatePicker(date, setDate);
  const selected = categories?.find((category) => category.id === categoryId);
  const amount = parseAmountInput(input);
  const short = window.height < SHORT_WINDOW;
  const showLastAmount = !input && !!selected?.lastAmount && !oneTime;
  // Keys shrink on short screens so the whole form fits; optional rows take their share first.
  const optionalRows = [showLastAmount, oneTime, showNote].filter(Boolean).length * (theme.sizes.touchTarget + theme.spacing.md);
  const keyHeight = Math.min(theme.sizes.keypadKeyHeight, Math.floor((window.height - KEYPAD_FREE_SPACE - optionalRows) / 4));
  const save = async () => {
    if (saving.current || !amount) return;
    saving.current = true; setBusy(true);
    const success = await action(() => saveExpense({ amount, categoryId, title, note, date, paymentMethod: payment, isOneTime: oneTime ? 1 : 0 }, initial?.id));
    saving.current = false; setBusy(false);
    if (success) { Keyboard.dismiss(); haptics.success(); onClose(); }
  };
  return <FormSheet {...transition} background="plain" size="fit" dense={short} title={initial ? 'Edit Expense' : oneTime ? 'One-time Expense' : 'New Expense'} onClose={() => { if (!busy) onClose(); }}>
    {!categories ? <LoadState error={error} retry={load} /> : <>
      <AmountDisplay input={input} compact={short} />
      {/* Meals on the first line, Other and One-time on the second, on every screen width. */}
      <View style={[styles.chipRow, { gap: theme.spacing.sm }]}>
        {categories.filter((c) => c.type === 'MEAL').map((c) => <Chip key={c.id} label={c.name} selected={!oneTime && c.id === categoryId} onPress={() => { setCategoryId(c.id); setOneTime(false); }} />)}
      </View>
      <View style={[styles.chipRow, { gap: theme.spacing.sm }]}>
        <Chip label={selected?.type === 'OTHER' && !oneTime ? `${selected.name} ›` : 'Other'} selected={!oneTime && selected?.type === 'OTHER'} onPress={() => setOther(true)} />
        <Chip label="One-time" selected={oneTime} onPress={() => setOneTime(true)} />
      </View>
      {showLastAmount && selected?.lastAmount ? <Button title={`Same as last time · ${formatMoney(selected.lastAmount)}`} variant="tinted" size="small"
        style={{ alignSelf: 'center' }} onPress={() => setInput(amountToInput(selected.lastAmount!))} /> : null}
      {oneTime && <AnimatedListItem><TextField value={title} onChangeText={setTitle} placeholder="What was it?" accessibilityLabel="Expense title" /></AnimatedListItem>}
      <OptionsBar cells={[
        { label: formatShortDate(date), accessibilityLabel: `Date, ${formatLongDate(date)}. Change date`, onPress: datePicker.open },
        { label: paymentLabels[payment], accessibilityLabel: `Payment, ${paymentLabels[payment]}`, onPress: () => setPayment(nextPayment[payment]) },
        { label: note.trim() || 'Add note', tinted: !note.trim(), onPress: () => setShowNote(!showNote) },
      ]} />
      {datePicker.picker}
      {showNote && <AnimatedListItem><TextField value={note} onChangeText={setNote} placeholder="Add a note" accessibilityLabel="Expense note" /></AnimatedListItem>}
      <NumberKeypad keyHeight={keyHeight} onKey={(key) => setInput((value) => applyKeypadKey(value, key))} onClear={() => setInput('')} />
      <Button title={busy ? 'Saving…' : 'Save'} disabled={busy || !amount || (oneTime ? !title.trim() : !categoryId)} onPress={() => { void save(); }} fullWidth />
    </>}
    {other && <FormSheet {...otherTransition} title="Categories" onClose={() => setOther(false)}>
      <CategoryGrid items={(categories ?? []).filter((category) => category.type === 'OTHER').map((category) => ({ ...category, ...categoryStyle(category.icon, category.color) }))}
        selected={categoryId} onSelect={(id) => { setCategoryId(id); setOneTime(false); setOther(false); }} onCreate={() => setNewCategory(true)} />
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

const styles = StyleSheet.create({ chipRow: { flexDirection: 'row', justifyContent: 'center' } });
