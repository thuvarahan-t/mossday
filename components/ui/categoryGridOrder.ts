/** Shared by gesture worklets and accessibility actions. Inputs are never mutated. */
export function moveCategory(ids: number[], id: number, destination: number): number[] {
  'worklet';
  const from = ids.indexOf(id);
  const to = Math.max(0, Math.min(ids.length - 1, destination));
  if (from < 0 || from === to) return ids;
  const next = ids.slice();
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

/** Resolve the nearest grid cell, keeping incomplete final rows inside the list. */
export function categoryDropIndex(start: number, x: number, y: number, columnStep: number, rowStep: number, count: number): number {
  'worklet';
  const column = Math.max(0, Math.min(2, start % 3 + Math.round(x / Math.max(1, columnStep))));
  const row = Math.max(0, Math.min(Math.ceil(count / 3) - 1, Math.floor(start / 3) + Math.round(y / Math.max(1, rowStep))));
  return Math.min(count - 1, row * 3 + column);
}
