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
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import Svg, { Path } from 'react-native-svg';
import PdfThumbnail from 'react-native-pdf-thumbnail';

import { addImageToPDF, getPageCount } from '@/src/services/pdfService';
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

// Add Image Icon
function AddImageIcon() {
  return (
    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 3H15M12 3V21M3 9H21"
        stroke="#FF3B30"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Gallery Picker Icon
function GalleryIcon() {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 16L8.58579 11.4142C9.36684 10.6332 10.6332 10.6332 11.4142 11.4142L16 16M14 14L15.5858 12.4142C16.3668 11.6332 17.6332 11.6332 18.4142 12.4142L20 14M14 8H14.01M20 20H4C2.89543 20 2 19.1046 2 18V6C2 4.89543 2.89543 4 4 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20Z"
        stroke={color || "#fff"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type PositionPreset = 'top' | 'center' | 'bottom';

export default function AddImageScreen() {
  const activeTheme = useColorScheme();
  const isDark = activeTheme === 'dark';
  const textColor = isDark ? '#ffffff' : '#1C1C1E';

  const router = useRouter();
  const [file, setFile] = useState<{ name: string; uri: string; size?: number } | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Selected Image
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Form Inputs
  const [targetPage, setTargetPage] = useState<string>('1');
  const [position, setPosition] = useState<PositionPreset>('center');
  const [imgSizePreset, setImgSizePreset] = useState<'small' | 'medium' | 'large'>('medium');

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

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Permission to access photos is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
      setOutputUri(null);
    }
  };

  const handleApplyImage = async () => {
    if (!file) return;
    if (!imageUri) {
      Alert.alert('Validation Error', 'Please select an image to add.');
      return;
    }

    const pageIndex = parseInt(targetPage) - 1;
    if (isNaN(pageIndex) || pageIndex < 0 || pageIndex >= pageCount) {
      Alert.alert('Validation Error', `Please enter a valid page number between 1 and ${pageCount}.`);
      return;
    }

    setProcessing(true);
    try {
      // 1. Transcode image to JPEG first (iOS gallery items could be HEIC or PNG)
      // Standardize size to avoid giant embeds
      const resized = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 500 } }],
        { format: ImageManipulator.SaveFormat.JPEG, compress: 0.85 }
      );

      // Width and Height of layout draw specifications
      let w = 200;
      let h = 200;
      if (imgSizePreset === 'small') {
        w = 120;
        h = 120;
      } else if (imgSizePreset === 'large') {
        w = 320;
        h = 320;
      }

      // Preserve aspect ratio if possible, otherwise fit in square
      if (resized.width && resized.height) {
        const ratio = resized.height / resized.width;
        h = Math.round(w * ratio);
      }

      // Coordinates mapping presets
      let x = 50;
      let y = 300; // center
      if (position === 'top') {
        y = 650;
      } else if (position === 'bottom') {
        y = 60;
      }

      if (position === 'center') {
        x = 100;
      }

      // 2. Call PDF Service
      const uri = await addImageToPDF(file.uri, resized.uri, {
        pageIndex,
        x,
        y,
        width: w,
        height: h,
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
          name: `${baseName}_with_image.pdf`,
          size,
          fileType: 'pdf',
          createdAt: now,
          modifiedAt: now,
          isFavorite: false,
        };
        await useFilesStore.getState().addFile(newFile);
      }

      Alert.alert('Success', 'Image added successfully to PDF!');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to embed image');
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
          Add Image
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
            Insert photographs, logos, stamps, or graphic annotations onto specific pages of your PDF document.
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
                  Pages available: {pageCount} · PDF
                </Text>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#FF3B30" className="my-10" />
            ) : (
              <View className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-5 mb-5">
                
                {/* 1. Pick Image Section */}
                <Text className="text-xs font-black uppercase text-[#8E8E93] dark:text-[#9C9CA3] tracking-wider mb-2.5 px-1">
                  Choose Image to Overlay
                </Text>
                
                {!imageUri ? (
                  <Pressable
                    onPress={pickImage}
                    className="w-full bg-white dark:bg-[#0A0A0A] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl py-4 flex-row items-center justify-center mb-5 active:bg-[#161618]"
                  >
                    <GalleryIcon />
                    <Text className="text-[#1C1C1E] dark:text-white font-bold text-sm ml-2">
                      Choose Photo
                    </Text>
                  </Pressable>
                ) : (
                  <View className="mb-5 relative w-full aspect-[4/3] bg-white dark:bg-[#0A0A0A] rounded-xl overflow-hidden border border-[#E5E5EA] dark:border-[#2C2C2E] items-center justify-center">
                    <Image source={{ uri: imageUri }} className="w-full h-full" resizeMode="contain" />
                    <Pressable
                      onPress={pickImage}
                      className="absolute bottom-3 right-3 bg-black/75 px-4 py-2 rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E]"
                    >
                      <Text className="text-[#1C1C1E] dark:text-white font-bold text-xs">Change Photo</Text>
                    </Pressable>
                  </View>
                )}

                <View className="flex-row gap-4 mb-5">
                  {/* Page Select */}
                  <View className="flex-1">
                    <Text className="text-xs font-black uppercase text-[#8E8E93] dark:text-[#9C9CA3] tracking-wider mb-2.5 px-1">
                      Target Page
                    </Text>
                    <TextInput
                      value={targetPage}
                      onChangeText={setTargetPage}
                      placeholder="Page num"
                      placeholderTextColor="#5C5C61"
                      keyboardAppearance="dark"
                      keyboardType="number-pad"
                      className="bg-white dark:bg-[#0A0A0A] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl px-4 py-3.5 text-[#1C1C1E] dark:text-white font-semibold text-sm focus:border-[#FF3B30]"
                    />
                  </View>

                  {/* Size Preset Selector */}
                  <View className="flex-1">
                    <Text className="text-xs font-black uppercase text-[#8E8E93] dark:text-[#9C9CA3] tracking-wider mb-2.5 px-1">
                      Display Size
                    </Text>
                    <View className="flex-row bg-white dark:bg-[#0A0A0A] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl overflow-hidden justify-around items-center h-12">
                      {(['small', 'medium', 'large'] as const).map((sz) => (
                        <Pressable
                          key={sz}
                          onPress={() => setImgSizePreset(sz)}
                          className={`flex-1 h-full items-center justify-center ${
                            imgSizePreset === sz ? 'bg-[#FF3B30]' : 'active:bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-transparent'
                          }`}
                        >
                          <Text
                            className={`font-black text-[10px] uppercase ${
                              imgSizePreset === sz ? 'text-white' : 'text-[#8E8E93] dark:text-[#9C9CA3]'
                            }`}
                          >
                            {sz === 'small' ? 'S' : sz === 'medium' ? 'M' : 'L'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Position Preset selector */}
                <Text className="text-xs font-black uppercase text-[#8E8E93] dark:text-[#9C9CA3] tracking-wider mb-2.5 px-1">
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
                          : 'bg-white dark:bg-[#0A0A0A] border-[#E5E5EA] dark:border-[#2C2C2E]'
                      }`}
                    >
                      <Text
                        className={`font-black text-xs uppercase ${
                          position === pos ? 'text-white' : 'text-[#8E8E93] dark:text-[#9C9CA3]'
                        }`}
                      >
                        {pos}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Action buttons */}
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
                    onPress={handleApplyImage}
                    disabled={processing || !imageUri}
                    className={`flex-[2] py-3.5 rounded-xl items-center justify-center ${
                      !imageUri ? 'bg-[#FF3B30]/40 opacity-55' : 'bg-[#FF3B30] active:opacity-90'
                    }`}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="text-white font-bold text-sm">
                        Embed Image
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {/* Success Sharing Banner */}
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
                    Image Embedded Saved!
                  </Text>
                </View>
                <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-xs mb-5 px-1 leading-relaxed">
                  Your PDF file has been saved with the image embedded.
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
