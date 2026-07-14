import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import { Stack, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import Svg, { Path } from 'react-native-svg';
import PdfThumbnail from 'react-native-pdf-thumbnail';

import { compressPDF } from '@/src/services/pdfService';
import { useFilesStore } from '@/src/stores/filesStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import type { DeviceFile } from '@/src/types';
import { usePostHog } from 'posthog-react-native';

// Custom Arrow Left Icon
function HugeiconsArrowLeft01({ color }: { color?: string }) {
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

// Custom Upload/Compress Icon
function CompressIcon() {
  return (
    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 14H20M12 20V4M12 4L8 8M12 4L16 8"
        stroke="#FF3B30"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function CompressPDFScreen() {
  const activeTheme = useColorScheme();
  const isDark = activeTheme === 'dark';
  const textColor = isDark ? '#ffffff' : '#1C1C1E';

  const router = useRouter();
  const posthog = usePostHog();
  const [file, setFile] = useState<{ name: string; uri: string; size?: number } | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [outputUri, setOutputUri] = useState<string | null>(null);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled && result.assets?.[0]) {
      setFile({
        name: result.assets[0].name,
        uri: result.assets[0].uri,
        size: result.assets[0].size,
      });
      setOutputUri(null);
      setThumbnailUri(null);
      try {
        const thumb = await PdfThumbnail.generate(result.assets[0].uri, 1);
        if (thumb?.uri) {
          setThumbnailUri(thumb.uri);
        }
      } catch (err) {
        console.warn('Failed to generate thumbnail', err);
      }
    }
  };

  const handleCompress = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const uri = await compressPDF(file.uri);
      setOutputUri(uri);
      const compressedInfo = await FileSystem.getInfoAsync(uri);
      posthog.capture('pdf_compressed', {
        original_size: file.size ?? 0,
        compressed_size: (compressedInfo as any).size ?? 0,
      });

      // Auto-save results to files list
      const autoSave = useSettingsStore.getState().autoSaveResults;
      if (autoSave) {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        const size = (fileInfo as any).size || 0;
        const now = new Date().toISOString();
        const baseName = file.name.replace(/\.pdf$/i, '');
        const newFile: DeviceFile = {
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          uri,
          name: `${baseName}_compressed.pdf`,
          size,
          fileType: 'pdf',
          createdAt: now,
          modifiedAt: now,
          isFavorite: false,
        };
        await useFilesStore.getState().addFile(newFile);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Compression failed');
    } finally {
      setProcessing(false);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]" edges={['top']}>
      {/* Hide Expo default router header */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* ===== Header ===== */}
      <View className="flex-row items-center px-4 py-4 border-b border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#0A0A0A]">
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
          Compress PDF
        </Text>
      </View>

      {!file ? (
        <Pressable
          onPress={pickFile}
          className="flex-1 items-center justify-center p-6 active:opacity-80"
        >
          <Image
            source={require('@/assets/images/add-file.png')}
            style={{ width: 40, height: 40 }}
          />
          <Text className="text-[#1C1C1E] dark:text-white text-base font-extrabold mt-4 mb-2 text-center">
            Select PDF File
          </Text>
          <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-xs font-semibold text-center max-w-[260px] leading-relaxed">
            Tap anywhere to import a PDF document from your device
          </Text>
        </Pressable>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-sm mb-6 leading-relaxed">
            Reduce PDF file size by stripping metadata and optimizing document layouts, while maintaining standard text and image visual clarity.
          </Text>

          {/* Selected State (Borderless with Thumbnail) */}
          <View className="mb-6">
            <View className="flex-row items-center mb-5" style={{ gap: 12 }}>
              <View
                className="rounded-lg overflow-hidden items-center justify-center bg-white dark:bg-[#1c1c1e] border border-[#E5E5EA] dark:border-[#2C2C2E]"
                style={{ width: 44, height: 56 }}
              >
                {thumbnailUri ? (
                  <Image
                    source={{ uri: thumbnailUri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                ) : (
                  <ActivityIndicator size="small" color="#FF3B30" />
                )}
              </View>

              <View className="flex-1" style={{ gap: 2 }}>
                <Text className="text-sm font-black text-[#1C1C1E] dark:text-white" numberOfLines={1}>
                  {file.name}
                </Text>
                <Text className="text-[11px] font-bold text-[#8E8E93] dark:text-[#9C9CA3]">
                  {formatSize(file.size)} · PDF
                </Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              <Pressable
                onPress={pickFile}
                className="flex-1 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] py-3.5 rounded-xl items-center active:bg-[#E5E5EA] dark:bg-[#2C2C2E]"
              >
                <Text className="text-[#1C1C1E] dark:text-white font-bold text-sm">
                  Change File
                </Text>
              </Pressable>

              <Pressable
                onPress={handleCompress}
                disabled={processing}
                className="flex-[2] bg-[#FF3B30] py-3.5 rounded-xl items-center justify-center active:opacity-90"
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-bold text-sm">
                    Compress Now
                  </Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Results Info */}
          {outputUri && (
            <View className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-5 mt-4">
              <View className="flex-row items-center mb-4">
                <View className="w-8 h-8 rounded-full bg-green-500/20 items-center justify-center mr-3">
                  <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M5 12L10 17L20 7"
                      stroke="#22C55E"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
                <Text className="text-[#1C1C1E] dark:text-white text-base font-bold">
                  Compression Complete!
                </Text>
              </View>
              <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-xs mb-5 px-1 leading-relaxed">
                Your PDF has been successfully processed and optimized.
              </Text>

              <Pressable
                onPress={() => Sharing.shareAsync(outputUri)}
                className="w-full bg-[#FF3B30] py-4 rounded-xl items-center justify-center active:opacity-90"
              >
                <Text className="text-white font-extrabold text-base">
                  Share Compressed PDF
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}