import * as Sharing from 'expo-sharing';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { FormSheet } from '@/components/ui/FormSheet';
import { GroupedList, ListRow } from '@/components/ui/GroupedList';
import { useToast } from '@/components/ui/Toast';
import { useSheetState } from '@/hooks/useSheetState';
import { cardPdfHtml, shareAudioFiles, sharePdf } from '@/lib/shareFiles';
import { ShareCard, SHARE_CARD_WIDTH, type ShareCardContent, type ShareContent } from './ShareCard';

type ShareFormat = 'pdf' | 'text' | 'image' | 'audio';
type Captured = { result: string; height: number };
type CaptureRequest = { content: ShareCardContent; result: 'tmpfile' | 'base64'; done: (captured: Captured) => void; fail: (error: unknown) => void };
type ShareActions = { shareImage: (content: ShareCardContent) => void; shareWithOptions: (content: ShareContent) => void };

const ShareContext = createContext<ShareActions | null>(null);

/**
 * Sharing for the whole app. Tabs share their page as an image straight away; notes first ask
 * for PDF, text or an image, plus audio when they have recordings. Cards are rendered off screen
 * and captured, so no screen has to keep one in its layout.
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

  const reportFailure = (error: unknown) => toast({ message: error instanceof Error ? error.message : 'Could not share this.' });

  const sendImage = async (shared: ShareCardContent) => {
    if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
    const { result } = await capture(shared, 'tmpfile');
    await Sharing.shareAsync(result, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: `Share ${shared.title}` });
  };

  const deliver = async (format: ShareFormat, shared: ShareContent) => {
    try {
      if (format === 'image') { await sendImage(shared); return; }
      if (format === 'text') { await Share.share({ message: shared.text }); return; }
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
      if (format === 'audio') { await shareAudioFiles(shared.audio ?? [], shared.title); return; }
      if (shared.pdfHtml) { await sharePdf(await shared.pdfHtml(), shared.title); return; }
      const { result, height } = await capture(shared, 'base64');
      // Android reads page sizes as whole numbers.
      await sharePdf(cardPdfHtml(result), shared.title, { width: SHARE_CARD_WIDTH, height: Math.ceil(height) });
    } catch (error) {
      reportFailure(error);
    }
  };

  // A share sheet opened while this sheet's window is closing fails on iOS, so it waits for the end.
  const choose = (format: ShareFormat) => {
    if (content) chosen.current = { format, content };
    setContent(null);
  };
  const audioCount = content?.audio?.length ?? 0;
  // `sendImage` only uses setters and refs, so the first one stays valid for the app's lifetime.
  const firstSendImage = useRef(sendImage);
  const firstReportFailure = useRef(reportFailure);
  const openOptions = useCallback((shared: ShareContent) => { setContent(shared); }, [setContent]);
  const openImage = useCallback((shared: ShareCardContent) => { void firstSendImage.current(shared).catch(firstReportFailure.current); }, []);
  const actions = useMemo<ShareActions>(() => ({ shareImage: openImage, shareWithOptions: openOptions }), [openImage, openOptions]);

  return (
    <ShareContext.Provider value={actions}>
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

function useShareActions() {
  const actions = useContext(ShareContext);
  if (!actions) throw new Error('Sharing requires a ShareProvider.');
  return actions;
}
/** Shares a page as an image, with no questions. */
export const useShareImage = () => useShareActions().shareImage;
/** Asks how to share first: PDF, text, image, and audio when there is any. */
export const useShareWithOptions = () => useShareActions().shareWithOptions;

// Laid out beside the screen: measured and drawn for the capture, never seen.
const styles = StyleSheet.create({ offscreen: { position: 'absolute', top: 0, left: -SHARE_CARD_WIDTH * 2 } });
