/** Undo keeps this many steps; older ones fall off. */
const LIMIT = 100;
/** Typing in one field within this long after the last change is one undo step. */
const COALESCE_MS = 1200;

export type History<T> = { past: T[]; future: T[]; group: string | null; at: number };
export const emptyHistory = <T>(): History<T> => ({ past: [], future: [], group: null, at: 0 });

/**
 * Records `previous` (the draft before an edit) as an undo step. Edits that share a `group`
 * (keystrokes in one field) and come close together merge into one step, so Undo removes
 * a burst of typing rather than one letter; a `null` group (adding a block, ticking an
 * item) is always its own step. Any new edit clears Redo.
 */
export function recordEdit<T>(history: History<T>, previous: T, group: string | null, now = Date.now()): History<T> {
  if (group !== null && group === history.group && now - history.at < COALESCE_MS) return { ...history, future: [], at: now };
  return { past: [...history.past, previous].slice(-LIMIT), future: [], group, at: now };
}

export function undo<T>(history: History<T>, current: T): { history: History<T>; draft: T } | null {
  const draft = history.past.at(-1);
  if (draft === undefined) return null;
  return { draft, history: { past: history.past.slice(0, -1), future: [current, ...history.future], group: null, at: 0 } };
}

export function redo<T>(history: History<T>, current: T): { history: History<T>; draft: T } | null {
  const [draft, ...future] = history.future;
  if (draft === undefined) return null;
  return { draft, history: { past: [...history.past, current], future, group: null, at: 0 } };
}
