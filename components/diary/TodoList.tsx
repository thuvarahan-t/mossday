import { View } from 'react-native';
import { Checkbox } from '@/components/ui/Checkbox';
import { GroupedList } from '@/components/ui/GroupedList';
import { ReorderableRow } from '@/components/ui/ReorderableRow';
import { StrikeText } from '@/components/ui/StrikeText';
import { SwipeableRow } from '@/components/ui/SwipeableRow';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useAction } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { deleteTodo, reorderTodos, restoreTodo, toggleTodo, type Todo } from '@/lib/repos/diary';
import { haptics } from '@/lib/haptics';

export function TodoList({ todos, reorder = false }: { todos: Todo[]; reorder?: boolean }) {
  const theme = useTheme();
  const action = useAction();
  const toast = useToast();
  return <GroupedList separatorInset={theme.sizes.rowPadding + theme.sizes.checkbox + theme.spacing.md}>
    {todos.map((todo, index) => {
      const row = <SwipeableRow onDelete={() => { void action(() => deleteTodo(todo.id), () => toast({ message: 'To-do deleted', actionLabel: 'Undo', onAction: () => { void action(() => restoreTodo(todo)); } })); }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg, gap: theme.spacing.md }}>
          <Checkbox checked={!!todo.isDone} onToggle={() => { void action(() => toggleTodo(todo), haptics.tap); }} accessibilityLabel={todo.text} />
          <View style={{ flex: 1 }}><StrikeText struck={!!todo.isDone}>{todo.text}</StrikeText></View>
          {todo.priority ? <Text color="dangerText">!</Text> : null}
          {todo.time ? <Text variant="subheadline" color="secondaryLabel" tabular>{todo.time}</Text> : null}
        </View>
      </SwipeableRow>;
      return reorder ? <ReorderableRow key={todo.id} label={`Reorder ${todo.text}`} onMove={(offset) => {
        const ids = todos.map((t) => t.id);
        ids.splice(index, 1); ids.splice(Math.max(0, Math.min(ids.length, index + offset)), 0, todo.id);
        void action(() => reorderTodos(ids));
      }}>{row}</ReorderableRow> : <View key={todo.id}>{row}</View>;
    })}
  </GroupedList>;
}
