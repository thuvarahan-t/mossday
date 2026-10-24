import { checklistItems, type ChecklistItem, type NoteBlock } from '@/lib/repos/notes';

export type ListKind = 'bullet' | 'number';
const BULLET = /^(\s*)• (.*)$/;
const NUMBER = /^(\s*)(\d+)\. (.*)$/;

/**
 * Samsung Notes style list typing, run on every edit of a text block: a new line after a
 * "• " or "1. " item starts the next item ("• " or "2. "), and Return on an empty item ends
 * the list by removing its marker. Any other edit comes back unchanged.
 */
export function continueList(before: string, after: string): string {
  if (after.length !== before.length + 1) return after;
  let at = 0;
  while (at < before.length && before[at] === after[at]) at += 1;
  if (after[at] !== '\n') return after;
  // A break typed at the end of an item, before the next line, first differs one character
  // late; within a pair of line breaks, the item above is the one that was being typed.
  if (at > 0 && after[at - 1] === '\n' && after[at - 2] !== '\n') at -= 1;
  const lineStart = after.lastIndexOf('\n', at - 1) + 1;
  const line = after.slice(lineStart, at);
  const bullet = BULLET.exec(line);
  const number = NUMBER.exec(line);
  if (!bullet && !number) return after;
  const indent = bullet ? bullet[1] : number![1];
  const body = bullet ? bullet[2] : number![3];
  if (!body.trim()) return after.slice(0, lineStart) + after.slice(at + 1);
  const marker = bullet ? `${indent}• ` : `${indent}${Number(number![2]) + 1}. `;
  return after.slice(0, at + 1) + marker + after.slice(at + 1);
}

/**
 * The format bar's list buttons: the lines the selection touches become a bulleted or
 * numbered list, or, when they already all are one, plain lines again.
 */
export function toggleList(text: string, selection: { start: number; end: number }, kind: ListKind): string {
  const first = selection.start === 0 ? 0 : text.lastIndexOf('\n', selection.start - 1) + 1;
  const lastBreak = text.indexOf('\n', selection.end);
  const last = lastBreak === -1 ? text.length : lastBreak;
  const lines = text.slice(first, last).split('\n');
  const pattern = kind === 'bullet' ? BULLET : NUMBER;
  const strip = (line: string) => line.replace(BULLET, '$1$2').replace(NUMBER, '$1$3');
  const listed = lines.every((line) => pattern.test(line));
  const changed = lines.map((line, index) => {
    if (listed) return strip(line);
    const plain = strip(line);
    const indent = /^\s*/.exec(plain)![0];
    return `${indent}${kind === 'bullet' ? '•' : `${index + 1}.`} ${plain.slice(indent.length)}`;
  });
  return text.slice(0, first) + changed.join('\n') + text.slice(last);
}

/** Keep's "Show checkboxes": each non-empty line becomes an item, list markers dropped. */
export function textToChecklist(text: string): ChecklistItem[] {
  const items = text.split('\n').map((line) => line.replace(BULLET, '$2').replace(NUMBER, '$3').trim()).filter(Boolean);
  return (items.length ? items : ['']).map((item) => ({ text: item, done: false }));
}
/** "Hide checkboxes": the items as lines, ticked ones included. */
export function checklistToText(items: ChecklistItem[]): string {
  return items.map((item) => item.text).join('\n');
}

/** Keep shows unticked items first and ticked ones under a fold, each keeping its own order. */
export function checklistOrder(items: ChecklistItem[]) {
  const indexes = items.map((_, index) => index);
  return { open: indexes.filter((index) => !items[index].done), done: indexes.filter((index) => items[index].done) };
}

/** Word and character counts over the heading, text and list items (Samsung's note info). */
export function noteCounts(title: string, blocks: Pick<NoteBlock, 'type' | 'content'>[]) {
  const parts = [title, ...blocks.flatMap((block) => block.type === 'TEXT' ? [block.content ?? '']
    : block.type === 'CHECKLIST' ? checklistItems(block.content).map((item) => item.text) : [])];
  const text = parts.join('\n').replace(/^\s*(•|\d+\.) /gm, '');
  return { words: text.split(/\s+/).filter(Boolean).length, characters: text.replace(/\s/g, '').length };
}
