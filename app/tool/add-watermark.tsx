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
import { useColorScheme } from '@/components/useColorScheme';
import { Stack, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import Svg, { Path } from 'react-native-svg';
import PdfThumbnail from 'react-native-pdf-thumbnail';

import { addWatermark } from '@/src/services/pdfService';
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

// Watermark Icon
function WatermarkIcon() {
  return (
    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z"
        stroke="#FF3B30"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <Path
        d="M12 8V16M8 12H16"
        stroke="#FF3B30"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function AddWatermarkScreen() {
  const activeTheme = useColorScheme();
  const isDark = activeTheme === 'dark';
  const textColor = isDark ? '#ffffff' : '#1C1C1E';

  const router = useRouter();
  const [file, setFile] = useState<{ name: string; uri: string; size?: number } | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  
  // Settings options
  const [fontSize, setFontSize] = useState<number>(60);
  const [opacity, setOpacity] = useState<number>(0.15);
  
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

  const handleAddWatermark = async () => {
    if (!file) return;
    if (!watermarkText.trim()) {
      Alert.alert('Validation Error', 'Please enter a watermark text.');
      return;
    }

    setProcessing(true);
    try {
      const uri = await addWatermark(file.uri, watermarkText.trim().toUpperCase(), {
        fontSize,
        opacity,
      });
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
          name: `${baseName}_watermarked.pdf`,
          size,
          fileType: 'pdf',
          createdAt: now,
          modifiedAt: now,
          isFavorite: false,
        };
        await useFilesStore.getState().addFile(newFile);
      }

      Alert.alert('Success', 'Watermark added to all pages!');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to add watermark');
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
          Add Watermark
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
            Overlay a semitransparent watermark text across all pages of your PDF document to protect copyright and prevent unauthorized distribution.
          </Text>

          {/* Form View */}
          <View>
            {/* File Details (Borderless with Thumbnail) */}
            <View className="flex-row items-center mb-5" style={{ gap: 12 }}>
              <View
                className="rounded-lg overflow-hidden items-center justify-center bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E]"
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
                  {file.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB · ` : ''}PDF
                </Text>
              </View>
            </View>

            {/* Inputs Box */}
            <View className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-5 mb-5">
              <Text className="text-xs font-black uppercase text-[#8E8E93] dark:text-[#9C9CA3] tracking-wider mb-2.5 px-1">
                Watermark Text Phrase
              </Text>
              <TextInput
                value={watermarkText}
                onChangeText={setWatermarkText}
                placeholder="e.g. CONFIDENTIAL"
                placeholderTextColor="#5C5C61"
                keyboardAppearance="dark"
                autoCapitalize="characters"
                maxLength={20}
                className="w-full bg-white dark:bg-[#0A0A0A] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl px-4 py-3.5 text-[#1C1C1E] dark:text-white font-extrabold text-sm focus:border-[#FF3B30] mb-5"
              />

              {/* Font Size Selector */}
              <Text className="text-xs font-black uppercase text-[#8E8E93] dark:text-[#9C9CA3] tracking-wider mb-2.5 px-1">
                Font Size
              </Text>
              <View className="flex-row gap-2.5 mb-5">
                {([30, 60, 90] as const).map((size) => (
                  <Pressable
                    key={size}
                    onPress={() => setFontSize(size)}
                    className={`flex-1 py-3 rounded-xl items-center justify-center border ${
                      fontSize === size
                        ? 'bg-[#FF3B30] border-[#FF3B30]'
                        : 'bg-white dark:bg-[#0A0A0A] border-[#E5E5EA] dark:border-[#2C2C2E]'
                    }`}
                  >
                    <Text
                      className={`font-black text-xs ${
                        fontSize === size ? 'text-white' : 'text-[#8E8E93] dark:text-[#9C9CA3]'
                      }`}
                    >
                      {size === 30 ? 'Small' : size === 60 ? 'Medium' : 'Large'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Opacity Selector */}
              <Text className="text-xs font-black uppercase text-[#8E8E93] dark:text-[#9C9CA3] tracking-wider mb-2.5 px-1">
                Watermark Opacity
              </Text>
              <View className="flex-row gap-2.5 mb-6">
                {([0.08, 0.15, 0.3] as const).map((op) => (
                  <Pressable
                    key={op}
                    onPress={() => setOpacity(op)}
                    className={`flex-1 py-3 rounded-xl items-center justify-center border ${
                      opacity === op
                        ? 'bg-[#FF3B30] border-[#FF3B30]'
                        : 'bg-white dark:bg-[#0A0A0A] border-[#E5E5EA] dark:border-[#2C2C2E]'
                    }`}
                  >
                    <Text
                      className={`font-black text-xs ${
                        opacity === op ? 'text-white' : 'text-[#8E8E93] dark:text-[#9C9CA3]'
                      }`}
                    >
                      {op === 0.08 ? 'Light' : op === 0.15 ? 'Normal' : 'Strong'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Action Buttons */}
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
                  onPress={handleAddWatermark}
                  disabled={processing}
                  className="flex-[2] bg-[#FF3B30] py-3.5 rounded-xl items-center justify-center active:opacity-90"
                >
                  {processing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-white font-bold text-sm">
                      Apply Watermark
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>

            {/* Success sharing banner */}
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
                    Watermark Saved!
                  </Text>
                </View>
                <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-xs mb-5 px-1 leading-relaxed">
                  Your PDF file has been saved with the watermark text overlay.
                </Text>

                <Pressable
                  onPress={() => Sharing.shareAsync(outputUri)}
                  className="w-full bg-[#FF3B30] py-4 rounded-xl items-center justify-center active:opacity-90"
                >
                  <Text className="text-white font-extrabold text-base">
                    Share PDF File
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
