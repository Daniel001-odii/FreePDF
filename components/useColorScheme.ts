import { useColorScheme as useColorSchemeCore } from 'react-native';
import { useSettingsStore } from '@/src/stores/settingsStore';

export const useColorScheme = () => {
  const systemScheme = useColorSchemeCore();
  const userTheme = useSettingsStore((s) => s.theme);
  
  if (userTheme === 'system') {
    return systemScheme === 'unspecified' || !systemScheme ? 'dark' : systemScheme;
  }
  return userTheme || 'dark';
};

