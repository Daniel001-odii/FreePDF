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
import PdfThumbnail from 'react-native-pdf-thumbnail';
import Svg, { Path } from 'react-native-svg';

import { getPageCount } from '@/src/services/pdfService';

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

// Convert Images Icon
function PDFToImageIcon() {
  return (
    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 16L8.58579 11.4142C9.36684 10.6332 10.6332 10.6332 11.4142 11.4142L16 16M14 14L15.5858 12.4142C16.3668 11.6332 17.6332 11.6332 18.4142 12.4142L20 14M14 8H14.01M20 20H4C2.89543 20 2 19.1046 2 18V6C2 4.89543 2.89543 4 4 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20Z"
        stroke="#FF3B30"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Custom Share Icon
function ShareIcon() {
  return (
    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.5 12H15.5M12.5 9V15M19 12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12C5 8.13401 8.13401 5 12 5C15.866 5 19 8.13401 19 12Z"
        stroke={color || "#fff"}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function PDFToImagesScreen() {
  const activeTheme = useColorScheme();
  const isDark = activeTheme === 'dark';
  const textColor = isDark ? '#ffffff' : '#1C1C1E';

  const router = useRouter();
  const [file, setFile] = useState<{ name: string; uri: string } | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');

  // Loaded thumbnails for preview
  const [previewThumbnails, setPreviewThumbnails] = useState<Record<number, string>>({});
  const [thumbQueue, setThumbQueue] = useState<number[]>([]);

  // Exported JPEG image file URIs mapping pageIndex -> imageUri
  const [exportedImages, setExportedImages] = useState<string[]>([]);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled && result.assets?.[0]) {
      setFile({ name: result.assets[0].name, uri: result.assets[0].uri });
      setPageCount(0);
      setPreviewThumbnails({});
      setExportedImages([]);
      setLoading(true);

      try {
        const count = await getPageCount(result.assets[0].uri);
        setPageCount(count);
        // Pre-queue first few pages for preview thumbnails
        const limitCount = Math.min(count, 12);
        setThumbQueue(Array.from({ length: limitCount }, (_, i) => i + 1));
      } catch (err) {
        Alert.alert('Error', 'Failed to read PDF pages.');
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
          setPreviewThumbnails((prev) => ({ ...prev, [pageNum - 1]: result.uri }));
        }
      } catch (err) {
        console.error('Failed thumbnail preview generation', pageNum, err);
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

  const handleConvertToImages = async () => {
    if (!file || pageCount === 0) return;

    setProcessing(true);
    setProgressText('Extracting page 1...');
    const resultImages: string[] = [];

    try {
      for (let i = 1; i <= pageCount; i++) {
        setProgressText(`Extracting page ${i} of ${pageCount}...`);
        const result = await PdfThumbnail.generate(file.uri, i);
        if (result?.uri) {
          resultImages.push(result.uri);
        } else {
          throw new Error(`Failed to extract page ${i}`);
        }
      }

      setExportedImages(resultImages);
      Alert.alert('Success', 'PDF converted to JPEG images successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Conversion failed');
    } finally {
      setProcessing(false);
      setProgressText('');
    }
  };

  const handleShareAll = async () => {
    if (exportedImages.length === 0) return;
    try {
      // If single file, share directly
      if (exportedImages.length === 1) {
        await Sharing.shareAsync(exportedImages[0]);
      } else {
        // Share first image or explain sharing multiple
        Alert.alert(
          'Share Images',
          'You can share each image individually from the list below, or share the first page now.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Share First Page', onPress: () => Sharing.shareAsync(exportedImages[0]) }
          ]
        );
      }
    } catch (err) {
      console.error('Sharing failed', err);
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
          PDF to Images
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
                Reading PDF pages...
              </Text>
            </View>
          ) : (
            <View className="flex-1 px-4 pt-4">
              {/* Show converting progress bar */}
              {processing && (
                <View className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-5 mb-4 mx-2 items-center">
                  <ActivityIndicator size="small" color="#FF3B30" />
                  <Text className="text-[#1C1C1E] dark:text-white font-bold text-sm mt-2">
                    Converting document...
                  </Text>
                  <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-xs mt-1">
                    {progressText}
                  </Text>
                </View>
              )}

              {exportedImages.length > 0 ? (
                /* Converted Results Grid */
                <FlatList
                  data={exportedImages}
                  numColumns={3}
                  keyExtractor={(item) => item}
                  showsVerticalScrollIndicator={false}
                  columnWrapperStyle={{ gap: 12 }}
                  contentContainerStyle={{ paddingBottom: 120 }}
                  renderItem={({ item: imageUri, index }) => (
                    <View className="flex-1 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-2.5 items-center mb-3 relative overflow-hidden">
                      <View className="w-full aspect-[3/4] bg-white dark:bg-[#0A0A0A] rounded-xl overflow-hidden items-center justify-center mb-2">
                        <Image
                          source={{ uri: imageUri }}
                          className="w-full h-full"
                          resizeMode="contain"
                        />
                      </View>
                      <View className="flex-row items-center justify-between w-full px-1">
                        <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-[9px] font-black uppercase">
                          IMG_{index + 1}.jpg
                        </Text>
                        <Pressable
                          onPress={() => Sharing.shareAsync(imageUri)}
                          className="w-5 h-5 bg-[#3A1F1E] rounded-md items-center justify-center active:bg-[#4E2B2A]"
                        >
                          <ShareIcon />
                        </Pressable>
                      </View>
                    </View>
                  )}
                />
              ) : (
                /* Pre-conversion Preview Grid */
                <FlatList
                  data={Array.from({ length: pageCount })}
                  numColumns={3}
                  keyExtractor={(_, i) => i.toString()}
                  showsVerticalScrollIndicator={false}
                  columnWrapperStyle={{ gap: 12 }}
                  contentContainerStyle={{ paddingBottom: 120 }}
                  renderItem={({ index }) => {
                    const thumbUri = previewThumbnails[index];
                    return (
                      <View className="flex-1 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-2.5 items-center mb-3 relative overflow-hidden">
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
                        <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-[9px] font-black uppercase">
                          Page {index + 1}
                        </Text>
                      </View>
                    );
                  }}
                />
              )}

              {/* Bottom Actions Tray */}
              <View className="absolute bottom-0 left-0 right-0 p-5 bg-white dark:bg-[#0A0A0A]/95 border-t border-[#E5E5EA] dark:border-[#2C2C2E] flex-row gap-3">
                {exportedImages.length > 0 ? (
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
                      onPress={handleShareAll}
                      className="flex-[2] bg-[#FF3B30] py-4 rounded-2xl items-center justify-center active:opacity-90"
                    >
                      <Text className="text-white font-extrabold text-base">
                        Share Images
                      </Text>
                    </Pressable>
                  </>
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
                      onPress={handleConvertToImages}
                      disabled={processing}
                      className="flex-[2] bg-[#FF3B30] py-4 rounded-2xl items-center justify-center active:opacity-90"
                    >
                      <Text className="text-white font-extrabold text-base">
                        Convert to JPEGs
                      </Text>
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
