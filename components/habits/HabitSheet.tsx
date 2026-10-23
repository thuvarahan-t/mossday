import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormSheet, type FormSheetTransition } from '@/components/ui/FormSheet';
import { SwatchPicker, WeekdayPicker } from '@/components/ui/Pickers';
import { Stepper } from '@/components/ui/Stepper';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { TimeField } from '@/components/ui/TimeField';
import { Toggle } from '@/components/ui/Toggle';
import { useAction } from '@/hooks/useResource';
import { saveHabit, type Habit } from '@/lib/repos/habits';
import { haptics } from '@/lib/haptics';
import { accents, type AccentName } from '@/constants/colors';
import { ensureReminderPermission, validateTime } from '@/lib/reminders';

export function HabitSheet({ initial, onClose, ...transition }: { initial?: Habit; onClose: () => void } & Partial<FormSheetTransition>) {
  const action = useAction();
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '🌱');
  const [color, setColor] = useState<AccentName>((Object.keys(accents.light) as AccentName[]).find((key) => key === initial?.color || accents.light[key] === initial?.color) ?? 'green');
  const [goal, setGoal] = useState(initial?.dailyGoal ?? 1);
  const [days, setDays] = useState(initial?.activeDays ?? 127);
  const [reminder, setReminder] = useState(!!initial?.reminderTime);
  const [time, setTime] = useState(initial?.reminderTime ?? '09:00');
  return <FormSheet {...transition} title={initial ? 'Edit Habit' : 'New Habit'} onClose={() => { if (!busy) onClose(); }}>
    <TextField value={icon} onChangeText={setIcon} placeholder="Emoji" accessibilityLabel="Habit emoji" maxLength={12} />
    <TextField value={name} onChangeText={setName} placeholder="Habit name" accessibilityLabel="Habit name" maxLength={100} />
    <Text variant="footnote" color="secondaryLabel">COLOUR</Text>
    <SwatchPicker colors={['green', 'blue', 'indigo', 'orange', 'pink', 'teal']} selected={color} onSelect={setColor} />
    <Text>Times a day: {goal}</Text>
    <Stepper value={goal} min={1} max={100} onChange={setGoal} accessibilityLabel="Daily goal" />
    <Text>Repeat</Text><WeekdayPicker mask={days} onChange={setDays} />
    <Text>Reminder</Text><Toggle value={reminder} onValueChange={setReminder} accessibilityLabel="Habit reminder" />
    {reminder && <TimeField value={time} onChange={setTime} label="Habit reminder time" />}
    <Button title={busy ? 'Saving…' : initial ? 'Save changes' : 'Add Habit'} disabled={!name.trim() || busy} onPress={() => {
      if (locked.current) return;
      locked.current = true; setBusy(true);
      void action(async () => {
        if (reminder) { validateTime(time); await ensureReminderPermission(); }
        await saveHabit({ name, icon, color, dailyGoal: goal, activeDays: days, reminderTime: reminder ? time : null }, initial?.id);
      }, () => { haptics.success(); onClose(); })
        .finally(() => { locked.current = false; setBusy(false); });
    }} />
  </FormSheet>;
}
