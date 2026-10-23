import { Button } from '@/components/ui/Button';
import { FormSheet, type FormSheetTransition } from '@/components/ui/FormSheet';
import { GroupedList, ListRow } from '@/components/ui/GroupedList';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useAction } from '@/hooks/useResource';
import { archiveHabit, type Habit } from '@/lib/repos/habits';

/** Archived habits keep their history; Restore puts one back where it was in the list. */
export function ArchivedHabitsSheet({ habits, onClose, ...transition }: { habits: Habit[]; onClose: () => void } & Partial<FormSheetTransition>) {
  const action = useAction();
  const toast = useToast();
  const restore = (habit: Habit) => {
    void action(() => archiveHabit(habit.id, false), () => toast({
      message: `${habit.name} restored`, actionLabel: 'Undo', onAction: () => { void action(() => archiveHabit(habit.id)); },
    }));
  };
  return <FormSheet size="fit" dense {...transition} title="Archived habits" onClose={onClose}>
    {habits.length ? <GroupedList style={{ marginHorizontal: 0 }}>
      {habits.map((habit) => <ListRow key={habit.id} title={`${habit.icon || '🌱'}  ${habit.name}`}
        accessory={<Button title="Restore" size="small" variant="tinted" accessibilityLabel={`Restore ${habit.name}`} onPress={() => restore(habit)} />} />)}
    </GroupedList> : <Text color="secondaryLabel" align="center">No archived habits.</Text>}
  </FormSheet>;
}
