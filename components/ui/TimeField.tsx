import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { Button } from './Button';
import { TextField } from './TextField';

/** Native time selection with an editable HH:mm fallback for browser previews. */
export function TimeField({ value, onChange, label }: {
  value: string; onChange: (time: string) => void; label: string;
}) {
  const [open, setOpen] = useState(false);
  const date = new Date();
  const [hours, minutes] = value.split(':').map(Number);
  date.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  if (Platform.OS === 'web') return <TextField value={value} onChangeText={onChange} accessibilityLabel={label} placeholder="09:00" maxLength={5} />;
  return <View>
    <Button title={value} variant="tinted" accessibilityLabel={`${label}, ${value}`} onPress={() => setOpen(true)} />
    {open && <DateTimePicker value={date} mode="time" is24Hour display="spinner" onChange={(event, selected) => {
      if (Platform.OS === 'android') setOpen(false);
      if (event.type === 'set' && selected) onChange(`${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`);
    }} />}
    {open && Platform.OS === 'ios' && <Button title="Done" variant="plain" onPress={() => setOpen(false)} />}
  </View>;
}
