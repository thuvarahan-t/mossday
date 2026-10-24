import type { AccentName } from '@/constants/colors';

/** `ink` follows the theme's text colour, so drawings stay visible in dark mode. */
export type InkColor = 'ink' | AccentName;
export type DrawingTool = 'pen' | 'marker' | 'highlighter';
/** `points` is a flat x,y list in canvas-width units: x runs 0–1 and y 0–`aspect`. */
export type Stroke = { tool: DrawingTool; color: InkColor; points: number[] };
/** A drawing block's content: the canvas shape (height ÷ width) and its strokes, oldest first. */
export type Drawing = { aspect: number; strokes: Stroke[] };

/** Line width and opacity per tool, like Samsung Notes' pen, marker and highlighter. */
export const TOOL_STYLE: Record<DrawingTool, { width: number; opacity: number }> = {
  pen: { width: 0.008, opacity: 1 }, marker: { width: 0.02, opacity: 1 }, highlighter: { width: 0.05, opacity: 0.35 },
};
export const INK_COLORS: readonly InkColor[] = ['ink', 'red', 'orange', 'yellow', 'green', 'blue', 'purple'];
const TOOLS = Object.keys(TOOL_STYLE);
const PRECISION = 10_000;

export function parseDrawing(content: string | null): Drawing {
  try {
    const value: unknown = JSON.parse(content ?? 'null');
    if (typeof value !== 'object' || value === null) return { aspect: 1, strokes: [] };
    const { aspect, strokes } = value as Partial<Drawing>;
    return {
      aspect: typeof aspect === 'number' && aspect > 0 ? aspect : 1,
      strokes: Array.isArray(strokes) ? strokes.filter((stroke): stroke is Stroke => typeof stroke === 'object' && stroke !== null &&
        TOOLS.includes(stroke.tool) && typeof stroke.color === 'string' && Array.isArray(stroke.points) &&
        stroke.points.length >= 2 && stroke.points.every((n) => typeof n === 'number' && Number.isFinite(n))) : [],
    };
  } catch { return { aspect: 1, strokes: [] }; }
}
export function serializeDrawing(drawing: Drawing) {
  const round = (n: number) => Math.round(n * PRECISION) / PRECISION;
  return JSON.stringify({ aspect: round(drawing.aspect), strokes: drawing.strokes.map((stroke) => ({ ...stroke, points: stroke.points.map(round) })) });
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
export function drawingFrame(drawing: Drawing, min = 0.35, max = 1.25) {
  const ys = drawing.strokes.flatMap((stroke) => stroke.points.filter((_, i) => i % 2 === 1));
  if (!ys.length) return { y: 0, height: min };
  const pad = 0.05;
  const top = Math.max(0, Math.min(...ys) - pad);
  const bottom = Math.min(Math.max(drawing.aspect, ...ys), Math.max(...ys) + pad);
  const height = Math.max(min, Math.min(max, bottom - top));
  return { y: Math.max(0, top - Math.max(0, height - (bottom - top)) / 2), height };
}
