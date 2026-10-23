import { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { Button } from '@/components/ui/Button';
import { SheetIconButton } from '@/components/ui/sheet/SheetHeader';
import { SheetRow } from '@/components/ui/sheet/SheetRow';
import { useToast } from '@/components/ui/Toast';
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
import { amountToInput, applyKeypadKey, parseAmountInput } from '@/lib/money';
import { addCategory, deleteExpense, listCategories, restoreExpense, saveExpense, type Category, type Expense } from '@/lib/repos/expenses';
import { haptics } from '@/lib/haptics';
import type { AccentName } from '@/constants/colors';
import { categoryStyle } from './categoryStyle';

/** Window height taken by the Add Expense sheet apart from the keypad rows and optional rows. */
const KEYPAD_FREE_SPACE = 416;
/** Keys stay compact even on tall phones so the sheet is as small as it can be. */
const MAX_KEY_HEIGHT = 54;
const paymentLabels = { CASH: 'Cash', CARD: 'Card', ONLINE: 'Online' } as const;
const nextPayment = { CASH: 'CARD', CARD: 'ONLINE', ONLINE: 'CASH' } as const;

/**
 * Categories rarely change, so the last list is kept to open the sheet instantly; it is
 * refreshed every time the sheet opens.
 */
let categoryCache: Category[] | null = null;

/** Warms the category cache so the first Add Expense also opens without waiting. */
export function preloadCategories() {
  void listCategories().then((rows) => { categoryCache = rows; }, () => undefined);
}

export function ExpenseSheet({ initial, mealId, date: initialDate, onClose, ...transition }: {
  initial?: Expense; mealId?: number; date?: string; onClose: () => void;
} & Partial<FormSheetTransition>) {
  const theme = useTheme();
  const window = useWindowDimensions();
  const action = useAction();
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const [categories, setCategories] = useState<Category[] | null>(categoryCache);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState(initial ? amountToInput(initial.amount) : '');
  const [categoryId, setCategoryId] = useState<number | null>(
    initial?.categoryId ?? mealId ?? categoryCache?.find((c) => c.type === 'MEAL')?.id ?? null);
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
  const [shake, setShake] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const load = () => {
    void listCategories().then((rows) => {
      categoryCache = rows; setCategories(rows); setError(null);
      if (!initial && !mealId) setCategoryId((current) => current ?? rows.find((r) => r.type === 'MEAL')?.id ?? null);
    }, () => setError('Could not load categories.'));
  };
  // This form owns its draft; external refreshes must not reset an edit in progress.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);
  const datePicker = useDatePicker(date, setDate);
  const selected = categories?.find((category) => category.id === categoryId);
  const amount = parseAmountInput(input);
  // Keys shrink on short screens so the whole form fits; optional rows take their share first.
  const optionalRows = [oneTime, showNote, !!hint].filter(Boolean).length * (theme.sizes.fieldHeight + theme.spacing.sm);
  const keyHeight = Math.min(MAX_KEY_HEIGHT, Math.floor((window.height - KEYPAD_FREE_SPACE - optionalRows) / 4));
  const save = async () => {
    if (saving.current || !amount) return;
    saving.current = true; setBusy(true);
    const success = await action(() => saveExpense({ amount, categoryId, title, note, date, paymentMethod: payment, isOneTime: oneTime ? 1 : 0 }, initial?.id));
    saving.current = false; setBusy(false);
    if (success) { Keyboard.dismiss(); haptics.success(); onClose(); }
  };
  // Saving from a text field must never leave the user stuck behind the keyboard: when
  // something is missing, the keyboard goes away so the keypad and Save are visible again.
  const attemptSave = () => {
    const problem = !amount ? 'Enter an amount' : oneTime && !title.trim() ? 'Say what it was' : !oneTime && !categoryId ? 'Choose a category' : null;
    if (!problem) { void save(); return; }
    Keyboard.dismiss();
    haptics.warning();
    setHint(problem);
    if (!amount) setShake((count) => count + 1);
  };
  const inlineSave = <Button title="Save" size="small" disabled={busy} onPress={attemptSave} />;
  const remove = (expense: Expense) => {
    if (busy) return;
    void action(() => deleteExpense(expense.id), () => {
      haptics.warning();
      onClose();
      toast({ message: 'Expense deleted', actionLabel: 'Undo', onAction: () => { void action(() => restoreExpense(expense)); } });
    });
  };
  // Categories load in a few milliseconds; presenting after that opens the sheet in one
  // motion at its final height instead of springing to a loading row and then growing.
  if (!categories && !error) return null;
  return <FormSheet {...transition} background="plain" size="fit" dense title={initial ? 'Edit Expense' : oneTime ? 'One-time Expense' : 'New Expense'} onClose={() => { if (!busy) onClose(); }}
    trailing={initial && <SheetIconButton icon="trash" accessibilityLabel="Delete expense" onPress={() => remove(initial)} />}>
    {!categories ? <LoadState error={error} retry={load} /> : <>
      <AmountDisplay input={input} compact shakeSignal={shake} />
      {hint && <SheetRow optional><Text variant="footnote" weight="semibold" color="dangerText" align="center">{hint}</Text></SheetRow>}
      {/* Meals on the first line, Other and One-time on the second, on every screen width. */}
      <View style={[styles.chipRow, { gap: theme.spacing.sm }]}>
        {categories.filter((c) => c.type === 'MEAL').map((c) => <Chip key={c.id} label={c.name} selected={!oneTime && c.id === categoryId} onPress={() => { setCategoryId(c.id); setOneTime(false); }} />)}
      </View>
      <View style={[styles.chipRow, { gap: theme.spacing.sm }]}>
        <Chip label={selected?.type === 'OTHER' && !oneTime ? `${selected.name} ›` : 'Other'} selected={!oneTime && selected?.type === 'OTHER'} onPress={() => setOther(true)} />
        <Chip label="One-time" selected={oneTime} onPress={() => setOneTime(true)} />
      </View>
      {oneTime && <SheetRow optional style={[styles.fieldRow, { gap: theme.spacing.sm }]}>
        <View style={styles.fill}><TextField value={title} onChangeText={(value) => { setTitle(value); setHint(null); }} placeholder="What was it?" accessibilityLabel="Expense title" /></View>
        {inlineSave}
      </SheetRow>}
      <SheetRow><OptionsBar cells={[
        { label: formatShortDate(date), accessibilityLabel: `Date, ${formatLongDate(date)}. Change date`, onPress: datePicker.open },
        { label: paymentLabels[payment], accessibilityLabel: `Payment, ${paymentLabels[payment]}`, onPress: () => setPayment(nextPayment[payment]) },
        { label: note.trim() || 'Add note', tinted: !note.trim(), onPress: () => setShowNote(!showNote) },
      ]} /></SheetRow>
      {datePicker.picker}
      {showNote && <SheetRow optional style={[styles.fieldRow, { gap: theme.spacing.sm }]}>
        <View style={styles.fill}><TextField value={note} onChangeText={setNote} placeholder="Add a note" accessibilityLabel="Expense note" autoFocus /></View>
        {inlineSave}
      </SheetRow>}
      <SheetRow style={{ gap: theme.spacing.sm }}>
        <NumberKeypad keyHeight={keyHeight} onKey={(key) => { setHint(null); setInput((value) => applyKeypadKey(value, key)); }} onClear={() => setInput('')} />
        <Button title={busy ? 'Saving…' : 'Save'} disabled={busy} onPress={attemptSave} fullWidth />
      </SheetRow>
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

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', justifyContent: 'center' },
  fieldRow: { flexDirection: 'row', alignItems: 'center' },
  fill: { flex: 1 },
});
