import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormSheet, type FormSheetTransition } from '@/components/ui/FormSheet';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { GroupedList, ListRow } from '@/components/ui/GroupedList';
import { useAction } from '@/hooks/useResource';
import { useCurrency } from '@/hooks/useCurrency';
import { currencies, type CurrencyCode } from '@/lib/currency';
import { completeCurrencySetup, setSetting } from '@/lib/repos/settings';

export function CurrencySheet({ firstLaunch = false, onClose, ...transition }: {
  firstLaunch?: boolean; onClose: () => void;
} & Partial<FormSheetTransition>) {
  const current = useCurrency();
  const [selected, setSelected] = useState<CurrencyCode>(current);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const action = useAction();
  const save = (code: CurrencyCode) => {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    void action(() => firstLaunch ? completeCurrencySetup(code) : setSetting('currency', code), onClose)
      .finally(() => { locked.current = false; setBusy(false); });
  };
  return <FormSheet {...transition} title={firstLaunch ? 'Choose your currency' : 'Currency'} size="fit" dense
    onClose={() => { if (!busy) { if (firstLaunch) save('LKR'); else onClose(); } }}
    trailing={<Button title="Save" size="small" disabled={busy} onPress={() => save(selected)} />}>
    <Text variant="footnote" color="secondaryLabel">{firstLaunch ? 'Pick a currency to get started. You can change it in Settings.' : 'Changes the currency label. Existing amounts are not converted.'}</Text>
    {firstLaunch && <Button title="Skip · use Rs." variant="plain" disabled={busy} onPress={() => save('LKR')} />}
    <GroupedList style={{ marginHorizontal: 0 }}>{currencies.map((currency) => <ListRow key={currency.code} title={`${currency.code}  ${currency.symbol}`} subtitle={currency.name}
      accessory={selected === currency.code ? <Icon name="check" color="accent" /> : undefined} onPress={() => { if (!busy) setSelected(currency.code); }} />)}</GroupedList>
  </FormSheet>;
}
