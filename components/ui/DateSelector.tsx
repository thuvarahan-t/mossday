import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { parseLocalDate, todayLocalDate } from '@/lib/date';
import { DatePill } from './DatePill';

export function DateSelector({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const [open, setOpen] = useState(false);
  return <View>
    <DatePill date={date} onPress={() => setOpen(!open)} />
    {open && <DateTimePicker value={parseLocalDate(date)} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
      onChange={(event, value) => {
        setOpen(false);
        if (event.type === 'set' && value) onChange(todayLocalDate(value));
      }} />}
  </View>;
}
