import type { NoteBlock } from './repos/notes';

/** Horizontal fractions keep the same composition on different phone widths; y is in pt. */
export type BlockLayout = { x: number; y: number; width: number; ratio?: number };
export type BlockFrame = BlockLayout & { height: number };
export const BLOCK_CHROME = 60;
export const CANVAS_GAP = 16;
export const serializeBlockLayout = ({ x, y, width, ratio }: BlockLayout): string =>
  JSON.stringify({ x, y, width, ...(ratio === undefined ? {} : { ratio }) });

export function parseBlockLayout(raw: string | null | undefined): BlockLayout | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const { x, y, width, ratio } = value as Record<string, unknown>;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' ||
      ![x, y, width].every(Number.isFinite) || x < 0 || y < 0 || y > 100000 || width < 0.2 || width > 1 || x + width > 1.001) return null;
    if (ratio !== undefined && (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio < 0.2 || ratio > 5)) return null;
    return { x, y, width, ...(typeof ratio === 'number' ? { ratio } : {}) };
  } catch { return null; }
}

export function canvasFrames(blocks: readonly NoteBlock[], width: number, measured: Readonly<Record<number, { width: number; height: number }>> = {}): Record<number, BlockFrame> {
  const frames: Record<number, BlockFrame> = {};
  let bottom = 0;
  for (const block of blocks) {
    const layout = parseBlockLayout(block.layout) ?? { x: 0, y: bottom, width: 1 };
    const pixels = Math.max(1, width * layout.width);
    const actual = measured[block.id];
    const estimate = block.type === 'IMAGE' ? pixels / (layout.ratio ?? 4 / 3)
      : block.type === 'DRAWING' ? pixels * 0.75 : block.type === 'VOICE' ? 60
      : Math.max(44, Math.ceil((block.content?.length ?? 0) * 8 / pixels) * 24);
    // Image heights follow the saved ratio even when a height-only resize never changes
    // the measured width. Text/checklist heights still follow their native content.
    const height = block.type === 'IMAGE' ? estimate + BLOCK_CHROME + 2
      : actual && Math.abs(actual.width - pixels) < 1 ? actual.height : estimate + BLOCK_CHROME;
    frames[block.id] = { ...layout, height };
    bottom = Math.max(bottom, layout.y + height + CANVAS_GAP);
  }
  return frames;
}

export function moveBlockLayout(layout: BlockLayout, dx: number, dy: number, canvasWidth: number): BlockLayout {
  'worklet';
  return { ...layout, x: Math.max(0, Math.min(1 - layout.width, layout.x + dx / Math.max(1, canvasWidth))), y: Math.max(0, Math.min(100000, layout.y + dy)) };
}

export function resizeBlockLayout(layout: BlockLayout, dx: number, dy: number, canvasWidth: number): BlockLayout {
  'worklet';
  const width = Math.max(0.2, Math.min(1 - layout.x, layout.width + dx / Math.max(1, canvasWidth)));
  const height = Math.max(48, canvasWidth * layout.width / (layout.ratio ?? 4 / 3) + dy);
  return { ...layout, width, ratio: Math.max(0.2, Math.min(5, canvasWidth * width / height)) };
}

/** Freeze legacy positions before inserting, replacing an empty insertion box with media. */
export function insertCanvasBlock(blocks: readonly NoteBlock[], block: NoteBlock, width: number,
  measuredFrames: Record<number, BlockFrame>, selectedId: number | null, at?: BlockLayout): NoteBlock[] {
  const frames = { ...canvasFrames(blocks, width), ...measuredFrames };
  const selected = blocks.find((item) => item.id === selectedId);
  const isEmpty = (item: NoteBlock) => item.type === 'TEXT' && !item.content?.trim();
  const empty = selected && isEmpty(selected) ? selected : !selected ? blocks.find(isEmpty) : undefined;
  const bottom = Math.max(0, ...blocks.map((item) => frames[item.id].y + frames[item.id].height));
  let target = at;
  if (!target && empty) target = frames[empty.id];
  if (!target && selected) {
    const frame = frames[selected.id];
    target = { x: frame.x, y: frame.y + frame.height + CANVAS_GAP, width: frame.width };
  }
  target ??= { x: 0, y: bottom + CANVAS_GAP, width: 0.8 };
  // Playback and duration controls must remain usable on narrow phone screens.
  const blockWidth = block.type === 'VOICE' ? Math.max(Math.min(0.8, target.width), Math.min(1, 220 / width)) : target.width;
  const layout = { ...target, width: blockWidth, x: Math.min(target.x, 1 - blockWidth) };
  const existing = blocks.filter((item) => !isEmpty(item)).map((item) => ({ ...item, layout: serializeBlockLayout(frames[item.id]) }));
  return [...existing, { ...block, layout: serializeBlockLayout(layout) }];
}
