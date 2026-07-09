import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ScanResolution = 'low' | 'medium' | 'high';
export type ScanColorMode = 'color' | 'grayscale' | 'black_white';

export interface ScanSettingsState {
  scanResolution: ScanResolution;
  scanColorMode: ScanColorMode;
  autoBorderDetection: boolean;

  setScanResolution: (res: ScanResolution) => void;
  setScanColorMode: (mode: ScanColorMode) => void;
  setAutoBorderDetection: (v: boolean) => void;
}

export const useScanSettingsStore = create<ScanSettingsState>()(
  persist(
    (set) => ({
      scanResolution: 'medium',
      scanColorMode: 'color',
      autoBorderDetection: true,

      setScanResolution: (scanResolution) => set({ scanResolution }),
      setScanColorMode: (scanColorMode) => set({ scanColorMode }),
      setAutoBorderDetection: (autoBorderDetection) => set({ autoBorderDetection }),
    }),
    {
      name: 'scan-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
