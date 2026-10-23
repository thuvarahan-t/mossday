import type { Todo } from '@/lib/repos/diary';

/**
 * The whole day's order after the visible rows were dropped as `visibleIds`: rows hidden by a
 * display limit keep their place after them, and open to-dos always stay above done ones.
 */
export function savedTodoOrder(todos: readonly Pick<Todo, 'id' | 'isDone'>[], visibleIds: readonly number[]): number[] {
  const done = new Set(todos.filter((todo) => todo.isDone).map((todo) => todo.id));
  const all = [...visibleIds, ...todos.slice(visibleIds.length).map((todo) => todo.id)];
  return [...all.filter((id) => !done.has(id)), ...all.filter((id) => done.has(id))];
}
