import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { DatePill } from '@/components/ui/DatePill';
import { useDatePicker } from '@/components/ui/DateSelector';
import { FormSheet, type FormSheetTransition } from '@/components/ui/FormSheet';
import { GroupedList, ListRow } from '@/components/ui/GroupedList';
import { Text } from '@/components/ui/Text';
import { TimeField } from '@/components/ui/TimeField';
import { useTheme } from '@/hooks/useTheme';
import { addDays, todayLocalDate } from '@/lib/date';
import { formatReminder, reminderPresets } from './reminderTimes';

/**
 * Keep's "Remind me": a quick pick, or any day and time. `onSet` gets an ISO time, or null
 * to remove the reminder.
 */
export function ReminderSheet({ reminderAt, onSet, onClose, ...transition }: {
  reminderAt: string | null; onSet: (at: string | null) => void; onClose: () => void;
} & Partial<FormSheetTransition>) {
  const theme = useTheme();
  const [now] = useState(() => new Date());
  const [date, setDate] = useState(() => reminderAt ? todayLocalDate(new Date(reminderAt)) : addDays(todayLocalDate(now), 1));
  const [time, setTime] = useState(() => {
    const start = reminderAt ? new Date(reminderAt) : null;
    return start ? `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}` : '08:00';
  });
  const { open, picker } = useDatePicker(date, setDate);
  const custom = new Date(`${date}T${time}:00`);
  const past = custom.getTime() <= now.getTime();
  return <FormSheet size="fit" dense {...transition} title="Remind me" onClose={onClose}>
    {reminderAt && <Text variant="subheadline" color="secondaryLabel" align="center">
      {Date.parse(reminderAt) > now.getTime() ? `Reminds you ${formatReminder(reminderAt)}` : `Reminded you ${formatReminder(reminderAt)}`}
    </Text>}
    <GroupedList style={{ marginHorizontal: 0 }}>
      {reminderPresets(now).map((preset) => <ListRow key={preset.label} title={preset.label} value={formatReminder(preset.at.toISOString(), now)}
        icon={{ icon: 'bell', color: 'orange' }} onPress={() => onSet(preset.at.toISOString())} />)}
    </GroupedList>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <DatePill date={date} onPress={open} />
      <View style={{ flex: 1 }}><TimeField value={time} onChange={setTime} label="Reminder time" /></View>
    </View>
    {picker}
    <Button title={past ? 'Choose a later time' : `Remind me ${formatReminder(custom.toISOString(), now)}`} disabled={past} onPress={() => onSet(custom.toISOString())} />
    {reminderAt && <Button title="Remove reminder" variant="plain" onPress={() => onSet(null)} />}
  </FormSheet>;
}
