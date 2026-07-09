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

import { getPDFMetadata, updatePDFMetadata } from '@/src/services/pdfService';
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

// Metadata Info Icon
function MetadataIcon() {
  return (
    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 17H15M9 13H15M9 9H13M19 12V16.2C19 17.8802 19 18.7202 18.673 19.362C18.3854 19.9265 17.9265 20.3854 17.362 20.673C16.7202 21 15.8802 21 14.2 21H9.8C8.11984 21 7.27976 21 6.63803 20.673C6.07347 20.3854 5.6146 19.9265 5.32698 19.362C5 18.7202 5 17.8802 5 16.2V7.8C5 6.11984 5 5.27976 5.32698 4.63803C5.6146 4.07347 6.07347 3.6146 6.63803 3.32698C7.27976 3 8.11984 3 9.8 3H12M19 12L12 12M19 12L15 8"
        stroke="#FF3B30"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function MetadataViewerScreen() {
  const router = useRouter();
  const [file, setFile] = useState<{ name: string; uri: string } | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // File details & metadata states
  const [fileSize, setFileSize] = useState<number>(0);
  const [pageCount, setPageCount] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [subject, setSubject] = useState('');
  const [creator, setCreator] = useState('');
  const [producer, setProducer] = useState('');

  const [outputUri, setOutputUri] = useState<string | null>(null);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled && result.assets?.[0]) {
      setFile({ name: result.assets[0].name, uri: result.assets[0].uri });
      setOutputUri(null);
      setThumbnailUri(null);
      setLoading(true);

      try {
        const meta = await getPDFMetadata(result.assets[0].uri);
        setFileSize(meta.fileSize);
        setPageCount(meta.pageCount);
        setTitle(meta.title);
        setAuthor(meta.author);
        setSubject(meta.subject);
        setCreator(meta.creator);
        setProducer(meta.producer);
        
        const thumb = await PdfThumbnail.generate(result.assets[0].uri, 1);
        if (thumb?.uri) {
          setThumbnailUri(thumb.uri);
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to retrieve metadata details.');
        setFile(null);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveMetadata = async () => {
    if (!file) return;

    setProcessing(true);
    try {
      const uri = await updatePDFMetadata(file.uri, {
        title,
        author,
        subject,
        creator,
        producer,
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
          name: `${baseName}_metadata.pdf`,
          size,
          fileType: 'pdf',
          createdAt: now,
          modifiedAt: now,
          isFavorite: false,
        };
        await useFilesStore.getState().addFile(newFile);
      }

      Alert.alert('Success', 'PDF metadata updated successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to update metadata');
    } finally {
      setProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
          Metadata Editor
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
            View and modify the internal metadata attributes of any PDF document, such as author names, titles, creators, or index keywords.
          </Text>

          {/* Form layout */}
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
                      Size: {formatSize(fileSize)} · Pages: {pageCount} · PDF
                    </Text>
                  </View>
                </View>

                {/* Inputs Forms */}
                <View className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-5 mb-5">
                  <Text className="text-xs font-black uppercase text-[#9C9CA3] tracking-wider mb-2 px-1">
                    Document Title
                  </Text>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Enter document title"
                    placeholderTextColor="#5C5C61"
                    keyboardAppearance="dark"
                    className="w-full bg-[#0A0A0A] border border-[#2C2C2E] rounded-xl px-4 py-3.5 text-white font-semibold text-sm focus:border-[#FF3B30] mb-4"
                  />

                  <Text className="text-xs font-black uppercase text-[#9C9CA3] tracking-wider mb-2 px-1">
                    Author
                  </Text>
                  <TextInput
                    value={author}
                    onChangeText={setAuthor}
                    placeholder="Enter author's name"
                    placeholderTextColor="#5C5C61"
                    keyboardAppearance="dark"
                    className="w-full bg-[#0A0A0A] border border-[#2C2C2E] rounded-xl px-4 py-3.5 text-white font-semibold text-sm focus:border-[#FF3B30] mb-4"
                  />

                  <Text className="text-xs font-black uppercase text-[#9C9CA3] tracking-wider mb-2 px-1">
                    Subject
                  </Text>
                  <TextInput
                    value={subject}
                    onChangeText={setSubject}
                    placeholder="Enter document subject"
                    placeholderTextColor="#5C5C61"
                    keyboardAppearance="dark"
                    className="w-full bg-[#0A0A0A] border border-[#2C2C2E] rounded-xl px-4 py-3.5 text-white font-semibold text-sm focus:border-[#FF3B30] mb-4"
                  />

                  <Text className="text-xs font-black uppercase text-[#9C9CA3] tracking-wider mb-2 px-1">
                    Creator
                  </Text>
                  <TextInput
                    value={creator}
                    onChangeText={setCreator}
                    placeholder="e.g. FreePDF App"
                    placeholderTextColor="#5C5C61"
                    keyboardAppearance="dark"
                    className="w-full bg-[#0A0A0A] border border-[#2C2C2E] rounded-xl px-4 py-3.5 text-white font-semibold text-sm focus:border-[#FF3B30] mb-4"
                  />

                  <Text className="text-xs font-black uppercase text-[#9C9CA3] tracking-wider mb-2 px-1">
                    Producer
                  </Text>
                  <TextInput
                    value={producer}
                    onChangeText={setProducer}
                    placeholder="e.g. pdf-lib engine"
                    placeholderTextColor="#5C5C61"
                    keyboardAppearance="dark"
                    className="w-full bg-[#0A0A0A] border border-[#2C2C2E] rounded-xl px-4 py-3.5 text-white font-semibold text-sm focus:border-[#FF3B30] mb-6"
                  />

                  {/* Actions */}
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
                      onPress={handleSaveMetadata}
                      disabled={processing}
                      className="flex-[2] bg-[#FF3B30] py-3.5 rounded-xl items-center justify-center active:opacity-90"
                    >
                      {processing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text className="text-white font-bold text-sm">
                          Save Properties
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>

                {/* Success sharing block */}
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
                        Metadata Saved!
                      </Text>
                    </View>
                    <Text className="text-[#9C9CA3] text-xs mb-5 px-1 leading-relaxed">
                      Your document has been re-saved with the updated metadata properties.
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
              </>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
