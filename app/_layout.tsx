import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '@/hooks/useTheme';
import { getDatabase } from '@/lib/db';

export default function RootLayout() {
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getDatabase().then(
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
      primary: theme.colors.accent, background: theme.colors.background,
      card: theme.colors.card, text: theme.colors.text,
      border: theme.colors.border, notification: theme.colors.danger,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        {error || fontError ? (
          <View style={[styles.center, { padding: theme.spacing.md }]}>
            <Text accessibilityRole="alert" style={{ color: theme.colors.text, fontSize: theme.typography.body }}>
              {fontError ? 'Mossday could not load its icons. Please reopen the app.' : 'Mossday could not open its local database.'}
            </Text>
            {!fontError && (
              <Pressable accessibilityRole="button"
                onPress={() => { setError(null); setAttempt((value) => value + 1); }}
                style={{ padding: theme.spacing.sm, minHeight: theme.spacing.xxl }}>
                <Text style={{ color: theme.colors.text, fontSize: theme.typography.body }}>Try again</Text>
              </Pressable>
            )}
          </View>
        ) : ready && fontsLoaded ? (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        ) : (
          <View style={[styles.center, { gap: theme.spacing.sm }]}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.body }}>
              Loading Mossday…
            </Text>
          </View>
        )}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
