import { useCallback, useRef, useState } from 'react';
import { applyAppearance } from '@/lib/appearance';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { Button } from '@/components/ui/Button';
import { FormSheet } from '@/components/ui/FormSheet';
import { GroupedList, ListRow, SectionHeader, type ListRowProps } from '@/components/ui/GroupedList';
import { LargeTitleScreen } from '@/components/ui/LargeTitleScreen';
import { LoadState } from '@/components/ui/LoadState';
import { NumberKeypad } from '@/components/ui/NumberKeypad';
import { Text } from '@/components/ui/Text';
import { TimeField } from '@/components/ui/TimeField';
import { Toggle } from '@/components/ui/Toggle';
import { useAction, useResource } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { useSheetState } from '@/hooks/useSheetState';
import { exportBackup, storageBytes } from '@/lib/backup';
import { amountToInput, applyKeypadKey, formatMoney, parseAmountInput } from '@/lib/money';
import { getMealReminders, saveMealReminder, type MealReminder } from '@/lib/reminders';
import { getSettings, setSetting } from '@/lib/repos/settings';
import { useCurrency } from '@/hooks/useCurrency';
import { CurrencySheet } from './CurrencySheet';

type BudgetKey = 'dailyBudget' | 'monthlyBudget';
const appearanceLabels = { system: 'Automatic', light: 'Light', dark: 'Dark' } as const;
const mealIcons: Record<string, ListRowProps['icon']> = {
  Breakfast: { icon: 'coffee', color: 'orange' }, Lunch: { icon: 'utensils', color: 'orange' }, Dinner: { icon: 'moon', color: 'indigo' },
};

export function SettingsScreen() {
  const theme = useTheme();
  useCurrency();
  const [currency, setCurrency, currencyTransition] = useSheetState<true>();
  const action = useAction();
  const [budget, setBudget, budgetTransition] = useSheetState<BudgetKey>();
  const [input, setInput] = useState('');
  const [appearance, selectAppearance, appearanceTransition] = useSheetState<true>();
  const setAppearance = (open: boolean) => selectAppearance(open ? true : null);
  const [reminder, setReminder, reminderTransition] = useSheetState<MealReminder>();
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
        <ListRow title="Currency" icon={{ icon: 'currency', color: 'green' }} value={data.settings.currency} accessory="chevron" onPress={() => setCurrency(true)} />
        {(['dailyBudget', 'monthlyBudget'] as const).map((key) => <ListRow key={key} title={key === 'dailyBudget' ? 'Daily Budget' : 'Monthly Budget'} icon={key === 'dailyBudget' ? { icon: 'target', color: 'orange' } : { icon: 'calendar', color: 'red' }}
          value={data.settings[key] ? formatMoney(data.settings[key]) : 'Not set'} accessory="chevron" onPress={() => { setInput(data.settings[key] ? amountToInput(data.settings[key]) : ''); setBudget(key); }} />)}
      </GroupedList>
      <SectionHeader title="Meal reminders" />
      <GroupedList>{data.meals.map((meal) => <ListRow key={meal.name} title={meal.name} value={meal.time.replace(/^0/, '')} icon={mealIcons[meal.name]}
        onPress={() => setReminder(meal)} accessory={<Toggle value={meal.enabled} disabled={busy} accessibilityLabel={`${meal.name} reminder`} onValueChange={(enabled) => run(() => saveMealReminder({ ...meal, enabled }))} />} />)}</GroupedList>
      <SectionHeader title="General" /><GroupedList>
        <ListRow title="Appearance" icon={{ icon: 'appearance', color: 'blue' }} value={appearanceLabels[data.settings.appearance]} accessory="chevron" onPress={() => setAppearance(true)} />
        {/* App Lock is a v2 feature (spec §8); the row is shown disabled, per UI analysis R11. */}
        <ListRow title="App Lock" icon={{ icon: 'lock', color: 'green' }} value="Soon" accessibilityLabel="App Lock, coming soon" />
      </GroupedList>
      <SectionHeader title="Data" /><GroupedList>
        <ListRow title={busy ? 'Please wait…' : 'Backup & Export'} value="ZIP" icon={{ icon: 'backup', color: 'teal' }} accessory="chevron"
          accessibilityLabel="Backup and export a ZIP of your database and attached media" onPress={() => run(exportBackup, refresh)} />
        <ListRow title="Storage" icon={{ icon: 'storage', color: 'gray' }} value={`${(data.storage / 1024 / 1024).toFixed(1)} MB`} />
      </GroupedList>
      <Text variant="footnote" align="center" color="secondaryLabel">Mossday 1.0 · Offline and private</Text>
      {currency && <CurrencySheet {...currencyTransition} onClose={() => setCurrency(null)} />}
      {budget && <FormSheet size="fit" dense {...budgetTransition} title={budget === 'dailyBudget' ? 'Daily Budget' : 'Monthly Budget'} onClose={() => setBudget(null)}><AmountDisplay input={input} />
        <NumberKeypad onKey={(key) => setInput((value) => applyKeypadKey(value, key))} onClear={() => setInput('')} />
        <Button title="Save budget" disabled={!parseAmountInput(input) || busy} onPress={() => run(() => setSetting(budget, parseAmountInput(input)!), () => setBudget(null))} />
        <Button title="Remove budget" variant="plain" disabled={busy} onPress={() => run(() => setSetting(budget, 0), () => setBudget(null))} /></FormSheet>}
      {appearance && <FormSheet size="fit" dense {...appearanceTransition} title="Appearance" onClose={() => setAppearance(false)}>{(['system', 'light', 'dark'] as const).map((value) =>
        <Button key={value} title={`${appearanceLabels[value]}${data.settings.appearance === value ? ' ✓' : ''}`} variant="tinted" disabled={busy}
          onPress={() => run(async () => { await setSetting('appearance', value); applyAppearance(value); }, () => setAppearance(false))} />)}</FormSheet>}
      {reminder && <FormSheet size="fit" dense {...reminderTransition} title={`${reminder.name} reminder`} onClose={() => setReminder(null)}><TimeField value={reminder.time} label="Reminder time" onChange={(time) => setReminder({ ...reminder, time })} />
        <Button title="Save" disabled={busy} onPress={() => run(() => saveMealReminder(reminder), () => setReminder(null))} /></FormSheet>}
    </>}
  </LargeTitleScreen>;
}
