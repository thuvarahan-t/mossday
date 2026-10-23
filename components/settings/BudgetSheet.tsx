import { useRef, useState } from 'react';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { Button } from '@/components/ui/Button';
import { FormSheet, type FormSheetTransition } from '@/components/ui/FormSheet';
import { NumberKeypad } from '@/components/ui/NumberKeypad';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useAction } from '@/hooks/useResource';
import { amountToInput, applyKeypadKey, parseAmountInput } from '@/lib/money';
import { setSetting, type Settings } from '@/lib/repos/settings';

export type BudgetKey = 'dailyBudget' | 'monthlyBudget';
type BudgetLabel = 'Daily' | 'Monthly';
const keys: Record<BudgetLabel, BudgetKey> = { Daily: 'dailyBudget', Monthly: 'monthlyBudget' };
const labels: Record<BudgetKey, BudgetLabel> = { dailyBudget: 'Daily', monthlyBudget: 'Monthly' };
const toInput = (cents: number) => cents ? amountToInput(cents) : '';

/** Daily and monthly budgets in one sheet; the switch at the top picks which one to edit. */
export function BudgetSheet({ initial, budgets, onClose, ...transition }: {
  initial: BudgetKey; budgets: Pick<Settings, BudgetKey>; onClose: () => void;
} & Partial<FormSheetTransition>) {
  const action = useAction();
  const [key, setKey] = useState(initial);
  // Each budget keeps its own draft, so switching back and forth never loses typing.
  const [inputs, setInputs] = useState(() => ({ dailyBudget: toInput(budgets.dailyBudget), monthlyBudget: toInput(budgets.monthlyBudget) }));
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const input = inputs[key];
  const save = (cents: number) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    void action(() => setSetting(key, cents), onClose).finally(() => { locked.current = false; setBusy(false); });
  };
  const edit = (update: (value: string) => string) => setInputs((current) => ({ ...current, [key]: update(current[key]) }));
  return <FormSheet size="fit" dense {...transition} title="Budget" onClose={onClose}>
    <SegmentedControl segments={['Daily', 'Monthly'] as const} selected={labels[key]} onChange={(label) => setKey(keys[label])} inset={false} />
    <AmountDisplay input={input} />
    <NumberKeypad onKey={(keypadKey) => edit((value) => applyKeypadKey(value, keypadKey))} onClear={() => edit(() => '')} />
    <Button title={`Save ${labels[key].toLowerCase()} budget`} disabled={!parseAmountInput(input) || busy} onPress={() => save(parseAmountInput(input)!)} />
    <Button title={`Remove ${labels[key].toLowerCase()} budget`} variant="plain" disabled={busy || !budgets[key]} onPress={() => save(0)} />
  </FormSheet>;
}
