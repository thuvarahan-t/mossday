import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AnimatedListItem } from '@/components/ui/AnimatedListItem';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormSheet, type FormSheetTransition } from '@/components/ui/FormSheet';
import { GroupedList, ListRow } from '@/components/ui/GroupedList';
import { SwatchPicker, WeekdayPicker } from '@/components/ui/Pickers';
import { PressableScale } from '@/components/ui/PressableScale';
import { Stepper } from '@/components/ui/Stepper';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { TimeField } from '@/components/ui/TimeField';
import { Toggle } from '@/components/ui/Toggle';
import { useAction } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { saveHabit, type Habit } from '@/lib/repos/habits';
import { haptics } from '@/lib/haptics';
import { accents, type AccentName } from '@/constants/colors';
import { ensureReminderPermission, validateTime } from '@/lib/reminders';

const habitEmojis = ['🌱', '💧', '📖', '🏋️', '💻', '🧘', '🏃', '🚶', '🥗', '🍎', '😴', '🦷', '💊', '✍️', '🎸', '🧹', '💰', '📵', '🙏', '☀️'];
const swatches: readonly AccentName[] = ['green', 'blue', 'indigo', 'orange', 'pink', 'teal'];

/** New/Edit habit form (design G): name card with emoji tile, colour card, goal/days/reminder group. */
export function HabitSheet({ initial, onClose, ...transition }: { initial?: Habit; onClose: () => void } & Partial<FormSheetTransition>) {
  const theme = useTheme();
  const action = useAction();
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '🌱');
  const [pickingEmoji, setPickingEmoji] = useState(false);
  const [color, setColor] = useState<AccentName>((Object.keys(accents.light) as AccentName[]).find((key) => key === initial?.color || accents.light[key] === initial?.color) ?? 'green');
  const [goal, setGoal] = useState(initial?.dailyGoal ?? 1);
  const [days, setDays] = useState(initial?.activeDays ?? 127);
  const [reminder, setReminder] = useState(!!initial?.reminderTime);
  const [time, setTime] = useState(initial?.reminderTime ?? '09:00');
  const save = () => {
    if (locked.current) return;
    locked.current = true; setBusy(true);
    void action(async () => {
      if (reminder) { validateTime(time); await ensureReminderPermission(); }
      await saveHabit({ name, icon, color, dailyGoal: goal, activeDays: days, reminderTime: reminder ? time : null }, initial?.id);
    }, () => { haptics.success(); onClose(); })
      .finally(() => { locked.current = false; setBusy(false); });
  };
  const emojiTile = { width: theme.sizes.emojiTile, height: theme.sizes.emojiTile, borderRadius: theme.radii.lg, backgroundColor: theme.colors.fill };
  const fullWidth = { marginHorizontal: 0 };
  return <FormSheet {...transition} size="fit" dense dockToKeyboard title={initial ? 'Edit Habit' : 'New Habit'} onClose={() => { if (!busy) onClose(); }}
    trailing={<Button title={initial ? 'Save' : 'Add'} size="small" disabled={!name.trim() || busy} onPress={save} />}>
    <Card padding="row" inset={false} style={[styles.row, { gap: theme.spacing.md }]}>
      <PressableScale haptic="selection" accessibilityLabel={`Habit emoji, ${icon}. Choose another`} onPress={() => setPickingEmoji(!pickingEmoji)} style={[styles.center, emojiTile]}>
        <Text variant="title1" weight="regular">{icon}</Text>
      </PressableScale>
      <View style={styles.fill}><TextField appearance="bare" value={name} onChangeText={setName} placeholder="Habit name" accessibilityLabel="Habit name" maxLength={100} /></View>
    </Card>
    {pickingEmoji && <AnimatedListItem><Card padding="row" inset={false} style={[styles.wrap, { gap: theme.spacing.sm }]}>
      {habitEmojis.map((emoji) => <PressableScale key={emoji} haptic="selection" accessibilityLabel={emoji} accessibilityState={{ selected: emoji === icon }}
        onPress={() => { setIcon(emoji); setPickingEmoji(false); }}
        style={[styles.center, emojiTile, { backgroundColor: emoji === icon ? theme.colors.accentFill : 'transparent' }]}>
        <Text variant="title2" weight="regular">{emoji}</Text>
      </PressableScale>)}
    </Card></AnimatedListItem>}
    <Text variant="footnote" color="secondaryLabel" style={{ textTransform: 'uppercase', paddingHorizontal: theme.sizes.rowPadding, marginBottom: -theme.spacing.sm }}>Colour</Text>
    <Card padding="row" inset={false}><SwatchPicker colors={swatches} selected={color} onSelect={setColor} /></Card>
    <GroupedList separatorInset={theme.sizes.rowPadding} style={fullWidth}>
      <ListRow title="Times a day" value={String(goal)} accessory={<Stepper value={goal} min={1} max={100} onChange={setGoal} accessibilityLabel="Daily goal" />} />
      <View style={{ padding: theme.sizes.rowPadding, gap: theme.spacing.sm }}><Text>Repeat</Text><WeekdayPicker mask={days} onChange={setDays} /></View>
      <ListRow title="Reminder" accessory={<Toggle value={reminder} onValueChange={setReminder} accessibilityLabel="Habit reminder" />} />
    </GroupedList>
    {reminder && <AnimatedListItem><TimeField value={time} onChange={setTime} label="Habit reminder time" /></AnimatedListItem>}
  </FormSheet>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
});
