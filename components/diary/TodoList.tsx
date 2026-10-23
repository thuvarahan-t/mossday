import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Checkbox } from '@/components/ui/Checkbox';
import { AnimatedListItem } from '@/components/ui/AnimatedListItem';
import { GroupedList } from '@/components/ui/GroupedList';
import { ReorderableRow } from '@/components/ui/ReorderableRow';
import { STRIKE_DURATION, StrikeText } from '@/components/ui/StrikeText';
import { SwipeableRow } from '@/components/ui/SwipeableRow';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useAction } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { deleteTodo, reorderTodos, restoreTodo, toggleTodo, type Todo } from '@/lib/repos/diary';
import { haptics } from '@/lib/haptics';

/**
 * Grouped to-do rows; `header` is an optional first row such as the diary carry-over banner.
 * Ticking shows the check and strike at once but saves after the strike has drawn, so the
 * row finishes striking in place before it glides below the open to-dos.
 */
export function TodoList({ todos, reorder = false, header }: { todos: Todo[]; reorder?: boolean; header?: ReactNode }) {
  const theme = useTheme();
  const action = useAction();
  const toast = useToast();
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const timers = useRef(new Map<ReturnType<typeof setTimeout>, Todo>());
  // Leaving the screen saves pending ticks straight away rather than dropping them.
  useEffect(() => {
    const scheduled = timers.current;
    return () => scheduled.forEach((todo, timer) => { clearTimeout(timer); void toggleTodo(todo).catch(() => undefined); });
  }, []);
  const toggle = (todo: Todo) => {
    if (pending[todo.id] !== undefined) return;
    haptics.tap();
    setPending((current) => ({ ...current, [todo.id]: !todo.isDone }));
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      void action(() => toggleTodo(todo)).finally(() => setPending(({ [todo.id]: _done, ...rest }) => rest));
    }, STRIKE_DURATION);
    timers.current.set(timer, todo);
  };
  return <GroupedList separatorInset={theme.sizes.rowPadding + theme.sizes.checkbox + theme.spacing.md}>
    {header}
    {todos.map((todo, index) => {
      const done = pending[todo.id] ?? !!todo.isDone;
      const row = <SwipeableRow onDelete={() => { void action(() => deleteTodo(todo.id), () => toast({ message: 'To-do deleted', actionLabel: 'Undo', onAction: () => { void action(() => restoreTodo(todo)); } })); }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.lg, gap: theme.spacing.md }}>
          <Checkbox checked={done} onToggle={() => toggle(todo)} accessibilityLabel={todo.text} />
          <View style={{ flex: 1 }}><StrikeText struck={done}>{todo.text}</StrikeText></View>
          {todo.priority ? <Text color="dangerText">!</Text> : null}
          {todo.time ? <Text variant="subheadline" color="secondaryLabel" tabular>{todo.time}</Text> : null}
        </View>
      </SwipeableRow>;
      return reorder ? <ReorderableRow key={todo.id} label={`Reorder ${todo.text}`} onMove={(offset) => {
        const ids = todos.map((t) => t.id);
        ids.splice(index, 1); ids.splice(Math.max(0, Math.min(ids.length, index + offset)), 0, todo.id);
        void action(() => reorderTodos(ids));
      }}>{row}</ReorderableRow> : <AnimatedListItem key={todo.id}>{row}</AnimatedListItem>;
    })}
  </GroupedList>;
}
