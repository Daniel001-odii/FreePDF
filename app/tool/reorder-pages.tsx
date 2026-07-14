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

import { reorderPages, getPageCount } from '@/src/services/pdfService';
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

// Reorder/Layers Icon
function LayersIcon() {
  return (
    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4L4 8L12 12L20 8L12 4Z"
        stroke="#FF3B30"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 12L12 16L20 12"
        stroke="#FF3B30"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 16L12 20L20 16"
        stroke="#FF3B30"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Left Shift Arrow
function ArrowLeftIcon() {
  return (
    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 19L8 12L15 5"
        stroke={color || "#fff"}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Right Shift Arrow
function ArrowRightIcon() {
  return (
    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 5L16 12L9 19"
        stroke={color || "#fff"}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Delete Icon
function TrashIcon() {
  return (
    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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

export default function ReorderPagesScreen() {
  const activeTheme = useColorScheme();
  const isDark = activeTheme === 'dark';
  const textColor = isDark ? '#ffffff' : '#1C1C1E';

  const router = useRouter();
  const [file, setFile] = useState<{ name: string; uri: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [outputUri, setOutputUri] = useState<string | null>(null);

  // Reorder indices (holds original indices, e.g. [0, 1, 2...])
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [thumbQueue, setThumbQueue] = useState<number[]>([]);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled && result.assets?.[0]) {
      setFile({ name: result.assets[0].name, uri: result.assets[0].uri });
      setPageOrder([]);
      setThumbnails({});
      setOutputUri(null);
      setLoading(true);

      try {
        const count = await getPageCount(result.assets[0].uri);
        const initialOrder = Array.from({ length: count }, (_, i) => i);
        setPageOrder(initialOrder);
        // Queue thumbnails for all pages (1-indexed for PdfThumbnail)
        setThumbQueue(Array.from({ length: count }, (_, i) => i + 1));
      } catch (err) {
        Alert.alert('Error', 'Failed to read page information.');
        setFile(null);
      } finally {
        setLoading(false);
      }
    }
  };

  // Generate page thumbnails in background queue
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

  const moveLeft = (index: number) => {
    if (index === 0) return;
    setPageOrder((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
    setOutputUri(null);
  };

  const moveRight = (index: number) => {
    if (index === pageOrder.length - 1) return;
    setPageOrder((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
    setOutputUri(null);
  };

  const deletePage = (index: number) => {
    if (pageOrder.length <= 1) {
      Alert.alert('Cannot Delete', 'A PDF must contain at least 1 page.');
      return;
    }
    setPageOrder((prev) => prev.filter((_, i) => i !== index));
    setOutputUri(null);
  };

  const handleSave = async () => {
    if (!file || pageOrder.length === 0) return;

    setProcessing(true);
    try {
      const uri = await reorderPages(file.uri, pageOrder);
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
          name: `${baseName}_reordered.pdf`,
          size,
          fileType: 'pdf',
          createdAt: now,
          modifiedAt: now,
          isFavorite: false,
        };
        await useFilesStore.getState().addFile(newFile);
      }

      Alert.alert('Success', 'PDF pages reordered and saved successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to reorder PDF pages');
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
          Reorder Pages
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
        /* Grid list View */
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
                data={pageOrder}
                numColumns={3}
                keyExtractor={(item, index) => `${item}_${index}`}
                showsVerticalScrollIndicator={false}
                columnWrapperStyle={{ gap: 12 }}
                contentContainerStyle={{ paddingBottom: 120 }}
                renderItem={({ item: originalIndex, index }) => {
                  const thumbUri = thumbnails[originalIndex];
                  return (
                    <View className="flex-1 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-2 mb-3 items-center relative overflow-hidden">
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

                      {/* Info Row */}
                      <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-[10px] font-black uppercase mb-2">
                        Page {index + 1}
                      </Text>

                      {/* Action buttons (shift, delete) */}
                      <View className="flex-row gap-1 w-full justify-center">
                        <Pressable
                          onPress={() => moveLeft(index)}
                          disabled={index === 0}
                          className={`w-6 h-6 items-center justify-center rounded-lg bg-white dark:bg-[#0A0A0A] border border-[#E5E5EA] dark:border-[#2C2C2E] ${
                            index === 0 ? 'opacity-20' : 'active:bg-[#161618]'
                          }`}
                        >
                          <ArrowLeftIcon />
                        </Pressable>

                        <Pressable
                          onPress={() => deletePage(index)}
                          className="w-6 h-6 items-center justify-center rounded-lg bg-[#3A1F1E] border border-[#4E2B2A] active:bg-[#4E2B2A]"
                        >
                          <TrashIcon />
                        </Pressable>

                        <Pressable
                          onPress={() => moveRight(index)}
                          disabled={index === pageOrder.length - 1}
                          className={`w-6 h-6 items-center justify-center rounded-lg bg-white dark:bg-[#0A0A0A] border border-[#E5E5EA] dark:border-[#2C2C2E] ${
                            index === pageOrder.length - 1 ? 'opacity-20' : 'active:bg-[#161618]'
                          }`}
                        >
                          <ArrowRightIcon />
                        </Pressable>
                      </View>
                    </View>
                  );
                }}
              />

              {/* Save/Share Tray */}
              <View className="absolute bottom-0 left-0 right-0 p-5 bg-white dark:bg-[#0A0A0A]/95 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex-row gap-3">
                {outputUri ? (
                  <Pressable
                    onPress={() => Sharing.shareAsync(outputUri)}
                    className="flex-1 bg-[#FF3B30] py-4 rounded-2xl items-center justify-center active:opacity-90"
                  >
                    <Text className="text-white font-extrabold text-base">
                      Share Reordered PDF
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
                      onPress={handleSave}
                      disabled={processing}
                      className="flex-[2] bg-[#FF3B30] py-4 rounded-2xl items-center justify-center active:opacity-90"
                    >
                      {processing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text className="text-white font-extrabold text-base">
                          Save Changes
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
