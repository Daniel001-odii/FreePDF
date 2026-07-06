import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

import { HugeIcon } from '@/components/HugeIcon';
import { Palette } from '@/constants/Colors';
import { getFileById, insertFile } from '@/src/db/repository';
import { loadPDF, reorderPages, rotatePDFPages } from '@/src/services/pdfService';
import type { DeviceFile } from '@/src/types';
import {
    Gesture,
    GestureDetector,
} from 'react-native-gesture-handler';
import Pdf from 'react-native-pdf';
import PdfThumbnail from 'react-native-pdf-thumbnail';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

// -----------------------------------------------------------
// Inline SVG icons
// -----------------------------------------------------------

export function HugeiconsArrowLeft01() {
    return (
        <Svg width="28" height="28" viewBox="0 0 24 24">
            <Path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 6s-6 4.419-6 6s6 6 6 6" />
        </Svg>
    );
}

// -----------------------------------------------------------
// Constants
// -----------------------------------------------------------

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = 3;
const GRID_PADDING = 16;
const GRID_GAP = 10;
const CELL_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const CELL_HEIGHT = CELL_WIDTH * 1.35;

// -----------------------------------------------------------
// Draggable Page Cell
// -----------------------------------------------------------

function DraggablePageCell({
    page,
    thumbUri,
    isFailed,
    col,
    row,
    onDragSwap,
    isSelected,
    isSelectMode,
    onToggleSelect,
    rotation,
}: {
    page: number;
    thumbUri: string | undefined;
    isFailed: boolean;
    col: number;
    row: number;
    onDragSwap: (fromPage: number, toPage: number) => void;
    isSelected: boolean;
    isSelectMode: boolean;
    onToggleSelect: (page: number) => void;
    rotation: number;
}) {
    const router = useRouter();
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
            // Calculate where this cell landed in grid coordinates
            const landedX = baseX + e.translationX;
            const landedY = baseY + e.translationY;

            const targetCol = Math.round(landedX / (CELL_WIDTH + GRID_GAP));
            const targetRow = Math.round(landedY / (CELL_HEIGHT + GRID_GAP));

            translateX.value = withTiming(0, { duration: 200 });
            translateY.value = withTiming(0, { duration: 200 });
            scale.value = withTiming(1, { duration: 150 });
            isDragging.value = false;
            zIndex.value = 1;

            // Calculate the target page index in the flat list
            const targetIndex = targetRow * NUM_COLUMNS + targetCol;

            if (targetIndex >= 0 && targetIndex !== col + row * NUM_COLUMNS) {
                runOnJS(onDragSwap)(page, targetIndex);
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
            onToggleSelect(page);
        } else {
            router.back();
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
                        {thumbUri ? (
                            <Image
                                source={{ uri: thumbUri }}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    transform: [{ rotate: `${rotation}deg` }],
                                }}
                                resizeMode="cover"
                            />
                        ) : isFailed ? (
                            <View className="flex-1 items-center justify-center">
                                <HugeIcon name="recents" size={24} color={Palette.textMuted} />
                            </View>
                        ) : (
                            <View className="flex-1 items-center justify-center">
                                <ActivityIndicator size="small" color={Palette.textMuted} />
                            </View>
                        )}

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

                        {/* Page number overlay — bottom-right */}
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
                                {page}
                            </Text>
                        </View>
                    </View>
                </Pressable>
            </Animated.View>
        </GestureDetector>
    );
}

// -----------------------------------------------------------
// Pages Grid Screen
// -----------------------------------------------------------

export default function PagesScreen() {
    const router = useRouter();
    const { id } = useGlobalSearchParams<{ id: string }>();
    const [file, setFile] = useState<DeviceFile | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
    const [thumbQueue, setThumbQueue] = useState<number[]>([]);
    const [failedPages, setFailedPages] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const pdfRef = useRef<any>(null);
    const [saving, setSaving] = useState(false);

    // Pages order state (page numbers, modifiable by drag)
    const [pagesOrder, setPagesOrder] = useState<number[]>([]);

    // Selection & rotation states
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
    const [rotations, setRotations] = useState<Record<number, number>>({});

    // Load file metadata
    useEffect(() => {
        if (id) {
            getFileById(id).then((f) => {
                setFile(f);
                setLoading(false);
            }).catch(() => {
                setLoading(false);
            });
        }
    }, [id]);

    // We need a hidden Pdf component to get totalPages via onLoadComplete
    const handlePdfLoadComplete = (numberOfPages: number) => {
        setTotalPages(numberOfPages);
    };

    // Initialise pagesOrder when totalPages is known
    useEffect(() => {
        if (totalPages > 0 && pagesOrder.length === 0) {
            const order: number[] = [];
            for (let p = 1; p <= Math.min(totalPages, 100); p++) {
                order.push(p);
            }
            setPagesOrder(order);
        }
    }, [totalPages]);

    // Build thumbnail queue
    useEffect(() => {
        if (totalPages <= 0 || !file?.uri) return;

        const queue: number[] = [];
        for (let p = 1; p <= Math.min(totalPages, 100); p++) {
            if (!thumbnails[p] && !failedPages.has(p)) {
                queue.push(p);
            }
        }
        if (queue.length === 0) return;
        setThumbQueue(queue);
    }, [totalPages, file?.uri, thumbnails]);

    // Generate thumbnails sequentially
    useEffect(() => {
        if (thumbQueue.length === 0 || !file?.uri) return;

        let cancelled = false;
        const generateNext = async () => {
            const page = thumbQueue[0];
            if (page == null || cancelled) return;

            try {
                const result = await PdfThumbnail.generate(file.uri, page);
                if (!cancelled && result?.uri) {
                    setThumbnails((prev) => ({ ...prev, [page]: result.uri }));
                } else if (!cancelled) {
                    setFailedPages((prev) => new Set(prev).add(page));
                }
            } catch {
                setFailedPages((prev) => new Set(prev).add(page));
            }

            if (!cancelled) {
                setThumbQueue((prev) => prev.slice(1));
            }
        };

        generateNext();
        return () => { cancelled = true; };
    }, [thumbQueue, file?.uri]);

    const handleDragSwap = useCallback((fromPage: number, targetIndex: number) => {
        setPagesOrder((prev) => {
            const copy = [...prev];
            const currentIndex = copy.indexOf(fromPage);
            if (currentIndex === -1) return prev;

            // Remove from current position
            copy.splice(currentIndex, 1);
            // Insert at target (clamped)
            const insertAt = Math.min(targetIndex, copy.length);
            copy.splice(insertAt, 0, fromPage);
            return copy;
        });
    }, []);

    // Selection handlers
    const onToggleSelect = (page: number) => {
        setSelectedPages((prev) => {
            const next = new Set(prev);
            if (next.has(page)) {
                next.delete(page);
            } else {
                next.add(page);
            }
            return next;
        });
    };

    const handleToggleSelectAll = () => {
        if (selectedPages.size === pagesOrder.length) {
            setSelectedPages(new Set());
        } else {
            setSelectedPages(new Set(pagesOrder));
        }
    };

    const handleRotateSelected = () => {
        setRotations((prev) => {
            const next = { ...prev };
            selectedPages.forEach((p) => {
                next[p] = ((next[p] || 0) + 90) % 360;
            });
            return next;
        });
    };

    const handleDeleteSelected = () => {
        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete the ${selectedPages.size} selected page(s)?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        setPagesOrder((prev) => prev.filter((p) => !selectedPages.has(p)));
                        setSelectedPages(new Set());
                        setIsSelectMode(false);
                    },
                },
            ]
        );
    };

    const handleReset = () => {
        const order: number[] = [];
        for (let p = 1; p <= totalPages; p++) {
            order.push(p);
        }
        setPagesOrder(order);
        setRotations({});
        setSelectedPages(new Set());
        setIsSelectMode(false);
    };

    const handleSave = async () => {
        if (!file || saving) return;
        setSaving(true);

        try {
            // 1. Reorder / delete pages
            const zeroBasedOrder = pagesOrder.map((p) => p - 1);
            let finalUri = await reorderPages(file.uri, zeroBasedOrder);

            // 2. Calculate and apply absolute rotations
            const doc = await loadPDF(file.uri);
            const finalRotations = pagesOrder.map((page, index) => {
                const originalPage = doc.getPage(page - 1);
                const originalRotation = originalPage.getRotation().angle || 0;
                const visualRotation = rotations[page] || 0;
                const finalAngle = ((originalRotation + visualRotation) % 360) as 0 | 90 | 180 | 270;
                return { pageIndex: index, angle: finalAngle };
            }).filter((r) => r.angle !== 0);

            if (finalRotations.length > 0) {
                finalUri = await rotatePDFPages(finalUri, finalRotations);
            }

            // Generate a new filename
            const dotIndex = file.name.lastIndexOf('.');
            const baseName = dotIndex > 0 ? file.name.slice(0, dotIndex) : file.name;
            const ext = dotIndex > 0 ? file.name.slice(dotIndex) : '.pdf';
            const newName = `${baseName}_modified${ext}`;

            // Save as new file entry
            const newFile: DeviceFile = {
                ...file,
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                uri: finalUri,
                name: newName,
                size: 0,
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString(),
                thumbnail: undefined,
            };
            await insertFile(newFile);

            Alert.alert('Saved', `Modified PDF saved as "${newName}".`, [
                {
                    text: 'OK',
                    onPress: () => {
                        router.back();
                    },
                },
            ]);
        } catch (err) {
            Alert.alert('Error', 'Could not save modified PDF.');
            console.error('Save error:', err);
        } finally {
            setSaving(false);
        }
    };

    // ---------- Loading ----------
    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-[#0A0A0A]" edges={['top']}>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={Palette.accent} />
                </View>
            </SafeAreaView>
        );
    }

    // ---------- Not Found ----------
    if (!file) {
        return (
            <SafeAreaView className="flex-1 bg-[#0A0A0A]" edges={['top']}>
                <View className="flex-1 items-center justify-center px-6">
                    <HugeIcon name="recents" size={48} color={Palette.textMuted} />
                    <Text className="text-[#9C9CA3] mt-4 text-base font-bold text-center">
                        File not found.
                    </Text>
                    <Pressable
                        onPress={() => router.back()}
                        className="mt-6 bg-[#1C1C1E] px-6 py-3 rounded-xl"
                    >
                        <Text className="text-white font-bold">Go Back</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#0A0A0A]" edges={['top']}>
            {/* ===== Header ===== */}
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-[#2C2C2E]">
                <Pressable
                    onPress={() => router.back()}
                    className="w-10 h-10 items-center justify-center"
                >
                    <HugeiconsArrowLeft01 />
                </Pressable>

                <Text
                    className="flex-1 text-base font-extrabold text-white text-xl capitalize text-center mx-2"
                    numberOfLines={1}
                >
                    {file.name}
                </Text>

                <Pressable
                    onPress={() => {
                        setIsSelectMode(!isSelectMode);
                        setSelectedPages(new Set());
                    }}
                    className="px-3 py-1"
                >
                    <Text style={{ color: Palette.accent }} className="font-bold text-sm">
                        {isSelectMode ? 'Cancel' : 'Select'}
                    </Text>
                </Pressable>
            </View>

            {/* ===== Hidden Pdf for totalPages ===== */}
            {file.fileType === 'pdf' && totalPages === 0 && (
                <View style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}>
                    <Pdf
                        ref={pdfRef}
                        source={{ uri: file.uri, cache: true }}
                        onLoadComplete={handlePdfLoadComplete}
                        onError={() => { }}
                        style={{ width: 1, height: 1 }}
                    />
                </View>
            )}

            {/* ===== Drag Hint ===== */}
            {pagesOrder.length > 0 && !isSelectMode && (
                <View className="px-4 py-2">
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
                            {selectedPages.size === pagesOrder.length ? 'Deselect All' : 'Select All'}
                        </Text>
                    </Pressable>

                    <View className="flex-row gap-3">
                        <Pressable
                            onPress={handleRotateSelected}
                            disabled={selectedPages.size === 0}
                            className="px-4 py-2 bg-[#1C1C1E] border border-[#2C2C2E] rounded-lg active:opacity-80 disabled:opacity-40"
                        >
                            <Text className="text-white text-xs font-bold">Rotate</Text>
                        </Pressable>

                        <Pressable
                            onPress={handleDeleteSelected}
                            disabled={selectedPages.size === 0}
                            className="px-4 py-2 bg-[#FF3B30] rounded-lg active:opacity-80 disabled:opacity-40"
                        >
                            <Text className="text-white text-xs font-bold">Delete</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {/* ===== Page Grid (custom layout for gesture support) ===== */}
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
                    {pagesOrder.map((page, index) => {
                        const thumbUri = thumbnails[page];
                        const isFailed = failedPages.has(page);
                        const col = index % NUM_COLUMNS;
                        const row = Math.floor(index / NUM_COLUMNS);

                        return (
                            <DraggablePageCell
                                key={page}
                                page={page}
                                thumbUri={thumbUri}
                                isFailed={isFailed}
                                col={col}
                                row={row}
                                onDragSwap={handleDragSwap}
                                isSelected={selectedPages.has(page)}
                                isSelectMode={isSelectMode}
                                onToggleSelect={onToggleSelect}
                                rotation={rotations[page] || 0}
                            />
                        );
                    })}
                </View>

                {pagesOrder.length === 0 && totalPages > 0 && (
                    <View className="flex-1 items-center justify-center py-20">
                        <ActivityIndicator size="large" color={Palette.accent} />
                        <Text className="text-[#9C9CA3] mt-4 text-sm font-bold">
                            Generating thumbnails...
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* ===== Reset & Save Footer (Bottom Bar) ===== */}
            <View className="border-t border-[#2C2C2E] px-4 pt-4 pb-12 flex-row gap-4">
                <Pressable
                    onPress={handleReset}
                    className="flex-1 bg-[#1C1C1E] py-4 rounded-2xl items-center active:opacity-80 border border-[#2C2C2E]"
                >
                    <Text className="text-[#9C9CA3] text-base font-bold">Reset</Text>
                </Pressable>

                <Pressable
                    onPress={handleSave}
                    disabled={saving}
                    className="flex-[2] bg-[#FF3B30] py-4 rounded-2xl items-center active:opacity-85"
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text className="text-white text-base font-bold">Save</Text>
                    )}
                </Pressable>
            </View>
        </SafeAreaView>
    );
}