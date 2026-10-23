import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Checkbox } from '@/components/ui/Checkbox';
import { ContextMenu, type ContextMenuHandle } from '@/components/ui/ContextMenu';
import { GroupedList, Separator } from '@/components/ui/GroupedList';
import { ReorderableStack, ReorderHandle, useReorderActions } from '@/components/ui/ReorderableStack';
import { STRIKE_DURATION, StrikeText } from '@/components/ui/StrikeText';
import { SwipeableRow } from '@/components/ui/SwipeableRow';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { useAction } from '@/hooks/useResource';
import { useSheetState } from '@/hooks/useSheetState';
import { useTheme } from '@/hooks/useTheme';
import { deleteTodo, reorderTodos, restoreTodo, toggleTodo, type Todo } from '@/lib/repos/diary';
import { haptics } from '@/lib/haptics';
import { TodoSheet } from './TodoSheet';
import { savedTodoOrder } from './todoOrder';

/**
 * Grouped to-do rows, shared by Diary and Today; `header` is an optional first row such as
 * the diary carry-over banner, and `limit` shows only the first rows (Today).
 * - Hold a to-do and release for Edit / Delete; hold and drag to reorder it live. Tap the
 *   text to edit, swipe left to delete.
 * - Ticking shows the check and strike at once but saves after the strike has drawn, so
 *   the row finishes striking in place before it glides below the open to-dos.
 */
export function TodoList({ todos, limit, header, onDraggingChange }: {
  todos: Todo[]; limit?: number; header?: ReactNode; onDraggingChange?: (dragging: boolean) => void;
}) {
  const theme = useTheme();
  const action = useAction();
  const toast = useToast();
  const [editing, setEditing, editingTransition] = useSheetState<Todo>();
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
  const remove = (todo: Todo) => {
    void action(() => deleteTodo(todo.id), () => toast({ message: 'To-do deleted', actionLabel: 'Undo', onAction: () => { void action(() => restoreTodo(todo)); } }));
  };
  const visible = limit ? todos.slice(0, limit) : todos;
  // A done row dragged above open ones glides back below once the order is saved.
  const reorder = (ids: number[]) => action(() => reorderTodos(savedTodoOrder(todos, ids)));
  const lastId = visible.at(-1)?.id;
  return <>
    <GroupedList>
      {header}
      <ReorderableStack key="todos" items={visible} gap={0} onReorder={reorder} onDraggingChange={onDraggingChange}
        renderItem={(todo) => <TodoRow todo={todo} done={pending[todo.id] ?? !!todo.isDone} separator={todo.id !== lastId}
          separatorInset={theme.sizes.rowPadding + theme.sizes.checkbox + theme.spacing.md}
          onToggle={() => toggle(todo)} onEdit={() => setEditing(todo)} onDelete={() => remove(todo)} />} />
    </GroupedList>
    {editing && <TodoSheet {...editingTransition} date={editing.date} initial={editing} onClose={() => setEditing(null)} />}
  </>;
}

/** Rows draw their own hairline, since the stack moves them independently of the list. */
function TodoRow({ todo, done, separator, separatorInset, onToggle, onEdit, onDelete }: {
  todo: Todo; done: boolean; separator: boolean; separatorInset: number; onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const theme = useTheme();
  const menu = useRef<ContextMenuHandle>(null);
  const reorderActions = useReorderActions();
  return <SwipeableRow onDelete={onDelete}>
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: theme.spacing.lg, gap: theme.spacing.md }}>
      <Checkbox checked={done} onToggle={onToggle} accessibilityLabel={todo.text} />
      <ReorderHandle style={{ flex: 1 }} onHold={() => menu.current?.open()}>
        <ContextMenu ref={menu} manualTrigger accessibilityLabel={`Edit ${todo.text}`} onPress={onEdit}
          triggerProps={{ ...reorderActions, accessibilityHint: 'Long press to edit or delete, or hold and drag to reorder' }}
          actions={[{ label: 'Edit', icon: 'edit', onPress: onEdit }, { label: 'Delete', icon: 'trash', destructive: true, onPress: onDelete }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.lg, paddingRight: theme.spacing.lg, gap: theme.spacing.md }}>
            <View style={{ flex: 1 }}><StrikeText struck={done}>{todo.text}</StrikeText></View>
            {todo.priority ? <Text color="dangerText">!</Text> : null}
            {todo.time ? <Text variant="subheadline" color="secondaryLabel" tabular>{todo.time}</Text> : null}
          </View>
        </ContextMenu>
      </ReorderHandle>
    </View>
    {separator && <Separator inset={separatorInset} />}
  </SwipeableRow>;
}
