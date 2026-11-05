import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { zipSync } from 'fflate';
import { mediaFile } from './media';

/** A readable file name for the share sheet, safe on every platform. */
export function shareFileName(title: string, extension: string) {
  const name = title.replace(/[^\p{L}\p{M}\p{N} _-]+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  return `${name || 'Mossday'}.${extension}`;
}

export const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A page exactly the size of a captured share card, so it has no margins or page breaks. */
export function cardPdfHtml(base64Png: string) {
  return `<!DOCTYPE html><html><head><style>@page{margin:0}html,body{margin:0;padding:0}img{display:block;width:100%}</style></head>` +
    `<body><img src="data:image/png;base64,${base64Png}"/></body></html>`;
}

/** Replaces any earlier file of that name, shares it, and leaves nothing behind in the cache. */
async function shareTemporary(file: File, options: Sharing.SharingOptions) {
  try {
    await Sharing.shareAsync(file.uri, options);
  } finally {
    if (file.exists) file.delete();
  }
}

function cacheFile(name: string) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  return file;
}

export async function sharePdf(html: string, title: string, size?: { width: number; height: number }) {
  const { uri } = await Print.printToFileAsync({ html, ...size });
  const output = cacheFile(shareFileName(title, 'pdf'));
  new File(uri).move(output);
  await shareTemporary(output, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Share ${title}` });
}

/**
 * One recording goes as itself. The system share sheet takes one file at a time, so several
 * go together in a ZIP rather than asking the user to share each one separately.
 */
export async function shareAudioFiles(paths: readonly string[], title: string) {
  if (!paths.length) throw new Error('There is no audio to share.');
  if (paths.length === 1) {
    const output = cacheFile(shareFileName(title, 'm4a'));
    mediaFile(paths[0]).copy(output);
    await shareTemporary(output, { mimeType: 'audio/mp4', UTI: 'public.mpeg-4-audio', dialogTitle: `Share ${title}` });
    return;
  }
  const archive: Record<string, Uint8Array> = {};
  for (const [index, path] of paths.entries()) archive[`Audio ${index + 1}.m4a`] = await mediaFile(path).bytes();
  const output = cacheFile(shareFileName(`${title} audio`, 'zip'));
  // Audio is already compressed, so zipping it again would only cost time.
  await output.write(zipSync(archive, { level: 0 }));
  await shareTemporary(output, { mimeType: 'application/zip', dialogTitle: `Share ${title} audio` });
}
