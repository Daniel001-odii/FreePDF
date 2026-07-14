import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import { Stack, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import PdfThumbnail from 'react-native-pdf-thumbnail';
import Svg, { Path } from 'react-native-svg';

import { extractPages, getPageCount } from '@/src/services/pdfService';
import { useFilesStore } from '@/src/stores/filesStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import type { DeviceFile } from '@/src/types';

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

// Extract Icon
function ExtractIcon() {
  return (
    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 21H3M12 3V17M12 17L8 13M12 17L16 13"
        stroke="#FF3B30"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Checkmark Icon
function CheckIcon() {
  return (
    <Svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12L10 17L20 7"
        stroke={color || "#fff"}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function ExtractPagesScreen() {
  const activeTheme = useColorScheme();
  const isDark = activeTheme === 'dark';
  const textColor = isDark ? '#ffffff' : '#1C1C1E';

  const router = useRouter();
  const [file, setFile] = useState<{ name: string; uri: string } | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [outputUri, setOutputUri] = useState<string | null>(null);

  // Selection state
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [thumbQueue, setThumbQueue] = useState<number[]>([]);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled && result.assets?.[0]) {
      setFile({ name: result.assets[0].name, uri: result.assets[0].uri });
      setPageCount(0);
      setSelectedPages(new Set());
      setThumbnails({});
      setOutputUri(null);
      setLoading(true);

      try {
        const count = await getPageCount(result.assets[0].uri);
        setPageCount(count);
        setThumbQueue(Array.from({ length: count }, (_, i) => i + 1));
      } catch (err) {
        Alert.alert('Error', 'Failed to read PDF document.');
        setFile(null);
      } finally {
        setLoading(false);
      }
    }
  };

  // Thumbnail generator
  useEffect(() => {
    if (thumbQueue.length === 0 || !file) return;

    let cancelled = false;
    const generateNext = async () => {
      const pageNum = thumbQueue[0];
      if (pageNum == null || cancelled) return;

      try {
        const result = await PdfThumbnail.generate(file.uri, pageNum);
        if (!cancelled && result?.uri) {
          setThumbnails((prev) => ({ ...prev, [pageNum - 1]: result.uri }));
        }
      } catch (err) {
        console.error('Failed thumbnail generation', pageNum, err);
      }

      if (!cancelled) {
        setThumbQueue((prev) => prev.slice(1));
      }
    };

    generateNext();

    return () => {
      cancelled = true;
    };
  }, [thumbQueue, file]);

  const toggleSelectPage = (pageIndex: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageIndex)) {
        next.delete(pageIndex);
      } else {
        next.add(pageIndex);
      }
      return next;
    });
    setOutputUri(null);
  };

  const handleExtract = async () => {
    if (!file || selectedPages.size === 0) {
      Alert.alert('No Selection', 'Please select at least 1 page to extract.');
      return;
    }

    const indices = Array.from(selectedPages).sort((a, b) => a - b);

    setProcessing(true);
    try {
      const uri = await extractPages(file.uri, indices);
      setOutputUri(uri);

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
          name: `${baseName}_extracted.pdf`,
          size,
          fileType: 'pdf',
          createdAt: now,
          modifiedAt: now,
          isFavorite: false,
        };
        await useFilesStore.getState().addFile(newFile);
      }

      Alert.alert('Success', 'Selected pages extracted successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to extract PDF pages');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]" edges={['top']}>
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
          Extract Pages
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
        /* Pages Grid View */
        <View className="flex-1">
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#FF3B30" />
              <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-sm mt-3 font-semibold">
                Loading document pages...
              </Text>
            </View>
          ) : (
            <View className="flex-1 px-4 pt-4">
              <FlatList
                data={Array.from({ length: pageCount })}
                numColumns={3}
                keyExtractor={(_, i) => i.toString()}
                showsVerticalScrollIndicator={false}
                columnWrapperStyle={{ gap: 12 }}
                contentContainerStyle={{ paddingBottom: 120 }}
                renderItem={({ index }) => {
                  const thumbUri = thumbnails[index];
                  const isSelected = selectedPages.has(index);
                  return (
                    <Pressable
                      onPress={() => toggleSelectPage(index)}
                      className={`flex-1 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-transparent border rounded-2xl p-2.5 items-center mb-3 relative overflow-hidden active:opacity-95 ${
                        isSelected ? 'border-[#FF3B30]' : 'border-[#E5E5EA] dark:border-[#2C2C2E]'
                      }`}
                    >
                      {/* Selection indicator */}
                      <View
                        className={`absolute top-4 right-4 w-5 h-5 rounded-full border items-center justify-center z-10 ${
                          isSelected ? 'bg-[#FF3B30] border-[#FF3B30]' : 'border-[#5C5C61] bg-black/40'
                        }`}
                      >
                        {isSelected && <CheckIcon />}
                      </View>

                      {/* Image Preview */}
                      <View className="w-full aspect-[3/4] bg-white dark:bg-[#0A0A0A] rounded-xl overflow-hidden items-center justify-center mb-2">
                        {thumbUri ? (
                          <Image
                            source={{ uri: thumbUri }}
                            className="w-full h-full"
                            resizeMode="contain"
                          />
                        ) : (
                          <ActivityIndicator size="small" color="#5C5C61" />
                        )}
                      </View>

                      <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-[10px] font-black uppercase">
                        Page {index + 1}
                      </Text>
                    </Pressable>
                  );
                }}
              />

              {/* Bottom Actions Tray */}
              <View className="absolute bottom-0 left-0 right-0 p-5 bg-white dark:bg-[#0A0A0A]/95 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex-row gap-3">
                {outputUri ? (
                  <Pressable
                    onPress={() => Sharing.shareAsync(outputUri)}
                    className="flex-1 bg-[#FF3B30] py-4 rounded-2xl items-center justify-center active:opacity-90"
                  >
                    <Text className="text-white font-extrabold text-base">
                      Share Extracted PDF
                    </Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      onPress={pickFile}
                      className="flex-1 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] py-4 rounded-2xl items-center justify-center active:bg-[#E5E5EA] dark:bg-[#2C2C2E]"
                    >
                      <Text className="text-[#1C1C1E] dark:text-white font-bold text-base">
                        Change File
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={handleExtract}
                      disabled={processing || selectedPages.size === 0}
                      className={`flex-[2] py-4 rounded-2xl items-center justify-center ${
                        selectedPages.size === 0
                          ? 'bg-[#FF3B30]/40 opacity-55'
                          : 'bg-[#FF3B30] active:opacity-90'
                      }`}
                    >
                      {processing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text className="text-white font-extrabold text-base">
                          Extract ({selectedPages.size}) Page{selectedPages.size > 1 ? 's' : ''}
                        </Text>
                      )}
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
