// ============================================================
// Settings Store – User preferences persisted in SQLite
// ============================================================

import {
    getUserSettings,
    updateUserSettings,
} from '@/src/db/repository';
import type { ThemeMode, UserSettings } from '@/src/types';
import { create } from 'zustand';

interface SettingsState extends UserSettings {
  isLoaded: boolean;
  isHydrated: boolean;
  /** One-time load from DB */
  load: () => Promise<void>;
  /** Set theme (light, dark, system) */
  setTheme: (theme: ThemeMode) => Promise<void>;
  /** Update compression quality */
  setCompressionQuality: (q: number) => Promise<void>;
  /** Toggle auto-save results */
  setAutoSaveResults: (v: boolean) => Promise<void>;
  /** Toggle premium badges */
  setShowPremiumBadges: (v: boolean) => Promise<void>;
  /** Set language */
  setLanguage: (lang: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // defaults used until DB load completes
  theme: 'system',
  defaultCompressionQuality: 80,
  autoSaveResults: true,
  showPremiumBadges: true,
  language: 'en',
  isLoaded: false,
  isHydrated: false,

  load: async () => {
    try {
      const s = await getUserSettings();
      set({
        theme: s.theme,
        defaultCompressionQuality: s.defaultCompressionQuality,
        autoSaveResults: s.autoSaveResults,
        showPremiumBadges: s.showPremiumBadges,
        language: s.language,
        isLoaded: true,
        isHydrated: true,
      });
    } catch {
      // Keep defaults on error
      set({ isLoaded: true, isHydrated: true });
    }
  },

  setTheme: async (theme) => {
    set({ theme });
    await updateUserSettings({ theme });
  },

  setCompressionQuality: async (q) => {
    set({ defaultCompressionQuality: q });
    await updateUserSettings({ defaultCompressionQuality: q });
  },

  setAutoSaveResults: async (v) => {
    set({ autoSaveResults: v });
    await updateUserSettings({ autoSaveResults: v });
  },

  setShowPremiumBadges: async (v) => {
    set({ showPremiumBadges: v });
    await updateUserSettings({ showPremiumBadges: v });
  },

  setLanguage: async (lang) => {
    set({ language: lang });
    await updateUserSettings({ language: lang });
  },
}));