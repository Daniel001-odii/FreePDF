import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { DrawerMenu } from '@/components/DrawerMenu';
import { useOTAUpdates } from '@/hooks/useOTAUpdates';
import { useFilesStore } from '@/src/stores/filesStore';
import { useOperationStore } from '@/src/stores/operationStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../global.css';

export {
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    RocaTwoBold: require('../assets/fonts/RocaTwoBold.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const loadSettings = useSettingsStore((s) => s.load);
  const loadFiles = useFilesStore((s) => s.loadAll);
  const loadOps = useOperationStore((s) => s.loadHistory);

  useOTAUpdates();

  useEffect(() => {
    loadSettings();
    loadFiles();
    loadOps();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="settings/scan" />
        <Stack.Screen name="about" />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="file-viewer/pages" />
        <Stack.Screen name="file-viewer/reduce-size" />
      </Stack>
      <DrawerMenu />
    </GestureHandlerRootView>
  );
}
