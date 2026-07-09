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

import { addTextToPDF, getPageCount } from '@/src/services/pdfService';
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

// Add Text Icon
function AddTextIcon() {
  return (
    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 5H19M12 5V19M9 19H15"
        stroke="#FF3B30"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type PositionPreset = 'top' | 'center' | 'bottom';

export default function AddTextScreen() {
  const router = useRouter();
  const [file, setFile] = useState<{ name: string; uri: string; size?: number } | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Form Inputs
  const [text, setText] = useState('');
  const [targetPage, setTargetPage] = useState<string>('1');
  const [position, setPosition] = useState<PositionPreset>('center');
  const [fontSize, setFontSize] = useState<number>(18);

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
      setLoading(true);

      try {
        const count = await getPageCount(result.assets[0].uri);
        setPageCount(count);
        setTargetPage('1');
        
        const thumb = await PdfThumbnail.generate(result.assets[0].uri, 1);
        if (thumb?.uri) {
          setThumbnailUri(thumb.uri);
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to read PDF pages.');
        setFile(null);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddText = async () => {
    if (!file) return;
    if (!text.trim()) {
      Alert.alert('Validation Error', 'Please enter annotation text.');
      return;
    }

    const pageIndex = parseInt(targetPage) - 1;
    if (isNaN(pageIndex) || pageIndex < 0 || pageIndex >= pageCount) {
      Alert.alert('Validation Error', `Please enter a valid page number between 1 and ${pageCount}.`);
      return;
    }

    // Determine coordinates based on presets (assuming standard ~595x842 dimensions)
    let x = 50;
    let y = 400; // Center y
    if (position === 'top') {
      y = 760;
    } else if (position === 'bottom') {
      y = 60;
    }

    if (position === 'center') {
      // rough center offset
      x = 120;
    }

    setProcessing(true);
    try {
      const uri = await addTextToPDF(file.uri, text.trim(), {
        pageIndex,
        x,
        y,
        fontSize,
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
          name: `${baseName}_edited.pdf`,
          size,
          fileType: 'pdf',
          createdAt: now,
          modifiedAt: now,
          isFavorite: false,
        };
        await useFilesStore.getState().addFile(newFile);
      }

      Alert.alert('Success', 'Text annotation applied to the PDF page!');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to apply text');
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
          Add Text
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
            Insert customized text annotations and signatures directly onto specific pages of your PDF document.
          </Text>

          <View>
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
                  Total Pages available: {pageCount} · PDF
                </Text>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#FF3B30" className="my-10" />
            ) : (
              <View className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-5 mb-5">
                <Text className="text-xs font-black uppercase text-[#9C9CA3] tracking-wider mb-2.5 px-1">
                  Text Annotation Content
                </Text>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder="e.g. Approved by Admin"
                  placeholderTextColor="#5C5C61"
                  keyboardAppearance="dark"
                  className="w-full bg-[#0A0A0A] border border-[#2C2C2E] rounded-xl px-4 py-3.5 text-white font-semibold text-sm focus:border-[#FF3B30] mb-5"
                />

                <View className="flex-row gap-4 mb-5">
                  <View className="flex-1">
                    <Text className="text-xs font-black uppercase text-[#9C9CA3] tracking-wider mb-2.5 px-1">
                      Target Page
                    </Text>
                    <TextInput
                      value={targetPage}
                      onChangeText={setTargetPage}
                      placeholder="Page num"
                      placeholderTextColor="#5C5C61"
                      keyboardAppearance="dark"
                      keyboardType="number-pad"
                      className="bg-[#0A0A0A] border border-[#2C2C2E] rounded-xl px-4 py-3.5 text-white font-semibold text-sm focus:border-[#FF3B30]"
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-xs font-black uppercase text-[#9C9CA3] tracking-wider mb-2.5 px-1">
                      Font Size
                    </Text>
                    <View className="flex-row bg-[#0A0A0A] border border-[#2C2C2E] rounded-xl overflow-hidden justify-around items-center h-12">
                      {([12, 18, 24] as const).map((sz) => (
                        <Pressable
                          key={sz}
                          onPress={() => setFontSize(sz)}
                          className={`flex-1 h-full items-center justify-center ${
                            fontSize === sz ? 'bg-[#FF3B30]' : 'active:bg-[#1C1C1E]'
                          }`}
                        >
                          <Text
                            className={`font-black text-[10px] uppercase ${
                              fontSize === sz ? 'text-white' : 'text-[#9C9CA3]'
                            }`}
                          >
                            {sz === 12 ? '12px' : sz === 18 ? '18px' : '24px'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>

                <Text className="text-xs font-black uppercase text-[#9C9CA3] tracking-wider mb-2.5 px-1">
                  Page Position Preset
                </Text>
                <View className="flex-row gap-2.5 mb-6">
                  {(['top', 'center', 'bottom'] as const).map((pos) => (
                    <Pressable
                      key={pos}
                      onPress={() => setPosition(pos)}
                      className={`flex-1 py-3 rounded-xl items-center justify-center border ${
                        position === pos
                          ? 'bg-[#FF3B30] border-[#FF3B30]'
                          : 'bg-[#0A0A0A] border-[#2C2C2E]'
                      }`}
                    >
                      <Text
                        className={`font-black text-xs uppercase ${
                          position === pos ? 'text-white' : 'text-[#9C9CA3]'
                        }`}
                      >
                        {pos}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View className="flex-row gap-3">
                  <Pressable
                    onPress={pickFile}
                    className="flex-1 bg-[#1C1C1E] border border-[#2C2C2E] py-3.5 rounded-xl items-center active:bg-[#2C2C2E]"
                  >
                    <Text className="text-white font-bold text-sm">
                      Change File
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleAddText}
                    disabled={processing || !text.trim()}
                    className={`flex-[2] py-3.5 rounded-xl items-center justify-center ${
                      !text.trim() ? 'bg-[#FF3B30]/40 opacity-55' : 'bg-[#FF3B30] active:opacity-90'
                    }`}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="text-white font-bold text-sm">
                        Apply Text
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {outputUri && (
              <View className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-5 mt-4">
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
                  <Text className="text-white text-base font-bold">
                    Text Added Saved!
                  </Text>
                </View>
                <Text className="text-[#9C9CA3] text-xs mb-5 px-1 leading-relaxed">
                  Your PDF file has been saved with the text annotations applied.
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
