import { accents } from '@/constants/colors';
import { formatDuration } from '@/lib/date';
import { mediaFile } from '@/lib/media';
import { readingOrder } from '@/lib/noteCanvas';
import { checklistItems, type NoteBlock } from '@/lib/repos/notes';
import { escapeHtml } from '@/lib/shareFiles';
import { drawingViewBox, parseDrawing, strokePath, TOOL_STYLE, type Drawing, type InkColor } from './drawing';

/** The page is white, so ink that follows the theme's text colour is always dark here. */
const inkColor = (color: InkColor) => color === 'ink' ? '#000000' : accents.light[color];

function drawingSvg(drawing: Drawing) {
  const box = drawingViewBox(drawing);
  const paths = drawing.strokes.map((stroke) => `<path d="${strokePath(stroke.points)}" stroke="${inkColor(stroke.color)}" stroke-opacity="${TOOL_STYLE[stroke.tool].opacity}" ` +
    `stroke-width="${TOOL_STYLE[stroke.tool].width}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`).join('');
  return `<svg width="100%" viewBox="${box.x} ${box.y} ${box.width} ${box.height}" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`;
}

async function blockHtml(block: NoteBlock) {
  switch (block.type) {
    case 'TEXT': return block.content?.trim() ? `<p>${escapeHtml(block.content)}</p>` : '';
    case 'CHECKLIST': return `<ul>${checklistItems(block.content).map((item) => `<li class="${item.done ? 'done' : ''}">${item.done ? '☑' : '☐'} ${escapeHtml(item.text)}</li>`).join('')}</ul>`;
    // WebViews cannot read the app's files, so photos are inlined (Expo's documented approach).
    case 'IMAGE': return block.filePath ? `<img src="data:image/jpeg;base64,${await mediaFile(block.filePath).base64()}"/>` : '';
    case 'DRAWING': return drawingSvg(parseDrawing(block.content));
    case 'VOICE': return `<p class="voice">Voice note · ${escapeHtml(formatDuration(block.durationMs ?? 0))}</p>`;
  }
}

/** A note as a printable page, top to bottom in the order it reads on screen. */
export async function notePdfHtml(title: string, blocks: readonly NoteBlock[]) {
  const body = await Promise.all(readingOrder(blocks).map(blockHtml));
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    @page{margin:48px}
    body{font-family:-apple-system,Roboto,sans-serif;font-size:14px;line-height:1.5;color:#000}
    h1{font-size:24px;margin:0 0 16px}
    p{margin:0 0 12px;white-space:pre-wrap}
    ul{list-style:none;margin:0 0 12px;padding:0}
    li.done{color:#8E8E93;text-decoration:line-through}
    img,svg{display:block;max-width:100%;margin:0 0 12px;page-break-inside:avoid}
    .voice{color:#8E8E93}
  </style></head><body>${title.trim() ? `<h1>${escapeHtml(title)}</h1>` : ''}${body.join('')}</body></html>`;
}
