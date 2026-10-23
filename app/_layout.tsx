import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack, TransitionPresets } from 'expo-router/js-stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { ToastProvider } from '@/components/ui/Toast';
import { BlurTargetContent, BlurTargetProvider } from '@/components/ui/glass/BlurTarget';
import { AppSheetCover } from '@/components/ui/sheet/SheetCover';
import { useTheme } from '@/hooks/useTheme';
import { getDatabase } from '@/lib/db';
import { collectMedia } from '@/lib/media';

export default function RootLayout() {
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
  });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getDatabase().then(() => collectMedia()).then(
      () => { if (active) setReady(true); },
      (failure: unknown) => { if (active) setError(failure); },
    );
    return () => { active = false; };
  }, [attempt]);

  const baseTheme = theme.isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: theme.colors.accent, background: theme.colors.groupedBackground,
      card: theme.colors.card, text: theme.colors.label,
      border: theme.colors.separator, notification: theme.colors.danger,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.groupedBackground }}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        {error || fontError ? (
          <View style={[styles.center, { padding: theme.spacing.xxl, gap: theme.spacing.lg }]}>
            <Text accessibilityRole="alert" align="center">
              {fontError ? 'Mossday could not load its fonts. Please reopen the app.' : 'Mossday could not open its local database.'}
            </Text>
            {!fontError && (
              <PressableScale
                onPress={() => { setError(null); setAttempt((value) => value + 1); }}
                style={{ padding: theme.spacing.md, minHeight: theme.sizes.touchTarget }}>
                <Text color="accent" variant="headline">Try again</Text>
              </PressableScale>
            )}
          </View>
        ) : ready && fontsLoaded ? (
          <AppShell />
        ) : (
          <View style={[styles.center, { gap: theme.spacing.md }]}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text color="secondaryLabel">Loading Mossday…</Text>
          </View>
        )}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Everything below the root: the app is the root blur target (so toasts and menus blur it)
 * and recedes while a large sheet is open. Pushed screens use the iOS card transition with
 * the left-edge swipe-back gesture on both platforms (JS stack, not Android's native one).
 */
function AppShell() {
  const theme = useTheme();
  return (
    <AppSheetCover>
      <BlurTargetProvider root>
        <ToastProvider>
          <BlurTargetContent style={styles.fill}>
            <Stack
              screenOptions={{
                headerShown: false,
                ...TransitionPresets.SlideFromRightIOS,
                gestureEnabled: true,
                gestureDirection: 'horizontal',
                cardStyle: { backgroundColor: theme.colors.groupedBackground },
              }}
            >
              <Stack.Screen name="(tabs)" />
            </Stack>
          </BlurTargetContent>
        </ToastProvider>
      </BlurTargetProvider>
    </AppSheetCover>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
