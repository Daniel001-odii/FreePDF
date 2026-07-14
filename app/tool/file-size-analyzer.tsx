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
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import PdfThumbnail from 'react-native-pdf-thumbnail';

import { getPDFMetadata } from '@/src/services/pdfService';

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

// Chart/Analyzer Icon
function ChartIcon() {
  return (
    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20H20M4 16L9 11L14 15L20 8"
        stroke="#FF3B30"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function FileSizeAnalyzerScreen() {
  const activeTheme = useColorScheme();
  const isDark = activeTheme === 'dark';
  const textColor = isDark ? '#ffffff' : '#1C1C1E';

  const router = useRouter();
  const [file, setFile] = useState<{ name: string; uri: string } | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Stats
  const [fileSize, setFileSize] = useState<number>(0);
  const [pageCount, setPageCount] = useState<number>(0);
  const [hasMetadata, setHasMetadata] = useState(false);
  const [producerText, setProducerText] = useState('');

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (!result.canceled && result.assets?.[0]) {
      setFile({ name: result.assets[0].name, uri: result.assets[0].uri });
      setThumbnailUri(null);
      setLoading(true);

      try {
        const meta = await getPDFMetadata(result.assets[0].uri);
        setFileSize(meta.fileSize);
        setPageCount(meta.pageCount);
        setHasMetadata(!!(meta.title || meta.author || meta.subject));
        setProducerText(meta.producer || 'Unknown');
        
        const thumb = await PdfThumbnail.generate(result.assets[0].uri, 1);
        if (thumb?.uri) {
          setThumbnailUri(thumb.uri);
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to analyze PDF file.');
        setFile(null);
      } finally {
        setLoading(false);
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Diagnosis logic
  const getDiagnosis = () => {
    if (fileSize > 5 * 1024 * 1024) {
      return {
        title: 'Excessive Size Alert',
        color: '#FF3B30',
        desc: 'This file is very large. Compressing it will reduce the size significantly for email and sharing.',
        rating: 'Needs Urgent Action',
      };
    } else if (fileSize > 1 * 1024 * 1024) {
      return {
        title: 'Optimizable File Size',
        color: '#FF9500',
        desc: 'This file is moderately large. Standard compression will downscale image resolutions safely.',
        rating: 'Optimization Recommended',
      };
    }
    return {
      title: 'Healthy Size Status',
      color: '#34C759',
      desc: 'This PDF is compact and optimized. Share or upload it without any size limits.',
      rating: 'Perfect & Ready',
    };
  };

  const diag = getDiagnosis();

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
          Size Analyzer
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
            Inspect document elements and analyze space usage. Scan structures and retrieve diagnostic optimization opportunities.
          </Text>

          {/* Analyzer output */}
          <View>
            {loading ? (
              <ActivityIndicator size="large" color="#FF3B30" className="my-10" />
            ) : (
              <>
                {/* Document Details (Borderless with Thumbnail) */}
                <View className="flex-row items-center mb-6" style={{ gap: 12 }}>
                  <View
                    className="rounded-lg overflow-hidden items-center justify-center bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E]"
                    style={{ width: 56, height: 72 }}
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
                    <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-[10px] font-black uppercase tracking-wider">
                      Document Size
                    </Text>
                    <Text className="text-[#1C1C1E] dark:text-white text-3xl font-extrabold">
                      {formatSize(fileSize)}
                    </Text>
                    <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-xs font-semibold mt-0.5">
                      Pages: {pageCount} · Metadata: {hasMetadata ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </View>

                {/* Diagnostic Alert Box */}
                <View
                  className="rounded-2xl p-5 mb-5 border"
                  style={{
                    backgroundColor: `${diag.color}15`,
                    borderColor: `${diag.color}30`,
                  }}
                >
                  <Text
                    style={{ color: diag.color }}
                    className="text-base font-black uppercase tracking-wider mb-1"
                  >
                    {diag.title}
                  </Text>
                  <Text className="text-[#1C1C1E] dark:text-white text-xs font-semibold mb-2">
                    {diag.rating}
                  </Text>
                  <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-xs leading-relaxed">
                    {diag.desc}
                  </Text>
                </View>

                {/* Structure details */}
                <View className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-5 mb-6">
                  <Text className="text-[#1C1C1E] dark:text-white text-base font-bold mb-4">
                    PDF Structure Details
                  </Text>
                  
                  <View className="flex-row justify-between mb-3.5 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#0A0A0A]/60">
                    <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-xs font-bold">Document Engine</Text>
                    <Text className="text-[#1C1C1E] dark:text-white text-xs font-bold" numberOfLines={1}>{producerText}</Text>
                  </View>

                  <View className="flex-row justify-between mb-3.5 pb-3 border-b border-[#E5E5EA] dark:border-[#2C2C2E] bg-white dark:bg-[#0A0A0A]/60">
                    <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-xs font-bold">Metadata Overhead</Text>
                    <Text className="text-[#1C1C1E] dark:text-white text-xs font-bold">{hasMetadata ? 'Minimal (~2 KB)' : 'None'}</Text>
                  </View>

                  <View className="flex-row justify-between">
                    <Text className="text-[#8E8E93] dark:text-[#9C9CA3] text-xs font-bold">Average Size Per Page</Text>
                    <Text className="text-[#1C1C1E] dark:text-white text-xs font-bold">
                      {pageCount > 0 ? formatSize(Math.floor(fileSize / pageCount)) : 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Quick actions shortcuts */}
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={pickFile}
                    className="flex-1 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] py-4 rounded-xl items-center active:bg-[#E5E5EA] dark:bg-[#2C2C2E]"
                  >
                    <Text className="text-[#1C1C1E] dark:text-white font-bold text-sm">
                      Change File
                    </Text>
                  </Pressable>

                  {fileSize > 1024 * 1024 ? (
                    <Pressable
                      onPress={() => router.push('/tool/compress-pdf')}
                      className="flex-[2] bg-[#FF3B30] py-4 rounded-xl items-center justify-center active:opacity-90"
                    >
                      <Text className="text-white font-extrabold text-sm">
                        Compress File
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => Sharing.shareAsync(file.uri)}
                      className="flex-[2] bg-[#FF3B30] py-4 rounded-xl items-center justify-center active:opacity-90"
                    >
                      <Text className="text-white font-extrabold text-sm">
                        Share Document
                      </Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
