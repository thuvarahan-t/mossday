import type { AccentName } from '@/constants/colors';

export type TextFormat = { bold?: boolean; underline?: boolean; strike?: boolean; color?: AccentName; highlight?: AccentName };
export type FormatToggle = 'bold' | 'underline' | 'strike';
export type FormatColor = 'color' | 'highlight';
/** Formatting over `start`–`end` of a text block. Stored spans are sorted and never overlap. */
export type TextSpan = TextFormat & { start: number; end: number };

const KEYS = ['bold', 'underline', 'strike', 'color', 'highlight'] as const;
const formatOf = ({ start: _start, end: _end, ...format }: TextSpan): TextFormat => format;
const hasFormat = (span: TextSpan) => KEYS.some((key) => span[key]);
const sameFormat = (a: TextSpan, b: TextSpan) => KEYS.every((key) => a[key] === b[key]);

export function parseSpans(raw: string | null | undefined): TextSpan[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((span): span is TextSpan => typeof span === 'object' && span !== null &&
      Number.isInteger(span.start) && Number.isInteger(span.end) && span.start >= 0 && span.start < span.end);
  } catch { return []; }
}
export const serializeSpans = (spans: readonly TextSpan[]) => spans.length ? JSON.stringify(spans) : null;

/** Applies `change` to every character of the range, keeping spans sorted, separate and minimal. */
function formatRange(spans: readonly TextSpan[], start: number, end: number, change: (format: TextFormat) => TextFormat): TextSpan[] {
  const cut: TextSpan[] = [];
  let position = start;
  for (const span of spans) {
    if (span.end <= start || span.start >= end) { cut.push(span); continue; }
    if (span.start < start) cut.push({ ...span, end: start });
    const from = Math.max(span.start, start);
    if (from > position) cut.push({ start: position, end: from, ...change({}) });
    const to = Math.min(span.end, end);
    cut.push({ ...formatOf(span), ...change(formatOf(span)), start: from, end: to });
    position = to;
    if (span.end > end) cut.push({ ...span, start: end });
  }
  if (position < end) cut.push({ start: position, end, ...change({}) });
  const merged: TextSpan[] = [];
  for (const span of cut.filter(hasFormat).sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1);
    if (last && last.end === span.start && sameFormat(last, span)) last.end = span.end;
    else merged.push({ ...span });
  }
  return merged;
}

/** Whether every character of the range already has this format. */
export function rangeHas(spans: readonly TextSpan[], start: number, end: number, key: FormatToggle) {
  let covered = start;
  for (const span of spans) {
    if (span.end <= covered || span.start >= end) continue;
    if (span.start > covered || !span[key]) return false;
    covered = span.end;
  }
  return covered >= end;
}

/** Like a Bold button: turns it on for the whole range, or off if it is all on already. */
export function toggleFormat(spans: readonly TextSpan[], start: number, end: number, key: FormatToggle) {
  const on = !rangeHas(spans, start, end, key);
  return formatRange(spans, start, end, (format) => ({ ...format, [key]: on ? true : undefined }));
}

export function setFormatColor(spans: readonly TextSpan[], start: number, end: number, key: FormatColor, value: AccentName | null) {
  return formatRange(spans, start, end, (format) => ({ ...format, [key]: value ?? undefined }));
}

/**
 * Keeps formatting on the same words after the text changed by one edit. Text typed inside a
 * span joins it; text typed right after one does not, so it never spreads by itself.
 */
export function adjustSpans(spans: readonly TextSpan[], before: string, after: string): TextSpan[] {
  if (before === after || !spans.length) return [...spans];
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < before.length - prefix && suffix < after.length - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix += 1;
  const removedEnd = before.length - suffix;
  const growth = after.length - before.length;
  const move = (position: number, atEdge: number) => position <= prefix ? position : position >= removedEnd ? position + growth : atEdge;
  return spans.flatMap((span) => {
    // A span that began in replaced text now begins just after what replaced it.
    const start = move(span.start, removedEnd + growth);
    const end = move(span.end, prefix);
    return start < end ? [{ ...span, start, end }] : [];
  });
}

/** The text cut into runs of one format each, unformatted runs included, ready to draw. */
export function textSegments(text: string, spans: readonly TextSpan[]): { text: string; format: TextFormat }[] {
  const segments: { text: string; format: TextFormat }[] = [];
  let position = 0;
  for (const span of spans) {
    const start = Math.min(span.start, text.length);
    const end = Math.min(span.end, text.length);
    if (start >= end || start < position) continue;
    if (start > position) segments.push({ text: text.slice(position, start), format: {} });
    segments.push({ text: text.slice(start, end), format: formatOf(span) });
    position = end;
  }
  if (position < text.length) segments.push({ text: text.slice(position), format: {} });
  return segments;
}
