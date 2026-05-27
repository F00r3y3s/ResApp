import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/global.css';

import { AppProviders } from '@/providers/app-providers';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AppProviders>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(guest)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(premium)" options={{ headerShown: false }} />
            <Stack.Screen name="(modals)" options={{ presentation: 'modal', headerShown: false }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </AppProviders>
  );
}

