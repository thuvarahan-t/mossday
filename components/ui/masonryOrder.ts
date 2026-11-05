import { moveItem } from './listOrder';

export type MasonrySlot = { x: number; y: number };

/** Two-column placement shared by the preview and the actual cards, using measured heights. */
export function masonryLayout(ids: readonly number[], heights: Readonly<Record<number, number>>, width: number, gap: number) {
  'worklet';
  const bottoms = [0, 0];
  const slots: Record<number, MasonrySlot> = {};
  for (const id of ids) {
    const column = bottoms[0] <= bottoms[1] ? 0 : 1;
    slots[id] = { x: column * (width + gap), y: bottoms[column] };
    bottoms[column] += (heights[id] ?? 0) + gap;
  }
  return { slots, height: Math.max(0, ...bottoms) - (ids.length ? gap : 0) };
}

/** Freeze insertion targets at lift time so moving neighbours cannot cause hover oscillation. */
export function masonryTargets(ids: number[], heights: Record<number, number>, width: number, gap: number, id: number): MasonrySlot[] {
  'worklet';
  return ids.map((_, index) => masonryLayout(moveItem(ids, id, index), heights, width, gap).slots[id]);
}

export function masonryDropIndex(targets: readonly MasonrySlot[], x: number, y: number, current: number): number {
  'worklet';
  let best = current;
  const distance = (slot: MasonrySlot) => (slot.x - x) ** 2 + (slot.y - y) ** 2;
  let closest = targets[current] ? distance(targets[current]) : Infinity;
  targets.forEach((slot, index) => {
    const next = distance(slot);
    if (next + 144 < closest) { best = index; closest = next; }
  });
  return best;
}
