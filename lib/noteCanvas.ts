import type { NoteBlock } from './repos/notes';

/** Horizontal fractions keep the same composition on different phone widths; y is in pt. */
export type BlockLayout = { x: number; y: number; width: number; ratio?: number };
export type BlockFrame = BlockLayout & { height: number };
export const CANVAS_GAP = 16;
/** Half a line of body text: a new line is centred on the touch that placed it. */
const HALF_LINE = 12;
const isEmptyText = (block: NoteBlock) => block.type === 'TEXT' && !block.content?.trim();
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
    if (ratio !== undefined && (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio < 0.05 || ratio > 20)) return null;
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
      : block.type === 'DRAWING' ? pixels / (layout.ratio ?? 4 / 3) : block.type === 'VOICE' ? 60
      : Math.max(44, Math.ceil((block.content?.length ?? 0) * 8 / pixels) * 24);
    // Image heights follow the saved ratio even when a height-only resize never changes
    // the measured width. Text/checklist heights still follow their native content.
    const followsRatio = block.type === 'IMAGE' || (block.type === 'DRAWING' && layout.ratio !== undefined);
    const height = followsRatio ? estimate : actual && Math.abs(actual.width - pixels) < 1 ? actual.height : estimate;
    frames[block.id] = { ...layout, height };
    bottom = Math.max(bottom, layout.y + height + CANVAS_GAP);
  }
  return settleFrames(blocks, frames);
}

const overlap = (a: BlockFrame, b: BlockFrame) => {
  'worklet';
  return a.x < b.x + b.width - 0.001 && b.x < a.x + a.width - 0.001 && a.y < b.y + b.height && b.y < a.y + a.height;
};

/**
 * Text that grows and lines added between blocks push what is below them down, so content never
 * covers other content. Drawings float over the page instead, because writing on top of text
 * is often the point of them.
 */
function settleFrames(blocks: readonly NoteBlock[], frames: Record<number, BlockFrame>) {
  const settled = { ...frames };
  const placed: BlockFrame[] = [];
  for (const block of [...blocks].filter((item) => item.type !== 'DRAWING').sort((a, b) => frames[a.id].y - frames[b.id].y)) {
    let frame = frames[block.id];
    for (let blocker = placed.find((other) => overlap(frame, other)); blocker; blocker = placed.find((other) => overlap(frame, other))) {
      frame = { ...frame, y: blocker.y + blocker.height + CANVAS_GAP };
    }
    settled[block.id] = frame;
    placed.push(frame);
  }
  return settled;
}

/**
 * Where everything goes while `id` is held at `layout`: whatever it lands on moves down out of
 * the way, and whatever that lands on in turn. Always worked out from `frames` where they were
 * before the drag, so blocks return to their places as soon as the held one moves off them.
 */
export function makeRoom(frames: Readonly<Record<number, BlockFrame>>, id: number, layout: BlockLayout): Record<number, BlockFrame> {
  'worklet';
  const base = frames[id];
  // A resized photo or drawing keeps its proportions, so its height follows its width.
  const result: Record<number, BlockFrame> = { ...frames, [id]: { ...layout, height: base ? base.height * layout.width / base.width : 0 } };
  const others = Object.keys(result).map(Number).filter((other) => other !== id);
  const queue = [id];
  for (let moves = others.length * others.length + others.length; queue.length && moves > 0; moves -= 1) {
    const mover = result[queue.shift() as number];
    for (const other of others) {
      if (result[other] === mover || !overlap(result[other], mover)) continue;
      result[other] = { ...result[other], y: mover.y + mover.height + CANVAS_GAP };
      queue.push(other);
    }
  }
  return result;
}

/** Blocks top to bottom (then left to right), the order a free-placed note reads in. */
export function readingOrder(blocks: readonly NoteBlock[]): NoteBlock[] {
  const frames = canvasFrames(blocks, 340);
  return [...blocks].sort((a, b) => frames[a.id].y - frames[b.id].y || frames[a.id].x - frames[b.id].x);
}

export function moveBlockLayout(layout: BlockLayout, dx: number, dy: number, canvasWidth: number): BlockLayout {
  'worklet';
  return { ...layout, x: Math.max(0, Math.min(1 - layout.width, layout.x + dx / Math.max(1, canvasWidth))), y: Math.max(0, Math.min(100000, layout.y + dy)) };
}

/** Two-finger resize: keeps the block's proportions and centre, sliding it back onto the page. */
export function scaleBlockLayout(layout: BlockLayout, scale: number, canvasWidth: number, heightPerWidth = 1 / (layout.ratio ?? 4 / 3)): BlockLayout {
  'worklet';
  const width = Math.max(0.2, Math.min(1, layout.width * scale));
  const grown = width - layout.width;
  const x = Math.max(0, Math.min(1 - width, layout.x - grown / 2));
  const y = Math.max(0, Math.min(100000, layout.y - canvasWidth * grown * heightPerWidth / 2));
  return { ...layout, x, y, width };
}

/** A touch on blank space writes at the left edge of that line, below any block that reaches it. */
export function textPlacement(blocks: readonly NoteBlock[], frames: Readonly<Record<number, BlockFrame>>, touchY: number): BlockLayout {
  // An unknown touch point (some pointer events lack one) must not poison the saved position.
  let y = Number.isFinite(touchY) ? Math.max(0, touchY - HALF_LINE) : Math.max(0, ...blocks.map((block) => frames[block.id].y + frames[block.id].height));
  for (const block of blocks) {
    const frame = frames[block.id];
    // Empty text is removed by this insertion, and a drawing floats over the page.
    if (!isEmptyText(block) && block.type !== 'DRAWING' && frame.y <= touchY) y = Math.max(y, frame.y + frame.height);
  }
  return { x: 0, y, width: 1 };
}

/** Freeze legacy positions before inserting, replacing an empty insertion box with media. */
export function insertCanvasBlock(blocks: readonly NoteBlock[], block: NoteBlock, width: number,
  measuredFrames: Record<number, BlockFrame>, selectedId: number | null, at?: BlockLayout): NoteBlock[] {
  const frames = { ...canvasFrames(blocks, width), ...measuredFrames };
  const selected = blocks.find((item) => item.id === selectedId);
  const empty = selected && isEmptyText(selected) ? selected : !selected ? blocks.find(isEmptyText) : undefined;
  const bottom = Math.max(0, ...blocks.map((item) => frames[item.id].y + frames[item.id].height));
  let target = at;
  if (!target && empty) target = frames[empty.id];
  if (!target && selected) {
    const frame = frames[selected.id];
    target = { x: frame.x, y: frame.y + frame.height + CANVAS_GAP, width: frame.width };
  }
  target ??= { x: 0, y: bottom + CANVAS_GAP, width: block.type === 'TEXT' || block.type === 'CHECKLIST' ? 1 : 0.8 };
  // Playback and duration controls must remain usable on narrow phone screens.
  const blockWidth = block.type === 'VOICE' ? Math.max(Math.min(0.8, target.width), Math.min(1, 220 / width)) : target.width;
  const layout = { ...target, width: blockWidth, x: Math.min(target.x, 1 - blockWidth) };
  const existing = blocks.filter((item) => !isEmptyText(item)).map((item) => ({ ...item, layout: serializeBlockLayout(frames[item.id]) }));
  return [...existing, { ...block, layout: serializeBlockLayout(layout) }];
}
