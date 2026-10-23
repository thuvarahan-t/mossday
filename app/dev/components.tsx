import { Redirect } from 'expo-router';
import { ComponentGallery } from '@/components/dev/ComponentGallery';
import { LargeTitleScreen } from '@/components/ui/LargeTitleScreen';

/** Hidden design-system gallery (open mossday://dev/components). Development builds only. */
export default function ComponentsDevScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return (
    <LargeTitleScreen title="Components" showBack bottomInset="safeArea">
      <ComponentGallery />
    </LargeTitleScreen>
  );
}
