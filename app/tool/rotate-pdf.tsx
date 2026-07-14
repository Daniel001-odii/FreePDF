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

import { loadPDF, savePDF, rotatePDFPages, getPageCount } from '@/src/services/pdfService';
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

// Custom Rotate Icon
function RotateIcon({ color = '#FF3B30' }: { color?: string }) {
  return (
    <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 3V9M21 9H15M21 9C19.2319 6.07173 15.867 4.25413 12.0001 4.54585C7.99427 4.84797 4.81177 8.01257 4.51261 12.0177C4.17066 16.5959 7.79633 20.5 12.35 20.5C16.3262 20.5 19.6896 17.8222 20.7303 14"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Selection/Import Icon
function DocumentImportIcon() {
  return (
    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 12H15M12 9V15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
        stroke="#FF3B30"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function RotatePDFScreen() {
  const activeTheme = useColorScheme();
  const isDark = activeTheme === 'dark';
  const textColor = isDark ? '#ffffff' : '#1C1C1E';

  const router = useRouter();
  const [file, setFile] = useState<{ name: string; uri: string } | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [outputUri, setOutputUri] = useState<string | null>(null);

  // Thumbnail generation state
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const [thumbQueue, setThumbQueue] = useState<number[]>([]);
  
  // Rotation tracking mapping pageIndex -> angle (0, 90, 180, 270)
  const [rotations, setRotations] = useState<Record<number, 0 | 90 | 180 | 270>>({});

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled && result.assets?.[0]) {
      setFile({ name: result.assets[0].name, uri: result.assets[0].uri });
      setPageCount(0);
      setThumbnails({});
      setRotations({});
      setOutputUri(null);
      setLoading(true);

      try {
        const count = await getPageCount(result.assets[0].uri);
        setPageCount(count);
        // Queue thumbnails generation for pages 1 to count
        const queue = Array.from({ length: count }, (_, i) => i + 1);
        setThumbQueue(queue);
      } catch (err) {
        Alert.alert('Error', 'Failed to open PDF document.');
        setFile(null);
      } finally {
        setLoading(false);
      }
    }
  };

  // Thumbnail Generator Effect
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
        console.error('Failed to generate thumbnail for page', pageNum, err);
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

  const rotatePage = (pageIndex: number) => {
    setRotations((prev) => {
      const current = prev[pageIndex] ?? 0;
      const next = ((current + 90) % 360) as 0 | 90 | 180 | 270;
      return { ...prev, [pageIndex]: next };
    });
  };

  const handleSave = async () => {
    if (!file) return;

    // Filter to only non-zero rotation inputs
    const rotateSpecs = Object.entries(rotations)
      .map(([idx, angle]) => ({ pageIndex: parseInt(idx), angle }))
      .filter((s) => s.angle !== 0);

    if (rotateSpecs.length === 0) {
      Alert.alert('No Changes', 'No pages have been rotated. Tap on pages to rotate them.');
      return;
    }

    setProcessing(true);
    try {
      const uri = await rotatePDFPages(file.uri, rotateSpecs);
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
          name: `${baseName}_rotated.pdf`,
          size,
          fileType: 'pdf',
          createdAt: now,
          modifiedAt: now,
          isFavorite: false,
        };
        await useFilesStore.getState().addFile(newFile);
      }

      Alert.alert('Success', 'PDF pages rotated successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to rotate PDF');
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
          Rotate PDF
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
        /* Loaded Grid View */
        <View className="flex-1">
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#FF3B30" />
              <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-sm mt-3 font-semibold">
                Loading pages...
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
                  const angle = rotations[index] ?? 0;
                  return (
                    <Pressable
                      onPress={() => rotatePage(index)}
                      className="flex-1 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-2.5 items-center mb-3 relative overflow-hidden active:border-[#FF3B30]"
                    >
                      {/* Image container with rotation angle transform */}
                      <View className="w-full aspect-[3/4] bg-white dark:bg-[#0A0A0A] rounded-xl overflow-hidden items-center justify-center mb-2">
                        {thumbUri ? (
                          <Image
                            source={{ uri: thumbUri }}
                            style={{
                              width: '100%',
                              height: '100%',
                              transform: [{ rotate: `${angle}deg` }],
                            }}
                            resizeMode="contain"
                          />
                        ) : (
                          <ActivityIndicator size="small" color="#5C5C61" />
                        )}
                      </View>

                      <View className="flex-row items-center justify-between w-full px-1">
                        <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-[11px] font-black uppercase">
                          Page {index + 1}
                        </Text>
                        <RotateIcon color={angle > 0 ? '#FF3B30' : '#5C5C61'} />
                      </View>
                    </Pressable>
                  );
                }}
              />

              {/* Bottom Actions Layer */}
              <View className="absolute bottom-0 left-0 right-0 p-5 bg-white dark:bg-[#0A0A0A]/95 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex-row gap-3">
                {outputUri ? (
                  <Pressable
                    onPress={() => Sharing.shareAsync(outputUri)}
                    className="flex-1 bg-[#FF3B30] py-4 rounded-2xl items-center justify-center active:opacity-90"
                  >
                    <Text className="text-white font-extrabold text-base">
                      Share Rotated PDF
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
