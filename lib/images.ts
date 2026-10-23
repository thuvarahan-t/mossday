import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { importMedia } from './media';

const MAX_PHOTO_EDGE = 1600;

/** Bound note photos in either orientation and promptly release native image buffers. */
export async function importNotePhoto(asset: { uri: string; width: number; height: number }): Promise<string> {
  const context = ImageManipulator.manipulate(asset.uri);
  try {
    if (Math.max(asset.width, asset.height) > MAX_PHOTO_EDGE) {
      context.resize(asset.width >= asset.height ? { width: MAX_PHOTO_EDGE } : { height: MAX_PHOTO_EDGE });
    }
    const rendered = await context.renderAsync();
    try {
      const compressed = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
      return importMedia(compressed.uri, 'jpg');
    } finally { rendered.release(); }
  } finally { context.release(); }
}
