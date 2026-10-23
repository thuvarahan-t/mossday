import * as Sharing from 'expo-sharing';
import { createContext, useCallback, useContext, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useToast } from '@/components/ui/Toast';
import { ShareCard, SHARE_CARD_WIDTH, type ShareCardContent } from './ShareCard';

type ShareImage = (content: ShareCardContent) => Promise<void>;
const ShareImageContext = createContext<ShareImage | null>(null);

/**
 * Renders a requested share card off screen, captures it as a PNG and opens the system
 * share sheet. One host for the whole app keeps the card out of every screen's layout.
 */
export function ShareImageProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const card = useRef<ComponentRef<typeof View>>(null);
  const [request, setRequest] = useState<{ content: ShareCardContent; done: () => void } | null>(null);

  const share = useCallback<ShareImage>((content) => new Promise((done) => setRequest({ content, done })), []);

  const capture = async () => {
    if (!request) return;
    try {
      // Two frames let text and SVG (heatmaps, bars) paint before the snapshot.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const uri = await captureRef(card, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: `Share ${request.content.title}` });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : 'Could not share this page.' });
    } finally {
      request.done();
      setRequest(null);
    }
  };

  return (
    <ShareImageContext.Provider value={share}>
      {children}
      {request && (
        <View pointerEvents="none" style={styles.offscreen} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View ref={card} collapsable={false} onLayout={() => { void capture(); }}>
            <ShareCard {...request.content} />
          </View>
        </View>
      )}
    </ShareImageContext.Provider>
  );
}

export function useShareImage(): ShareImage {
  const share = useContext(ShareImageContext);
  if (!share) throw new Error('useShareImage requires a ShareImageProvider.');
  return share;
}

// Laid out beside the screen: measured and drawn for the capture, never seen.
const styles = StyleSheet.create({ offscreen: { position: 'absolute', top: 0, left: -SHARE_CARD_WIDTH * 2 } });
