import { useCallback, useRef, useState } from 'react';
import { applyAppearance } from '@/lib/appearance';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { Button } from '@/components/ui/Button';
import { FormSheet } from '@/components/ui/FormSheet';
import { GroupedList, ListRow, SectionHeader } from '@/components/ui/GroupedList';
import { LargeTitleScreen } from '@/components/ui/LargeTitleScreen';
import { LoadState } from '@/components/ui/LoadState';
import { NumberKeypad } from '@/components/ui/NumberKeypad';
import { Text } from '@/components/ui/Text';
import { TimeField } from '@/components/ui/TimeField';
import { Toggle } from '@/components/ui/Toggle';
import { useAction, useResource } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { exportBackup, storageBytes } from '@/lib/backup';
import { amountToInput, applyKeypadKey, formatMoney, parseAmountInput } from '@/lib/money';
import { getMealReminders, saveMealReminder, type MealReminder } from '@/lib/reminders';
import { getSettings, setSetting } from '@/lib/repos/settings';

type BudgetKey = 'dailyBudget' | 'monthlyBudget';
export function SettingsScreen() {
  const theme = useTheme();
  const action = useAction();
  const [budget, setBudget] = useState<BudgetKey | null>(null);
  const [input, setInput] = useState('');
  const [appearance, setAppearance] = useState(false);
  const [reminder, setReminder] = useState<MealReminder | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const { data, error, refresh } = useResource(useCallback(async () => ({ settings: await getSettings(), meals: await getMealReminders(), storage: await storageBytes() }), []));
  const run = (operation: () => Promise<unknown>, after?: () => void) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    void action(operation, after).finally(() => { locked.current = false; setBusy(false); });
  };
  return <LargeTitleScreen title="Settings" showBack bottomInset="safeArea" contentContainerStyle={{ gap: theme.spacing.md }}>
    {error || !data ? <LoadState error={error} retry={refresh} /> : <>
      <SectionHeader title="Money" />
      <GroupedList>
        <ListRow title="Currency" icon={{ icon: 'currency', color: 'green' }} value="LKR" subtitle="Sri Lankan rupees" />
        {(['dailyBudget', 'monthlyBudget'] as const).map((key) => <ListRow key={key} title={key === 'dailyBudget' ? 'Daily Budget' : 'Monthly Budget'} icon={{ icon: 'target', color: 'orange' }}
          value={data.settings[key] ? formatMoney(data.settings[key]) : 'Not set'} accessory="chevron" onPress={() => { setInput(data.settings[key] ? amountToInput(data.settings[key]) : ''); setBudget(key); }} />)}
      </GroupedList>
      <SectionHeader title="Meal reminders" />
      <GroupedList>{data.meals.map((meal) => <ListRow key={meal.name} title={meal.name} value={meal.time} icon={{ icon: meal.name === 'Breakfast' ? 'coffee' : meal.name === 'Lunch' ? 'utensils' : 'moon', color: 'orange' }}
        onPress={() => setReminder(meal)} accessory={<Toggle value={meal.enabled} disabled={busy} accessibilityLabel={`${meal.name} reminder`} onValueChange={(enabled) => run(() => saveMealReminder({ ...meal, enabled }))} />} />)}</GroupedList>
      <SectionHeader title="General" /><GroupedList><ListRow title="Appearance" icon={{ icon: 'appearance', color: 'blue' }} value={data.settings.appearance === 'system' ? 'Automatic' : data.settings.appearance} accessory="chevron" onPress={() => setAppearance(true)} /></GroupedList>
      <SectionHeader title="Data" /><GroupedList>
        <ListRow title={busy ? 'Please wait…' : 'Backup & Export'} subtitle="ZIP of your database and attached media" icon={{ icon: 'backup', color: 'teal' }} accessory="chevron" onPress={() => run(exportBackup, refresh)} />
        <ListRow title="Storage" icon={{ icon: 'storage', color: 'gray' }} value={`${(data.storage / 1024 / 1024).toFixed(1)} MB`} />
      </GroupedList>
      <Text variant="footnote" align="center" color="secondaryLabel">Mossday 1.0 · Offline and private</Text>
      {budget && <FormSheet title={budget === 'dailyBudget' ? 'Daily Budget' : 'Monthly Budget'} onClose={() => setBudget(null)}><AmountDisplay input={input} />
        <NumberKeypad onKey={(key) => setInput((value) => applyKeypadKey(value, key))} onClear={() => setInput('')} />
        <Button title="Save budget" disabled={!parseAmountInput(input) || busy} onPress={() => run(() => setSetting(budget, parseAmountInput(input)!), () => setBudget(null))} />
        <Button title="Remove budget" variant="plain" disabled={busy} onPress={() => run(() => setSetting(budget, 0), () => setBudget(null))} /></FormSheet>}
      {appearance && <FormSheet title="Appearance" onClose={() => setAppearance(false)}>{(['system', 'light', 'dark'] as const).map((value) =>
        <Button key={value} title={`${value === 'system' ? 'Automatic' : value === 'light' ? 'Light' : 'Dark'}${data.settings.appearance === value ? ' ✓' : ''}`} variant="tinted" disabled={busy}
          onPress={() => run(async () => { await setSetting('appearance', value); applyAppearance(value); }, () => setAppearance(false))} />)}</FormSheet>}
      {reminder && <FormSheet title={`${reminder.name} reminder`} onClose={() => setReminder(null)}><TimeField value={reminder.time} label="Reminder time" onChange={(time) => setReminder({ ...reminder, time })} />
        <Button title="Save" disabled={busy} onPress={() => run(() => saveMealReminder(reminder), () => setReminder(null))} /></FormSheet>}
    </>}
  </LargeTitleScreen>;
}
