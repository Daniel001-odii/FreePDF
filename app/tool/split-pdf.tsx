import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import Svg, { Path } from 'react-native-svg';
import PdfThumbnail from 'react-native-pdf-thumbnail';

import { splitPDF, getPageCount } from '@/src/services/pdfService';
import { useFilesStore } from '@/src/stores/filesStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import type { DeviceFile } from '@/src/types';

// Custom Arrow Left Icon
function HugeiconsArrowLeft01() {
  return (
    <Svg width="28" height="28" viewBox="0 0 24 24">
      <Path
        fill="none"
        stroke="#fff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="M15 6s-6 4.419-6 6s6 6 6 6"
      />
    </Svg>
  );
}

// Split Icon
function SplitIcon() {
  return (
    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 5H4V9M16 5H20V9M8 19H4V15M16 19H20V15M12 4V20"
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
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.5 12H15.5M12.5 9V15M19 12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12C5 8.13401 8.13401 5 12 5C15.866 5 19 8.13401 19 12Z"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function SplitPDFScreen() {
  const router = useRouter();
  const [file, setFile] = useState<{ name: string; uri: string; size?: number } | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rangeText, setRangeText] = useState<string>('');
  
  // Results: List of output file paths
  const [outputUris, setOutputUris] = useState<string[]>([]);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled && result.assets?.[0]) {
      setFile({
        name: result.assets[0].name,
        uri: result.assets[0].uri,
        size: result.assets[0].size,
      });
      setPageCount(0);
      setRangeText('');
      setOutputUris([]);
      setThumbnailUri(null);
      setLoading(true);

      try {
        const count = await getPageCount(result.assets[0].uri);
        setPageCount(count);
        // Pre-fill a default range split (e.g. 1-2, 3-count)
        if (count > 1) {
          setRangeText(`1-1, 2-${count}`);
        } else {
          setRangeText('1');
        }
        
        const thumb = await PdfThumbnail.generate(result.assets[0].uri, 1);
        if (thumb?.uri) {
          setThumbnailUri(thumb.uri);
        }
      } catch (err) {
        console.warn('Failed to generate thumbnail', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const parseRanges = (text: string, maxPages: number): number[][] => {
    const parts = text.split(',');
    const result: number[][] = [];
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr.trim());
        const end = parseInt(endStr.trim());
        if (isNaN(start) || isNaN(end) || start < 1 || end > maxPages || start > end) {
          throw new Error(`Invalid range: "${trimmed}". Must be between 1 and ${maxPages}.`);
        }
        const range: number[] = [];
        for (let i = start - 1; i < end; i++) {
          range.push(i);
        }
        result.push(range);
      } else {
        const num = parseInt(trimmed);
        if (isNaN(num) || num < 1 || num > maxPages) {
          throw new Error(`Invalid page number: "${trimmed}". Must be between 1 and ${maxPages}.`);
        }
        result.push([num - 1]);
      }
    }
    if (result.length === 0) {
      throw new Error('Please enter at least one split range.');
    }
    return result;
  };

  const handleSplit = async () => {
    if (!file || pageCount === 0) return;

    let targetRanges: number[][];
    try {
      targetRanges = parseRanges(rangeText, pageCount);
    } catch (err: any) {
      Alert.alert('Validation Error', err.message);
      return;
    }

    setProcessing(true);
    try {
      const uris = await splitPDF(file.uri, targetRanges);
      setOutputUris(uris);

      // Auto-save results to files list
      const autoSave = useSettingsStore.getState().autoSaveResults;
      if (autoSave) {
        const now = new Date().toISOString();
        const baseName = file.name.replace(/\.pdf$/i, '');
        for (let i = 0; i < uris.length; i++) {
          const uri = uris[i];
          const fileInfo = await FileSystem.getInfoAsync(uri);
          const size = (fileInfo as any).size || 0;
          const newFile: DeviceFile = {
            id: `file_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 11)}`,
            uri,
            name: `${baseName}_part_${i + 1}.pdf`,
            size,
            fileType: 'pdf',
            createdAt: now,
            modifiedAt: now,
            isFavorite: false,
          };
          await useFilesStore.getState().addFile(newFile);
        }
      }

      Alert.alert('Success', `Split PDF into ${uris.length} files successfully!`);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to split PDF');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ===== Header ===== */}
      <View className="flex-row items-center px-4 py-4 border-b border-[#2C2C2E]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center mr-2"
        >
          <HugeiconsArrowLeft01 />
        </Pressable>

        <Text
          style={{ fontFamily: 'RocaTwoBold' }}
          className="text-white text-2xl font-black"
        >
          Split PDF
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
          <Text className="text-white text-base font-extrabold mt-4 mb-2 text-center">
            Select PDF File
          </Text>
          <Text className="text-[#9C9CA3] text-xs font-semibold text-center max-w-[260px] leading-relaxed">
            Tap anywhere to import a PDF document from your device
          </Text>
        </Pressable>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-[#9C9CA3] text-sm mb-6 leading-relaxed">
            Divide a PDF document into separate files by defining page range presets. Use commas to separate output files (e.g. 1-2, 3, 4-6).
          </Text>

          {/* Loaded View */}
          <View>
            {loading ? (
              <ActivityIndicator size="large" color="#FF3B30" className="my-10" />
            ) : (
              <>
                {/* File Details (Borderless with Thumbnail) */}
                <View className="flex-row items-center mb-5" style={{ gap: 12 }}>
                  <View
                    className="rounded-lg overflow-hidden items-center justify-center bg-[#1C1C1E] border border-[#2C2C2E]"
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
                    <Text className="text-sm font-black text-white" numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text className="text-[11px] font-bold text-[#9C9CA3]">
                      Total Pages: {pageCount} · PDF
                    </Text>
                  </View>
                </View>

                {/* Range Input Card */}
                <View className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-5 mb-5">
                  <Text className="text-white text-base font-bold mb-2">
                    Define Range Output
                  </Text>
                  <Text className="text-[#9C9CA3] text-xs leading-relaxed mb-4">
                    Enter the range formats. For example, entering <Text className="text-white font-extrabold">1-2, 3-4</Text> will split a 4-page PDF into two double-page files.
                  </Text>

                  <TextInput
                    value={rangeText}
                    onChangeText={setRangeText}
                    placeholder="e.g. 1-2, 3-5, 6"
                    placeholderTextColor="#5C5C61"
                    keyboardAppearance="dark"
                    className="w-full bg-[#0A0A0A] border border-[#2C2C2E] rounded-xl px-4 py-3.5 text-white font-semibold text-sm focus:border-[#FF3B30] mb-4"
                  />

                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={pickFile}
                      className="flex-1 bg-[#0A0A0A] border border-[#2C2C2E] py-3.5 rounded-xl items-center active:bg-[#161618]"
                    >
                      <Text className="text-white font-bold text-sm">
                        Change File
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handleSplit}
                      disabled={processing}
                      className="flex-[2] bg-[#FF3B30] py-3.5 rounded-xl items-center justify-center active:opacity-90"
                    >
                      {processing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text className="text-white font-bold text-sm">
                          Split Document
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>

                {/* Split Output List */}
                {outputUris.length > 0 && (
                  <View className="gap-3 mt-4">
                    <Text className="text-xs font-black uppercase text-[#9C9CA3] tracking-wider mb-1 px-1">
                      Split Results ({outputUris.length} files)
                    </Text>
                    {outputUris.map((uri, index) => {
                      const parts = uri.split('/');
                      const filename = parts[parts.length - 1];
                      return (
                        <View
                          key={index}
                          className="flex-row items-center bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-4 justify-between"
                        >
                          <View className="flex-1 mr-3">
                            <Text
                              className="text-white text-sm font-semibold"
                              numberOfLines={1}
                            >
                              {filename}
                            </Text>
                            <Text className="text-[#9C9CA3] text-[10px] mt-0.5 font-bold uppercase">
                              Part {index + 1}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => Sharing.shareAsync(uri)}
                            className="bg-[#3A1F1E] px-4 py-2 rounded-xl flex-row items-center active:bg-[#4E2B2A]"
                          >
                            <ShareIcon />
                            <Text className="text-white font-extrabold text-xs ml-1.5">
                              Share
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
