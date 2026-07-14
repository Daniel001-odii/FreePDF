import { useFonts } from 'expo-font';
import { Stack, usePathname, useGlobalSearchParams } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import { PostHogProvider } from 'posthog-react-native';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';

import { DrawerMenu } from '@/components/DrawerMenu';
import { useOTAUpdates } from '@/hooks/useOTAUpdates';
import { useFilesStore } from '@/src/stores/filesStore';
import { useOperationStore } from '@/src/stores/operationStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { posthog } from '@/src/config/posthog';
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
  const themeSetting = useSettingsStore((s) => s.theme);
  const isLoaded = useSettingsStore((s) => s.isLoaded);
  const { setColorScheme } = useNativeWindColorScheme();

  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const previousPathname = useRef<string | undefined>(undefined);

  useOTAUpdates();

  useEffect(() => {
    loadSettings();
    loadFiles();
    loadOps();
  }, []);

  useEffect(() => {
    if (isLoaded && themeSetting) {
      setColorScheme(themeSetting);
    }
  }, [isLoaded, themeSetting, setColorScheme]);


  useEffect(() => {
    if (previousPathname.current !== pathname) {
      posthog.screen(pathname, {
        previous_screen: previousPathname.current ?? null,
        ...params,
      });
      previousPathname.current = pathname;
    }
  }, [pathname, params]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PostHogProvider
        client={posthog}
        autocapture={{
          captureScreens: false,
          captureTouches: true,
          propsToCapture: ['testID'],
          maxElementsCaptured: 20,
        }}
      >
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
      </PostHogProvider>
    </GestureHandlerRootView>
  );
}
