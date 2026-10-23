/** Resolve the nearest grid cell, keeping incomplete final rows inside the list. */
export function categoryDropIndex(start: number, x: number, y: number, columnStep: number, rowStep: number, count: number): number {
  'worklet';
  const column = Math.max(0, Math.min(2, start % 3 + Math.round(x / Math.max(1, columnStep))));
  const row = Math.max(0, Math.min(Math.ceil(count / 3) - 1, Math.floor(start / 3) + Math.round(y / Math.max(1, rowStep))));
  return Math.min(count - 1, row * 3 + column);
}
