import DateTimePicker from '@react-native-community/datetimepicker';
import { useState, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { parseLocalDate, todayLocalDate } from '@/lib/date';
import { DatePill } from './DatePill';

/** Native date picker state; `picker` renders nothing until `open()` is called. */
export function useDatePicker(date: string, onChange: (date: string) => void): { open: () => void; picker: ReactNode } {
  const [visible, setVisible] = useState(false);
  const picker = visible && <DateTimePicker value={parseLocalDate(date)} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
    onChange={(event, value) => {
      setVisible(false);
      if (event.type === 'set' && value) onChange(todayLocalDate(value));
    }} />;
  return { open: () => setVisible(true), picker };
}

export function DateSelector({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const { open, picker } = useDatePicker(date, onChange);
  return <View>
    <DatePill date={date} onPress={open} />
    {picker}
  </View>;
}
