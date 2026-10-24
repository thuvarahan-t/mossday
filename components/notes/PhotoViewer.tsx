import { Image } from 'expo-image';
import { Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { useTheme } from '@/hooks/useTheme';

/** A note photo on black, whole and uncropped; tap × or Back to return. */
export function PhotoViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <Image source={{ uri }} contentFit="contain" transition={150} accessibilityLabel="Photo" style={{ flex: 1 }} />
      <PressableScale haptic="tap" accessibilityLabel="Close photo" onPress={onClose}
        style={{ position: 'absolute', top: insets.top + theme.spacing.lg, left: theme.spacing.lg, width: theme.sizes.circleButton, height: theme.sizes.circleButton,
          borderRadius: theme.radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' }}>
        <Icon name="close" rawColor="#FFFFFF" />
      </PressableScale>
    </View>
  </Modal>;
}
