import { Buffer } from 'buffer';
(globalThis as Record<string, unknown>).Buffer = Buffer;

import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { PDFDocument } from 'pdf-lib';

import { useFilesStore } from '@/src/stores/filesStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { savePDF } from '@/src/services/pdfService';
import type { DeviceFile } from '@/src/types';
import { usePostHog } from 'posthog-react-native';
import Svg, { Path } from 'react-native-svg';
import {
    Gesture,
    GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { Palette } from '@/constants/Colors';
import { HugeIcon } from '@/components/HugeIcon';

// Interface for uniquely identifying selected images
interface ImageItem {
  id: string;
  uri: string;
}

// Icons
export function HugeiconsArrowLeft01() {
    return (
        <Svg width="28" height="28" viewBox="0 0 24 24">
            <Path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 6s-6 4.419-6 6s6 6 6 6" />
        </Svg>
    );
}

function ImageIcon() {
  return (
    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 10C9.55228 10 10 9.55228 10 9C10 8.44772 9.55228 8 9 8C8.44772 8 8 8.44772 8 9C8 9.55228 8.44772 10 9 10Z"
        stroke="#5C5C61"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2.75 18L9 11.75L14 16.75L21.25 9.5"
        stroke="#5C5C61"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 3H3C1.89543 3 1 3.89543 1 5V19C1 20.1046 1.89543 21 3 21H21C22.1046 21 23 20.1046 23 19V5C23 3.89543 22.1046 3 21 3Z"
        stroke="#5C5C61"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Layout Constants (match app/file-viewer/pages.tsx)
const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = 3;
const GRID_PADDING = 16;
const GRID_GAP = 10;
const CELL_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const CELL_HEIGHT = CELL_WIDTH * 1.35;

// Draggable Cell
function DraggableImageCell({
    id,
    uri,
    index,
    col,
    row,
    onDragSwap,
    isSelected,
    isSelectMode,
    onToggleSelect,
}: {
    id: string;
    uri: string;
    index: number;
    col: number;
    row: number;
    onDragSwap: (fromId: string, targetIndex: number) => void;
    isSelected: boolean;
    isSelectMode: boolean;
    onToggleSelect: (id: string) => void;
}) {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);
    const isDragging = useSharedValue(false);
    const zIndex = useSharedValue(1);

    const baseX = col * (CELL_WIDTH + GRID_GAP);
    const baseY = row * (CELL_HEIGHT + GRID_GAP);

    const panGesture = Gesture.Pan()
        .enabled(!isSelectMode)
        .activateAfterLongPress(200)
        .onStart(() => {
            isDragging.value = true;
            scale.value = withTiming(1.08, { duration: 150 });
            zIndex.value = 999;
        })
        .onUpdate((e) => {
            translateX.value = e.translationX;
            translateY.value = e.translationY;
        })
        .onEnd((e) => {
            const landedX = baseX + e.translationX;
            const landedY = baseY + e.translationY;

            const targetCol = Math.round(landedX / (CELL_WIDTH + GRID_GAP));
            const targetRow = Math.round(landedY / (CELL_HEIGHT + GRID_GAP));

            translateX.value = withTiming(0, { duration: 200 });
            translateY.value = withTiming(0, { duration: 200 });
            scale.value = withTiming(1, { duration: 150 });
            isDragging.value = false;
            zIndex.value = 1;

            const targetIndex = targetRow * NUM_COLUMNS + targetCol;

            if (targetIndex >= 0 && targetIndex !== index) {
                runOnJS(onDragSwap)(id, targetIndex);
            }
        });

    const composed = Gesture.Simultaneous(panGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
        zIndex: zIndex.value,
        opacity: isDragging.value ? 0.9 : 1,
    }));

    const handlePress = () => {
        if (isSelectMode) {
            onToggleSelect(id);
        }
    };

    return (
        <GestureDetector gesture={composed}>
            <Animated.View
                style={[
                    {
                        width: CELL_WIDTH,
                        marginRight: (col < NUM_COLUMNS - 1) ? GRID_GAP : 0,
                        marginBottom: GRID_GAP,
                    },
                    animatedStyle,
                ]}
            >
                <Pressable
                    onPress={handlePress}
                    className="rounded-lg overflow-hidden border-2 active:border-[#FF3B30]"
                    style={{
                        borderColor: isSelected ? '#FF3B30' : 'transparent',
                    }}
                >
                    <View
                        className="rounded-lg overflow-hidden relative"
                        style={{
                            width: CELL_WIDTH,
                            height: CELL_HEIGHT,
                            backgroundColor: '#1C1C1E',
                        }}
                    >
                        <Image
                            source={{ uri }}
                            style={{
                                width: '100%',
                                height: '100%',
                            }}
                            resizeMode="cover"
                        />

                        {/* Selection checkmark indicator */}
                        {isSelectMode && (
                            <View
                                style={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    width: 22,
                                    height: 22,
                                    borderRadius: 11,
                                    borderWidth: 1.5,
                                    borderColor: isSelected ? '#FF3B30' : '#9C9CA3',
                                    backgroundColor: isSelected ? '#FF3B30' : 'rgba(0,0,0,0.5)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 10,
                                }}
                            >
                                {isSelected && (
                                    <Svg width="12" height="12" viewBox="0 0 24 24">
                                        <Path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="m5 14l3.5 3.5L19 6.5" />
                                    </Svg>
                                )}
                            </View>
                        )}

                        {/* Page number overlay */}
                        <View
                            style={{
                                position: 'absolute',
                                bottom: 5,
                                right: 5,
                                backgroundColor: 'rgba(0,0,0,0.65)',
                                borderRadius: 4,
                                paddingHorizontal: 5,
                                paddingVertical: 2,
                            }}
                        >
                            <Text className="text-white text-[10px] font-bold">
                                {index + 1}
                            </Text>
                        </View>
                    </View>
                </Pressable>
            </Animated.View>
        </GestureDetector>
    );
}

export default function ImagesToPDFScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const params = useLocalSearchParams<{ images?: string }>();
  const addFile = useFilesStore((s) => s.addFile);

  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [filename, setFilename] = useState('');
  const [converting, setConverting] = useState(false);
  const [progressText, setProgressText] = useState('');

  // Selection states (match app/file-viewer/pages.tsx)
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Load initial images from router params
  useEffect(() => {
    if (params.images) {
      try {
        const parsed = JSON.parse(params.images) as string[];
        if (Array.isArray(parsed)) {
          const items: ImageItem[] = parsed.map((uri, i) => ({
            id: `img_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
            uri,
          }));
          setImageItems(items);
        }
      } catch (err) {
        console.error('Failed to parse initial images:', err);
      }
    }
    // Set default filename
    const rand = Math.floor(1000 + Math.random() * 9000);
    setFilename(`PDF_Export_${rand}`);
  }, [params.images]);

  // Gallery Picker to append more images
  const pickMoreImages = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Permission to access gallery is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newItems: ImageItem[] = result.assets.map((asset, i) => ({
          id: `img_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
          uri: asset.uri,
        }));
        setImageItems((prev) => [...prev, ...newItems]);
      }
    } catch (err) {
      console.error('Failed to pick more images:', err);
      Alert.alert('Error', 'Failed to select images.');
    }
  };

  // Reordering handler via dragging swap
  const handleDragSwap = useCallback((fromId: string, targetIndex: number) => {
    setImageItems((prev) => {
      const copy = [...prev];
      const currentIndex = copy.findIndex((item) => item.id === fromId);
      if (currentIndex === -1) return prev;

      const item = copy[currentIndex];
      copy.splice(currentIndex, 1);
      const insertAt = Math.min(targetIndex, copy.length);
      copy.splice(insertAt, 0, item);
      return copy;
    });
  }, []);

  // Selection handlers
  const onToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === imageItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(imageItems.map((item) => item.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete the ${selectedIds.size} selected image(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setImageItems((prev) => prev.filter((item) => !selectedIds.has(item.id)));
            setSelectedIds(new Set());
            setIsSelectMode(false);
          },
        },
      ]
    );
  };

  // Compilation process
  const handleConvertToPDF = async () => {
    if (imageItems.length === 0) {
      Alert.alert('No Images', 'Please add at least one image to convert.');
      return;
    }

    const cleanFilename = filename.trim().replace(/\.pdf$/i, '');
    if (!cleanFilename) {
      Alert.alert('Invalid Name', 'Please enter a valid filename.');
      return;
    }

    setConverting(true);
    setProgressText('Initializing PDF compilation...');

    try {
      const pdfDoc = await PDFDocument.create();
      const qualitySetting = useSettingsStore.getState().defaultCompressionQuality; // e.g. 80
      const compressionFactor = qualitySetting / 100; // e.g. 0.8

      for (let i = 0; i < imageItems.length; i++) {
        setProgressText(`Processing image ${i + 1} of ${imageItems.length}...`);

        const uri = imageItems[i].uri;
        
        // 1. Convert image to JPEG and get standard dimensions
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [],
          { format: ImageManipulator.SaveFormat.JPEG, compress: Math.min(1.0, compressionFactor + 0.1) }
        );

        let finalUri = manipResult.uri;
        let finalWidth = manipResult.width;
        let finalHeight = manipResult.height;

        // 2. Downscale if excessively large (max 1600px dimension)
        if (finalWidth > 1600 || finalHeight > 1600) {
          const isLandscape = finalWidth > finalHeight;
          const resizeActions = isLandscape
            ? [{ resize: { width: 1600 } }]
            : [{ resize: { height: 1600 } }];

          const resizeResult = await ImageManipulator.manipulateAsync(
            finalUri,
            resizeActions,
            { format: ImageManipulator.SaveFormat.JPEG, compress: compressionFactor }
          );

          finalUri = resizeResult.uri;
          finalWidth = resizeResult.width;
          finalHeight = resizeResult.height;
        }

        // 3. Read image as Base64
        const base64 = await FileSystem.readAsStringAsync(finalUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // 4. Embed in PDF
        const imageBytes = Uint8Array.from(Buffer.from(base64, 'base64'));
        const embeddedImage = await pdfDoc.embedJpg(imageBytes);

        // 5. Add page sized exactly to image and draw
        const page = pdfDoc.addPage([finalWidth, finalHeight]);
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: finalWidth,
          height: finalHeight,
        });

        // 6. Clean up temp manipulated files
        try {
          await FileSystem.deleteAsync(finalUri, { idempotent: true });
          if (finalUri !== manipResult.uri) {
            await FileSystem.deleteAsync(manipResult.uri, { idempotent: true });
          }
        } catch {
          // Silent cleanup failure
        }
      }

      setProgressText('Saving PDF document...');
      
      // Save PDF via existing helper
      const savedPath = await savePDF(pdfDoc, cleanFilename);

      // Get final file size
      const fileInfo = await FileSystem.getInfoAsync(savedPath);
      const size = (fileInfo as any).size || 0;

      // Register file in local DB / state store
      const now = new Date().toISOString();
      const newFile: DeviceFile = {
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        uri: savedPath,
        name: `${cleanFilename}.pdf`,
        size,
        fileType: 'pdf',
        createdAt: now,
        modifiedAt: now,
        isFavorite: false,
      };

      await addFile(newFile);
      posthog.capture('images_converted_to_pdf', {
        image_count: imageItems.length,
        file_size: size,
      });

      setConverting(false);
      router.push(`/file-viewer/${newFile.id}` as any);

    } catch (err: any) {
      console.error('PDF Conversion error:', err);
      Alert.alert('Error', err.message || 'Failed to convert images to PDF.');
      setConverting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0A]" edges={['top']}>
      {/* Hide default navigation bar, we render a custom matching layout header */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* ===== Header (Matches app/file-viewer/pages.tsx) ===== */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-[#2C2C2E]">
          <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center"
          >
              <HugeiconsArrowLeft01 />
          </Pressable>

          <Text
              style={{ fontFamily: 'RocaTwoBold' }}
              className="flex-1 text-base text-white text-xl text-center mx-2"
              numberOfLines={1}
          >
              Images to PDF
          </Text>

          <Pressable
              onPress={() => {
                  setIsSelectMode(!isSelectMode);
                  setSelectedIds(new Set());
              }}
              className="px-3 py-1"
              disabled={imageItems.length === 0}
              style={{ opacity: imageItems.length === 0 ? 0.4 : 1 }}
          >
              <Text style={{ color: Palette.accent }} className="font-bold text-sm">
                  {isSelectMode ? 'Cancel' : 'Select'}
              </Text>
          </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {imageItems.length === 0 ? (
          /* Empty State */
          <View className="flex-1 items-center justify-center px-6">
            <View className="w-20 h-20 bg-[#1C1C1E] rounded-3xl items-center justify-center mb-6">
              <ImageIcon />
            </View>
            <Text className="text-white text-xl font-black text-center mb-2">
              No images selected
            </Text>
            <Text className="text-[#9C9CA3] text-center mb-8 px-6 font-medium text-xs">
              Select one or more images from your photo gallery to compile into a single PDF document.
            </Text>
            <Pressable
              onPress={pickMoreImages}
              className="bg-[#FF3B30] active:opacity-80 px-8 py-4 rounded-2xl flex-row items-center gap-2"
            >
              <Text className="text-white font-bold text-base">
                Select Images
              </Text>
            </Pressable>
          </View>
        ) : (
          /* Images List and Config */
          <View className="flex-1">
            {/* ===== Drag Hint ===== */}
            {!isSelectMode && (
                <View className="px-4 py-2 mt-1">
                    <Text className="text-[#9C9CA3] text-xs font-bold text-center">
                        Long-press a page to drag and reorder
                    </Text>
                </View>
            )}

            {/* ===== Selection Actions Sub-toolbar ===== */}
            {isSelectMode && (
                <View className="flex-row justify-between items-center bg-[#161618] border-b border-[#2C2C2E] px-6 py-3">
                    <Pressable
                        onPress={handleToggleSelectAll}
                        className="active:opacity-80 py-2 pr-4"
                    >
                        <Text className="text-white text-xs font-bold">
                            {selectedIds.size === imageItems.length ? 'Deselect All' : 'Select All'}
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={handleDeleteSelected}
                        disabled={selectedIds.size === 0}
                        className="px-4 py-2 bg-[#FF3B30] rounded-lg active:opacity-80 disabled:opacity-40"
                    >
                        <Text className="text-white text-xs font-bold">Delete</Text>
                    </Pressable>
                </View>
            )}

            {/* Grid display (replicates app/file-viewer/pages.tsx scroll view & layout) */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingHorizontal: GRID_PADDING,
                    paddingTop: 8,
                    paddingBottom: 40,
                }}
                showsVerticalScrollIndicator={false}
            >
                <View className="flex-row flex-wrap">
                    {imageItems.map((item, index) => {
                        const col = index % NUM_COLUMNS;
                        const row = Math.floor(index / NUM_COLUMNS);

                        return (
                            <DraggableImageCell
                                key={item.id}
                                id={item.id}
                                uri={item.uri}
                                index={index}
                                col={col}
                                row={row}
                                onDragSwap={handleDragSwap}
                                isSelected={selectedIds.has(item.id)}
                                isSelectMode={isSelectMode}
                                onToggleSelect={onToggleSelect}
                            />
                        );
                    })}
                </View>
            </ScrollView>

            {/* Reset & Save Footer (Bottom Bar) */}
            <View className="border-t border-[#2C2C2E] px-4 pt-4 pb-12 gap-4 bg-[#0A0A0A]">
                {/* Filename Input */}
                <View>
                    <Text className="text-[#9C9CA3] text-xs font-bold uppercase tracking-wider mb-2">
                        PDF File Name
                    </Text>
                    <TextInput
                        value={filename}
                        onChangeText={setFilename}
                        placeholder="Enter file name"
                        placeholderTextColor="#5C5C61"
                        autoCapitalize="none"
                        autoCorrect={false}
                        className="bg-[#1C1C1E] border border-[#2C2C2E] text-white rounded-2xl px-4 py-3 text-base font-semibold focus:border-[#FF3B30]"
                    />
                </View>

                {/* Bottom Actions */}
                <View className="flex-row gap-4">
                    <Pressable
                        onPress={pickMoreImages}
                        className="flex-1 bg-[#1C1C1E] py-4 rounded-2xl items-center active:opacity-80 border border-[#2C2C2E]"
                    >
                        <Text className="text-white text-base font-bold">Add Images</Text>
                    </Pressable>

                    <Pressable
                        onPress={handleConvertToPDF}
                        disabled={converting}
                        className="flex-[2] bg-[#FF3B30] py-4 rounded-2xl items-center active:opacity-85"
                    >
                        {converting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text className="text-white text-base font-bold">Convert to PDF</Text>
                        )}
                    </Pressable>
                </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Loading Overlay */}
      {converting && (
        <View className="absolute inset-0 bg-black/80 items-center justify-center z-50 px-8">
          <ActivityIndicator size="large" color="#FF3B30" />
          <Text className="text-white text-lg font-black mt-6 text-center">
            Generating PDF File
          </Text>
          <Text className="text-[#9C9CA3] text-xs font-semibold mt-2 text-center">
            {progressText}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
