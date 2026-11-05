import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { Checkbox } from '@/components/ui/Checkbox';
import { PressableScale } from '@/components/ui/PressableScale';
import { GroupedList, ListRow, Separator } from '@/components/ui/GroupedList';
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
import { InlineTodoEntry } from './InlineTodoEntry';

/**
 * Grouped to-do rows, shared by Diary and Today; `header` is an optional first row such as
 * the carry-over banner. Adding happens right in the list, in a row that stays ready for the next.
 * - Tap (or hold without dragging) to edit; hold and drag to reorder, swipe left to delete.
 * - Ticking shows the check and strike at once but saves after the strike has drawn, so
 *   the row finishes striking in place before it glides below the open to-dos.
 */
export function TodoList({ todos, header, onDraggingChange, inlineDate, addRequest = 0 }: {
  todos: Todo[]; header?: ReactNode; onDraggingChange?: (dragging: boolean) => void;
  /** The day new to-dos go to; changing `addRequest` opens the add row from outside the list. */
  inlineDate: string; addRequest?: number;
}) {
  const theme = useTheme();
  const action = useAction();
  const toast = useToast();
  const [editing, setEditing, editingTransition] = useSheetState<Todo>();
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const [inline, setInline] = useState({ date: inlineDate, request: addRequest, open: addRequest > 0 });
  if (inline.date !== inlineDate || inline.request !== addRequest) {
    setInline({ date: inlineDate, request: addRequest, open: inline.date === inlineDate && inline.request !== addRequest });
  }
  const setAddingInline = (open: boolean) => setInline((current) => ({ ...current, open }));
  const addingInline = inline.open;
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
  // A done row dragged above open ones glides back below once the order is saved.
  const reorder = (ids: number[]) => action(() => reorderTodos(savedTodoOrder(todos, ids)));
  const lastId = todos.at(-1)?.id;
  return <>
    <GroupedList>
      {header}
      {/* Only with rows: an empty stack would still get a separator above the add row. */}
      {todos.length > 0 && <ReorderableStack key="todos" items={todos} gap={0} onReorder={reorder} onDraggingChange={onDraggingChange}
        renderItem={(todo) => <TodoRow todo={todo} done={pending[todo.id] ?? !!todo.isDone} separator={todo.id !== lastId}
          separatorInset={theme.sizes.rowPadding + theme.sizes.checkbox + theme.spacing.md}
          onToggle={() => toggle(todo)} onEdit={() => setEditing(todo)} onDelete={() => remove(todo)} />} />}
      {addingInline ? <InlineTodoEntry key={inlineDate} date={inlineDate} onClose={() => setAddingInline(false)} />
        : <ListRow key="add" title={todos.length ? 'Add to-do' : 'Nothing planned · Add to-do'} icon={{ icon: 'plus', color: 'green' }} onPress={() => setAddingInline(true)} />}
    </GroupedList>
    {editing && <TodoSheet {...editingTransition} date={editing.date} initial={editing} onClose={() => setEditing(null)} />}
  </>;
}

/** Rows draw their own hairline, since the stack moves them independently of the list. */
function TodoRow({ todo, done, separator, separatorInset, onToggle, onEdit, onDelete }: {
  todo: Todo; done: boolean; separator: boolean; separatorInset: number; onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const theme = useTheme();
  const reorderActions = useReorderActions();
  return <SwipeableRow onDelete={onDelete}>
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: theme.spacing.lg, gap: theme.spacing.md }}>
      <Checkbox checked={done} onToggle={onToggle} accessibilityLabel={todo.text} />
      <ReorderHandle style={{ flex: 1 }} onHold={onEdit}>
        <PressableScale {...reorderActions} accessibilityLabel={`Edit ${todo.text}`} onPress={onEdit}
          accessibilityHint="Tap to edit, hold and drag to reorder, or swipe left to delete">
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.lg, paddingRight: theme.spacing.lg, gap: theme.spacing.md }}>
            <View style={{ flex: 1 }}><StrikeText struck={done}>{todo.text}</StrikeText></View>
            {todo.priority ? <Text color="dangerText">!</Text> : null}
            {todo.time ? <Text variant="subheadline" color="secondaryLabel" tabular>{todo.time}</Text> : null}
          </View>
        </PressableScale>
      </ReorderHandle>
    </View>
    {separator && <Separator inset={separatorInset} />}
  </SwipeableRow>;
}
