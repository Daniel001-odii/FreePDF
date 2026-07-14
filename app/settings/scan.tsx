import React from 'react';
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { useColorScheme } from '@/components/useColorScheme';
import {
  useScanSettingsStore,
} from '@/src/stores/scanSettingsStore';

// Custom Arrow Left Icon
export function HugeiconsArrowLeft01({ color }: { color: string }) {
  return (
    <Svg width="28" height="28" viewBox="0 0 24 24">
      <Path
        fill="none"
        stroke={color || "#fff"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M15 6s-6 4.419-6 6s6 6 6 6"
      />
    </Svg>
  );
}

export default function ScanSettingsScreen() {
  const router = useRouter();

  // Load from store
  const scanResolution = useScanSettingsStore((s) => s.scanResolution);
  const setScanResolution = useScanSettingsStore((s) => s.setScanResolution);

  const scanColorMode = useScanSettingsStore((s) => s.scanColorMode);
  const setScanColorMode = useScanSettingsStore((s) => s.setScanColorMode);

  const autoBorderDetection = useScanSettingsStore((s) => s.autoBorderDetection);
  const setAutoBorderDetection = useScanSettingsStore((s) => s.setAutoBorderDetection);

  const activeTheme = useColorScheme();
  const isDark = activeTheme === 'dark';
  const textColor = isDark ? '#ffffff' : '#1C1C1E';

  return (
    <SafeAreaView className="flex-1 bg-[#F2F2F7] dark:bg-[#0A0A0A]" edges={['top']}>
      {/* Configure Stack Screen options */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* ===== Header ===== */}
      <View className="flex-row items-center px-4 py-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center mr-2"
        >
          <HugeiconsArrowLeft01 color={textColor} />
        </Pressable>

        <Text
          style={{ fontFamily: 'RocaTwoBold' }}
          className="text-[#1C1C1E] dark:text-white text-2xl font-black"
        >
          Scan Settings
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-sm mb-6 leading-relaxed">
          Configure default behaviors and document optimization options for all scanner tools (Document, Receipt, and ID scanners).
        </Text>

        {/* 1. Resolution Selection */}
        <View className="mb-6">
          <Text className="text-xs font-black uppercase text-[#8E8E93] dark:text-[#9C9CA3] tracking-wider mb-3 px-1">
            Default Scan Resolution
          </Text>
          <View className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5">
            <Text className="text-[#1C1C1E] dark:text-white text-base font-bold">
              Resolution Quality
            </Text>
            <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-xs mt-1 mb-4 leading-relaxed">
              Higher resolutions create crisper PDFs but result in larger file sizes.
            </Text>
            <View className="flex-row gap-2.5">
              {(['low', 'medium', 'high'] as const).map((res) => (
                <PressableButton
                  key={res}
                  label={res.toUpperCase()}
                  active={scanResolution === res}
                  onPress={() => setScanResolution(res)}
                />
              ))}
            </View>
          </View>
        </View>

        {/* 2. Color Mode Selection */}
        <View className="mb-6">
          <Text className="text-xs font-black uppercase text-[#8E8E93] dark:text-[#9C9CA3] tracking-wider mb-3 px-1">
            Default Color Mode
          </Text>
          <View className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5">
            <Text className="text-[#1C1C1E] dark:text-white text-base font-bold">
              Color Filter
            </Text>
            <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-xs mt-1 mb-4 leading-relaxed">
              Select the default filter applied to your scanned images.
            </Text>
            <View className="flex-row gap-2.5">
              {(['color', 'grayscale', 'black_white'] as const).map((mode) => (
                <PressableButton
                  key={mode}
                  label={mode === 'black_white' ? 'B&W' : mode.toUpperCase()}
                  active={scanColorMode === mode}
                  onPress={() => setScanColorMode(mode)}
                />
              ))}
            </View>
          </View>
        </View>

        {/* 3. Auto border detection */}
        <View className="mb-6">
          <Text className="text-xs font-black uppercase text-[#8E8E93] dark:text-[#9C9CA3] tracking-wider mb-3 px-1">
            Edge Detection
          </Text>
          <View className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden">
            <View className="flex-row items-center justify-between px-5 py-4">
              <View className="flex-1 mr-4">
                <Text className="text-base font-bold text-[#1C1C1E] dark:text-white">
                  Auto-Border Detection
                </Text>
                <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-xs mt-0.5 leading-relaxed">
                  Automatically trace and crop document borders using the camera scanner.
                </Text>
              </View>
              <Switch
                value={autoBorderDetection}
                onValueChange={setAutoBorderDetection}
                trackColor={{ false: isDark ? '#3A3A3C' : '#E5E5EA', true: '#FF3B30' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Selector buttons
function PressableButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 py-3.5 rounded-xl items-center justify-center border ${
        active
          ? 'bg-[#FF3B30] border-[#FF3B30]'
          : 'bg-[#F2F2F7] dark:bg-[#0A0A0A] border-[#E5E5EA] dark:border-[#2C2C2E] active:bg-[#E5E5EA] dark:active:bg-[#161618]'
      }`}
    >
      <Text
        className={`font-extrabold text-sm ${
          active ? 'text-white' : 'text-[#8E8E93] dark:text-[#9C9CA3]'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
