import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Keyboard, Platform, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Button } from './Button';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { TextField } from './TextField';

/**
 * Native time selection: Android's clock-dial dialog, iOS's wheel. `''` means no time; with
 * `onClear` the field is optional, showing `placeholder` until set and an × to remove it.
 * Browser previews fall back to an editable HH:mm field.
 */
export function TimeField({ value, onChange, label, onClear, placeholder = 'Add time' }: {
  value: string; onChange: (time: string) => void; label: string; onClear?: () => void; placeholder?: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const date = new Date();
  const [hours, minutes] = value.split(':').map(Number);
  // An empty optional time opens on the next whole hour.
  if (value) date.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  else date.setHours(date.getHours() + 1, 0, 0, 0);
  if (Platform.OS === 'web') return <TextField value={value} onChangeText={onChange} accessibilityLabel={label} placeholder="09:00" maxLength={5} />;
  return <View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
      <View style={{ flex: 1 }}>
        <Button title={value || placeholder} variant="tinted" accessibilityLabel={`${label}, ${value || 'not set'}`}
          onPress={() => { Keyboard.dismiss(); setOpen(true); }} />
      </View>
      {onClear && value ? <PressableScale haptic="tap" accessibilityLabel={`Remove ${label.toLowerCase()}`} onPress={onClear}
        style={{ width: theme.sizes.touchTarget, height: theme.sizes.touchTarget, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="close" color="secondaryLabel" />
      </PressableScale> : null}
    </View>
    {open && <DateTimePicker value={date} mode="time" is24Hour display={Platform.OS === 'android' ? 'clock' : 'spinner'} onChange={(event, selected) => {
      if (Platform.OS === 'android') setOpen(false);
      if (event.type === 'set' && selected) onChange(`${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`);
    }} />}
    {open && Platform.OS === 'ios' && <Button title="Done" variant="plain" onPress={() => setOpen(false)} />}
  </View>;
}
