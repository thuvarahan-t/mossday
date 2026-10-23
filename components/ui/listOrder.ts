/** Shared by drag worklets and accessibility actions. Inputs are never mutated. */
export function moveItem(ids: number[], id: number, destination: number): number[] {
  'worklet';
  const from = ids.indexOf(id);
  const to = Math.max(0, Math.min(ids.length - 1, destination));
  if (from < 0 || from === to) return ids;
  const next = ids.slice();
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

/** Top of each row when rows of varying height are stacked in `ids` order. */
export function stackTops(ids: readonly number[], heights: Readonly<Record<number, number>>, gap: number): Record<number, number> {
  'worklet';
  const tops: Record<number, number> = {};
  let top = 0;
  for (const id of ids) {
    tops[id] = top;
    top += (heights[id] ?? 0) + gap;
  }
  return tops;
}

/** The slot, among the other rows stacked without `id`, whose top is nearest the dragged row's top. */
export function stackDropIndex(ids: readonly number[], heights: Readonly<Record<number, number>>, gap: number, id: number, top: number): number {
  'worklet';
  const others = ids.filter((other) => other !== id);
  let best = 0;
  let bestDistance = Infinity;
  let slotTop = 0;
  for (let slot = 0; slot <= others.length; slot += 1) {
    const distance = Math.abs(slotTop - top);
    if (distance < bestDistance) { best = slot; bestDistance = distance; }
    if (slot < others.length) slotTop += (heights[others[slot]] ?? 0) + gap;
  }
  return best;
}
