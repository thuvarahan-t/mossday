import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { BottomSheet } from './sheet/BottomSheet';
import { SheetHeader, SheetIconButton } from './sheet/SheetHeader';

export function FormSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const theme = useTheme();
  return <BottomSheet visible onClose={onClose} background="grouped">
    <SheetHeader title={title} leading={<SheetIconButton icon="close" accessibilityLabel="Close" onPress={onClose} />} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
      {children}
    </ScrollView>
  </BottomSheet>;
}
