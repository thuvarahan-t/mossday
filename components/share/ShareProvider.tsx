import * as Sharing from 'expo-sharing';
import { createContext, useCallback, useContext, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { FormSheet } from '@/components/ui/FormSheet';
import { GroupedList, ListRow } from '@/components/ui/GroupedList';
import { useToast } from '@/components/ui/Toast';
import { useSheetState } from '@/hooks/useSheetState';
import { cardPdfHtml, shareAudioFiles, sharePdf } from '@/lib/shareFiles';
import { ShareCard, SHARE_CARD_WIDTH, type ShareCardContent, type ShareContent } from './ShareCard';

type ShareFormat = 'pdf' | 'text' | 'image' | 'audio';
type ShareOpen = (content: ShareContent) => void;
type Captured = { result: string; height: number };
type CaptureRequest = { content: ShareCardContent; result: 'tmpfile' | 'base64'; done: (captured: Captured) => void; fail: (error: unknown) => void };

const ShareContext = createContext<ShareOpen | null>(null);

/**
 * The app's one Share action: asks for PDF, text or an image, plus audio when the content has
 * recordings, then opens the system share sheet. Cards are rendered off screen and captured,
 * so no screen has to keep one in its layout.
 */
export function ShareProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const card = useRef<ComponentRef<typeof View>>(null);
  const [capturing, setCapturing] = useState<CaptureRequest | null>(null);
  const [content, setContent, transition] = useSheetState<ShareContent>();
  const chosen = useRef<{ format: ShareFormat; content: ShareContent } | null>(null);

  const capture = (shared: ShareCardContent, result: CaptureRequest['result']) =>
    new Promise<Captured>((done, fail) => setCapturing({ content: shared, result, done, fail }));

  const runCapture = async (request: CaptureRequest, height: number) => {
    try {
      // Two frames let text and SVG (heatmaps, bars) paint before the snapshot; photos need longer.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (request.content.captureDelayMs) await new Promise((resolve) => setTimeout(resolve, request.content.captureDelayMs));
      request.done({ result: await captureRef(card, { format: 'png', quality: 1, result: request.result }), height });
    } catch (error) {
      request.fail(error);
    } finally {
      setCapturing(null);
    }
  };

  const deliver = async (format: ShareFormat, shared: ShareContent) => {
    try {
      if (format === 'text') { await Share.share({ message: shared.text }); return; }
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
      if (format === 'audio') { await shareAudioFiles(shared.audio ?? [], shared.title); return; }
      if (format === 'image') {
        const { result } = await capture(shared, 'tmpfile');
        await Sharing.shareAsync(result, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: `Share ${shared.title}` });
        return;
      }
      if (shared.pdfHtml) { await sharePdf(await shared.pdfHtml(), shared.title); return; }
      const { result, height } = await capture(shared, 'base64');
      await sharePdf(cardPdfHtml(result), shared.title, { width: SHARE_CARD_WIDTH, height });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : 'Could not share this.' });
    }
  };

  // A share sheet opened while this sheet's window is closing fails on iOS, so it waits for the end.
  const choose = (format: ShareFormat) => {
    if (content) chosen.current = { format, content };
    setContent(null);
  };
  const audioCount = content?.audio?.length ?? 0;
  const open = useCallback<ShareOpen>((shared) => { setContent(shared); }, [setContent]);

  return (
    <ShareContext.Provider value={open}>
      {children}
      {content && <FormSheet {...transition} size="fit" title="Share as" onClose={() => setContent(null)} onDismissed={() => {
        transition.onDismissed();
        const pending = chosen.current;
        chosen.current = null;
        if (pending) void deliver(pending.format, pending.content);
      }}>
        <GroupedList style={{ marginHorizontal: 0 }}>
          <ListRow title="PDF" icon={{ icon: 'note', color: 'red' }} onPress={() => choose('pdf')} />
          <ListRow title="Text" icon={{ icon: 'text', color: 'blue' }} onPress={() => choose('text')} />
          <ListRow title="Image" icon={{ icon: 'image', color: 'green' }} onPress={() => choose('image')} />
          {audioCount > 0 && <ListRow title="Audio" subtitle={audioCount === 1 ? '1 recording' : `${audioCount} recordings, as one ZIP file`}
            icon={{ icon: 'mic', color: 'orange' }} onPress={() => choose('audio')} />}
        </GroupedList>
      </FormSheet>}
      {capturing && (
        <View pointerEvents="none" style={styles.offscreen} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View ref={card} collapsable={false} onLayout={(event) => { void runCapture(capturing, event.nativeEvent.layout.height); }}>
            <ShareCard {...capturing.content} />
          </View>
        </View>
      )}
    </ShareContext.Provider>
  );
}

export function useShare(): ShareOpen {
  const share = useContext(ShareContext);
  if (!share) throw new Error('useShare requires a ShareProvider.');
  return share;
}

// Laid out beside the screen: measured and drawn for the capture, never seen.
const styles = StyleSheet.create({ offscreen: { position: 'absolute', top: 0, left: -SHARE_CARD_WIDTH * 2 } });
