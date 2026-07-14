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

import { mergePDFs } from '@/src/services/pdfService';
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

// Custom Merge Icon
function MergeIcon() {
  return (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4V20M12 20L8 16M12 20L16 16M4 8H20M20 8L16 4M20 8L16 12"
        stroke={color || "#fff"}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Custom Trash/Delete Icon
function TrashIcon() {
  return (
    <Svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 7L18.1327 19.1422C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1422L5 7M10 11V17M14 11V17M4 7H20M16 7L15.2285 4.6855C15.0441 4.13222 14.5262 3.76295 13.9423 3.75H10.0577C9.47378 3.76295 8.95591 4.13222 8.7715 4.6855L8 7"
        stroke="#FF3B30"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function MergePDFScreen() {
  const activeTheme = useColorScheme();
  const isDark = activeTheme === 'dark';
  const textColor = isDark ? '#ffffff' : '#1C1C1E';

  const router = useRouter();
  const posthog = usePostHog();
  const [files, setFiles] = useState<{ name: string; uri: string }[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [outputUri, setOutputUri] = useState<string | null>(null);

  const pickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      multiple: true,
    });
    if (!result.canceled && result.assets) {
      const newFiles = result.assets.map((a) => ({ name: a.name, uri: a.uri }));
      setFiles((prev) => [...prev, ...newFiles]);
      setOutputUri(null);

      for (const a of result.assets) {
        try {
          const thumb = await PdfThumbnail.generate(a.uri, 1);
          if (thumb?.uri) {
            setThumbnails((prev) => ({ ...prev, [a.uri]: thumb.uri }));
          }
        } catch (err) {
          console.warn('Failed to generate thumbnail for ' + a.name, err);
        }
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setOutputUri(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      Alert.alert('Error', 'Please select at least 2 PDF files.');
      return;
    }
    setProcessing(true);
    try {
      const uri = await mergePDFs(files.map((f) => f.uri));
      setOutputUri(uri);
      posthog.capture('pdf_merged', {
        file_count: files.length,
      });

      // Auto-save results to files list
      const autoSave = useSettingsStore.getState().autoSaveResults;
      if (autoSave) {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        const size = (fileInfo as any).size || 0;
        const now = new Date().toISOString();
        const rand = Math.floor(1000 + Math.random() * 9000);
        const newFile: DeviceFile = {
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          uri,
          name: `Merged_Document_${rand}.pdf`,
          size,
          fileType: 'pdf',
          createdAt: now,
          modifiedAt: now,
          isFavorite: false,
        };
        await useFilesStore.getState().addFile(newFile);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to merge PDFs');
    } finally {
      setProcessing(false);
    }
  };

  const share = async () => {
    if (outputUri) {
      await Sharing.shareAsync(outputUri);
    }
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
          Merge PDF
        </Text>
      </View>

      {files.length === 0 ? (
        <Pressable
          onPress={pickFiles}
          className="flex-1 items-center justify-center p-6 active:opacity-80"
        >
          <Image
            source={require('@/assets/images/add-file.png')}
            style={{ width: 40, height: 40 }}
          />
          <Text className="text-[#1C1C1E] dark:text-white text-base font-extrabold mt-4 mb-2 text-center">
            Select PDF Files
          </Text>
          <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-xs font-semibold text-center max-w-[260px] leading-relaxed">
            Tap anywhere to import multiple PDF documents from your device to merge
          </Text>
        </Pressable>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-sm mb-6 leading-relaxed">
            Combine multiple PDF files into a single document. Reorder your files in the list below before executing the merge.
          </Text>

          {/* Add PDF Files secondary button */}
          <Pressable
            onPress={pickFiles}
            className="flex-row items-center justify-center bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] py-4 rounded-2xl active:bg-[#E5E5EA] dark:bg-[#2C2C2E] mb-6"
          >
            <Image
              source={require('@/assets/images/add-file.png')}
              style={{ width: 22, height: 22 }}
              resizeMode="contain"
            />
            <Text className="text-[#1C1C1E] dark:text-white font-black text-sm ml-2.5">
              Add More PDF Files
            </Text>
          </Pressable>

          {/* File List */}
          <View className="gap-4 mb-6">
            <Text className="text-xs font-black uppercase text-[#8E8E93] dark:text-[#9C9CA3] tracking-wider mb-1 px-1">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </Text>
            {files.map((f, i) => (
              <View
                key={i}
                className="flex-row items-center"
                style={{ gap: 12 }}
              >
                {/* Thumbnail container */}
                <View
                  className="rounded-lg overflow-hidden items-center justify-center bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E]"
                  style={{ width: 44, height: 56 }}
                >
                  {thumbnails[f.uri] ? (
                    <Image
                      source={{ uri: thumbnails[f.uri] }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <ActivityIndicator size="small" color="#FF3B30" />
                  )}
                </View>

                {/* Info and index */}
                <View className="flex-1" style={{ gap: 2 }}>
                  <Text
                    className="text-sm font-black text-[#1C1C1E] dark:text-white"
                    numberOfLines={1}
                  >
                    {f.name}
                  </Text>
                  <Text className="text-[11px] font-bold text-[#8E8E93] dark:text-[#9C9CA3]">
                    File {i + 1}
                  </Text>
                </View>

                {/* Remove button */}
                <Pressable
                  onPress={() => removeFile(i)}
                  className="w-9 h-9 items-center justify-center rounded-xl bg-[#3A1F1E] active:bg-[#4E2B2A]"
                >
                  <TrashIcon />
                </Pressable>
              </View>
            ))}
          </View>

          {/* Merge Action Button */}
          {files.length >= 2 && (
            <View className="mt-4 mb-4">
              <Pressable
                onPress={handleMerge}
                disabled={processing}
                className="w-full bg-[#FF3B30] py-4 rounded-2xl items-center justify-center active:opacity-90"
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-extrabold text-base">
                    Merge {files.length} Files
                  </Text>
                )}
              </Pressable>
            </View>
          )}

          {/* Output/Result */}
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
                  Merge Complete!
                </Text>
              </View>
              <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-xs mb-5 px-1 leading-relaxed">
                Your files have been successfully merged into a single PDF document.
              </Text>

              <Pressable
                onPress={share}
                className="w-full bg-[#FF3B30] py-4 rounded-xl items-center justify-center active:opacity-90"
              >
                <Text className="text-white font-extrabold text-base">
                  Share Merged PDF
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}