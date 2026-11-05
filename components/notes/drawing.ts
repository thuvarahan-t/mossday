import type { AccentName } from '@/constants/colors';

/** `ink` follows the theme's text colour, so drawings stay visible in dark mode. */
export type InkColor = 'ink' | AccentName;
export type DrawingTool = 'pen' | 'marker' | 'highlighter';
/** `points` is a flat x,y list in canvas-width units: x runs 0–1 and y 0–`aspect`. */
export type Stroke = { tool: DrawingTool; color: InkColor; points: number[] };
/** The part of the page a drawing covers, in page widths. */
export type DrawingBox = { x: number; y: number; width: number; height: number };
/**
 * A drawing block's content: the canvas shape (height ÷ width) and its strokes, oldest first.
 * Drawings made on the page also have a `box`, the crop around their strokes; those made on the
 * old full-screen pad do not, and show the band `drawingFrame` finds for them.
 */
export type Drawing = { aspect: number; strokes: Stroke[]; box?: DrawingBox };

/** Line width and opacity per tool, like Samsung Notes' pen, marker and highlighter. */
export const TOOL_STYLE: Record<DrawingTool, { width: number; opacity: number }> = {
  pen: { width: 0.008, opacity: 1 }, marker: { width: 0.02, opacity: 1 }, highlighter: { width: 0.05, opacity: 0.35 },
};
export const INK_COLORS: readonly InkColor[] = ['ink', 'red', 'orange', 'yellow', 'green', 'blue', 'purple'];
const TOOLS = Object.keys(TOOL_STYLE);
const PRECISION = 10_000;
/** A block's narrowest allowed width, and its most extreme proportions, on the note's canvas. */
const MIN_BOX_WIDTH = 0.2;
const MAX_FLATNESS = 5;

export function parseDrawing(content: string | null): Drawing {
  try {
    const value: unknown = JSON.parse(content ?? 'null');
    if (typeof value !== 'object' || value === null) return { aspect: 1, strokes: [] };
    const { aspect, strokes, box } = value as Partial<Drawing>;
    return {
      aspect: typeof aspect === 'number' && aspect > 0 ? aspect : 1,
      strokes: Array.isArray(strokes) ? strokes.filter((stroke): stroke is Stroke => typeof stroke === 'object' && stroke !== null &&
        TOOLS.includes(stroke.tool) && typeof stroke.color === 'string' && Array.isArray(stroke.points) &&
        stroke.points.length >= 2 && stroke.points.every((n) => typeof n === 'number' && Number.isFinite(n))) : [],
      ...(box && [box.x, box.y, box.width, box.height].every(Number.isFinite) && box.width > 0 && box.height > 0 ? { box } : {}),
    };
  } catch { return { aspect: 1, strokes: [] }; }
}
export function serializeDrawing(drawing: Drawing) {
  const round = (n: number) => Math.round(n * PRECISION) / PRECISION;
  const { box } = drawing;
  return JSON.stringify({ aspect: round(drawing.aspect), strokes: drawing.strokes.map((stroke) => ({ ...stroke, points: stroke.points.map(round) })),
    ...(box ? { box: { x: round(box.x), y: round(box.y), width: round(box.width), height: round(box.height) } } : {}) });
}

/**
 * An SVG path through the points, smoothed with quadratic curves between midpoints so quick
 * strokes do not look jagged. A single tap draws a dot.
 */
export function strokePath(points: number[]): string {
  const f = (n: number) => String(Math.round(n * PRECISION) / PRECISION);
  if (points.length <= 2) return `M${f(points[0])} ${f(points[1])}l0.0001 0`;
  let path = `M${f(points[0])} ${f(points[1])}`;
  for (let i = 2; i < points.length - 2; i += 2) {
    path += `Q${f(points[i])} ${f(points[i + 1])} ${f((points[i] + points[i + 2]) / 2)} ${f((points[i + 1] + points[i + 3]) / 2)}`;
  }
  return `${path}L${f(points.at(-2)!)} ${f(points.at(-1)!)}`;
}

/** Distance from a point to the segment a–b. */
function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
/** Samsung's stroke eraser: any stroke the eraser touches goes, whole. */
export function eraseAt(strokes: Stroke[], x: number, y: number, radius: number): Stroke[] {
  return strokes.filter(({ points, tool }) => {
    const reach = radius + TOOL_STYLE[tool].width / 2;
    if (points.length <= 2) return Math.hypot(points[0] - x, points[1] - y) > reach;
    for (let i = 0; i < points.length - 2; i += 2) {
      if (segmentDistance(x, y, points[i], points[i + 1], points[i + 2], points[i + 3]) <= reach) return false;
    }
    return true;
  });
}

/**
 * The part of the canvas a preview shows: the full width, and the band of height around the
 * strokes, so a small sketch on a tall canvas does not leave a tall empty card. The band
 * stays between `min` and `max` times the width.
 */
export function drawingFrame(drawing: Drawing, min = 0.35, max = 1.25): { y: number; height: number } {
  const ys = drawing.strokes.flatMap((stroke) => stroke.points.filter((_, i) => i % 2 === 1));
  if (!ys.length) return { y: 0, height: min };
  const pad = 0.05;
  const top = Math.max(0, Math.min(...ys) - pad);
  const bottom = Math.min(Math.max(drawing.aspect, ...ys), Math.max(...ys) + pad);
  const height = Math.max(min, Math.min(max, bottom - top));
  return { y: Math.max(0, top - Math.max(0, height - (bottom - top)) / 2), height };
}

/** The crop a drawing is shown with, in the same units as its strokes. */
export function drawingViewBox(drawing: Drawing): DrawingBox {
  return drawing.box ?? { x: 0, width: 1, ...drawingFrame(drawing) };
}

/**
 * The page area around strokes drawn directly on a note. It is padded so thick lines are not
 * clipped, and kept within what a canvas block may be: a dot or a straight line still gets a
 * box wide and tall enough to hold, move and pinch.
 */
export function strokesBox(strokes: readonly Stroke[]): DrawingBox {
  let [left, top, right, bottom] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const { points, tool } of strokes) {
    const pad = TOOL_STYLE[tool].width;
    for (let i = 0; i < points.length; i += 2) {
      left = Math.min(left, points[i] - pad); right = Math.max(right, points[i] + pad);
      top = Math.min(top, points[i + 1] - pad); bottom = Math.max(bottom, points[i + 1] + pad);
    }
  }
  const width = Math.min(1, Math.max(MIN_BOX_WIDTH, right - left, (bottom - top) / (MAX_FLATNESS * 4)));
  const x = Math.max(0, Math.min(1 - width, (left + right - width) / 2));
  const height = Math.max(bottom - top, width / MAX_FLATNESS);
  return { x, y: Math.max(0, (top + bottom - height) / 2), width, height };
}

/** Removes the strokes under the eraser from one drawing shown at `frame` (in page widths). */
export function eraseFromDrawing(drawing: Drawing, frame: { x: number; y: number; width: number }, x: number, y: number, radius: number): Stroke[] {
  const box = drawingViewBox(drawing);
  const scale = box.width / frame.width;
  return eraseAt(drawing.strokes, box.x + (x - frame.x) * scale, box.y + (y - frame.y) * scale, radius * scale);
}
