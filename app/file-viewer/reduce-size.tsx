import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

import { HugeIcon } from '@/components/HugeIcon';
import { Palette } from '@/constants/Colors';
import { getFileById, insertFile } from '@/src/db/repository';
import { compressPDF } from '@/src/services/pdfService';
import type { DeviceFile } from '@/src/types';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import PdfThumbnail from 'react-native-pdf-thumbnail';
import Svg, { Path } from 'react-native-svg';

export function HugeiconsArrowLeft01() {
    return (
        <Svg width="28" height="28" viewBox="0 0 24 24">
            <Path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 6s-6 4.419-6 6s6 6 6 6" />
        </Svg>
    );
}

export function HugeiconsTick02() {
    return (
        <Svg width="24" height="24" viewBox="0 0 24 24">
            <Path fill="none" stroke="#22C55E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m5 12l5 5L20 7" />
        </Svg>
    );
}

const PRESETS = [
    { key: 'high', label: 'High Compression', desc: 'Low quality, smallest size', quality: 50 },
    { key: 'recommended', label: 'Recommended', desc: 'Good balance of quality & size', quality: 75 },
    { key: 'low', label: 'Low Compression', desc: 'High quality, larger size', quality: 90 },
];

export default function ReduceSizeScreen() {
    const router = useRouter();
    const { id } = useGlobalSearchParams<{ id: string }>();
    const [file, setFile] = useState<DeviceFile | null>(null);
    const [loading, setLoading] = useState(true);
    const [compressing, setCompressing] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState('recommended');
    
    const [compressedUri, setCompressedUri] = useState<string | null>(null);
    const [originalSize, setOriginalSize] = useState(0);
    const [compressedSize, setCompressedSize] = useState(0);
    const [saving, setSaving] = useState(false);
    const [thumbUri, setThumbUri] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            getFileById(id).then(async (f) => {
                setFile(f);
                if (f) {
                    setOriginalSize(f.size);
                    // Use stored thumbnail or generate one
                    if (f.thumbnail) {
                        setThumbUri(f.thumbnail);
                    } else if (f.fileType === 'pdf') {
                        try {
                            const result = await PdfThumbnail.generate(f.uri, 0);
                            if (result?.uri) setThumbUri(result.uri);
                        } catch {
                            // no thumbnail available
                        }
                    }
                }
                setLoading(false);
            }).catch(() => {
                setLoading(false);
            });
        }
    }, [id]);

    const formatSize = (bytes: number) => {
        if (bytes <= 0) return '0 B';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleCompress = async () => {
        if (!file) return;
        setCompressing(true);
        setCompressedUri(null);

        try {
            const preset = PRESETS.find(p => p.key === selectedPreset) || PRESETS[1];
            // Perform actual compression
            const newUri = await compressPDF(file.uri, preset.quality);
            
            // Measure new file size
            const fileInfo = await FileSystem.getInfoAsync(newUri);
            const size = (fileInfo as any).size || 0;
            
            setCompressedSize(size);
            setCompressedUri(newUri);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Compression failed.');
        } finally {
            setCompressing(false);
        }
    };

    const handleSave = async () => {
        if (!file || !compressedUri || saving) return;
        setSaving(true);

        try {
            // Generate output name
            const dotIndex = file.name.lastIndexOf('.');
            const baseName = dotIndex > 0 ? file.name.slice(0, dotIndex) : file.name;
            const ext = dotIndex > 0 ? file.name.slice(dotIndex) : '.pdf';
            const newName = `${baseName}_compressed${ext}`;

            const newFile: DeviceFile = {
                ...file,
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                uri: compressedUri,
                name: newName,
                size: compressedSize,
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString(),
                thumbnail: undefined,
            };

            await insertFile(newFile);
            Alert.alert('Saved', `Compressed PDF saved as "${newName}".`, [
                {
                    text: 'OK',
                    onPress: () => {
                        // Navigate back
                        router.replace('/');
                    }
                }
            ]);
        } catch (err) {
            Alert.alert('Error', 'Could not save compressed file.');
            console.error('Save error:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-[#0A0A0A]" edges={['top']}>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={Palette.accent} />
                </View>
            </SafeAreaView>
        );
    }

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

    const savingsPercentage = originalSize > 0 
        ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
        : 0;

    return (
        <SafeAreaView className="flex-1 bg-[#0A0A0A]" edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-[#2C2C2E]">
                <Pressable
                    onPress={() => router.back()}
                    className="w-10 h-10 items-center justify-center"
                >
                    <HugeiconsArrowLeft01 />
                </Pressable>

                <Text className="flex-1 text-base font-extrabold text-white text-xl text-center mx-2">
                    Reduce File Size
                </Text>

                <View className="w-10" />
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
                {/* File Details – thumbnail + name/size, no card chrome */}
                <View className="flex-row items-center mb-6 gap-4">
                    {/* Thumbnail */}
                    <View
                        style={{
                            width: 56,
                            height: 72,
                            borderRadius: 8,
                            overflow: 'hidden',
                            backgroundColor: '#1C1C1E',
                        }}
                    >
                        {thumbUri ? (
                            <Image
                                source={{ uri: thumbUri }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                <HugeIcon name="file-size" size={24} color="#FF3B30" />
                            </View>
                        )}
                    </View>

                    {/* Name + size */}
                    <View className="flex-1">
                        <Text className="text-white font-bold text-base" numberOfLines={2}>
                            {file.name}
                        </Text>
                        <Text className="text-[#9C9CA3] text-xs font-semibold mt-1">
                            {formatSize(originalSize)}
                        </Text>
                    </View>
                </View>

                {!compressedUri ? (
                    /* ----- Configuration View ----- */
                    <View>
                        <Text className="text-white font-bold text-base mb-4">
                            Select Compression Level
                        </Text>

                        <View style={{ gap: 12 }} className="mb-8">
                            {PRESETS.map((preset) => {
                                const isSelected = selectedPreset === preset.key;
                                return (
                                    <Pressable
                                        key={preset.key}
                                        onPress={() => setSelectedPreset(preset.key)}
                                        className="rounded-2xl p-4 flex-row items-center justify-between border"
                                        style={{
                                            backgroundColor: isSelected ? '#1C1C1E' : '#161618',
                                            borderColor: isSelected ? '#FF3B30' : '#2C2C2E',
                                        }}
                                    >
                                        <View className="flex-1 pr-2">
                                            <Text className="text-white font-bold text-sm">
                                                {preset.label}
                                            </Text>
                                            <Text className="text-[#9C9CA3] text-xs font-medium mt-1">
                                                {preset.desc}
                                            </Text>
                                        </View>
                                        <View
                                            style={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: 10,
                                                borderWidth: 2,
                                                borderColor: isSelected ? '#FF3B30' : '#9C9CA3',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            {isSelected && (
                                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30' }} />
                                            )}
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <Pressable
                            onPress={handleCompress}
                            disabled={compressing}
                            className="bg-[#FF3B30] py-4 rounded-2xl items-center active:opacity-85 disabled:opacity-50"
                        >
                            {compressing ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text className="text-white text-base font-bold">Reduce Size Now</Text>
                            )}
                        </Pressable>
                    </View>
                ) : (
                    /* ----- Success / Comparison View ----- */
                    <View>
                        <View className="items-center mb-6 mt-4">
                            <View className="w-16 h-16 rounded-full bg-[#22C55E]/20 items-center justify-center mb-4">
                                <HugeiconsTick02 />
                            </View>
                            <Text className="text-white font-black text-2xl text-center">
                                Size Reduced Successfully!
                            </Text>
                            {savingsPercentage > 0 && (
                                <Text className="text-[#22C55E] text-base font-bold text-center mt-1">
                                    Saved {savingsPercentage}% of file size
                                </Text>
                            )}
                        </View>

                        {/* Comparison Card */}
                        <View className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-5 mb-8">
                            <View className="flex-row justify-between mb-4 border-b border-[#2C2C2E] pb-3">
                                <Text className="text-[#9C9CA3] text-sm font-semibold">Original Size</Text>
                                <Text className="text-white text-sm font-bold">{formatSize(originalSize)}</Text>
                            </View>
                            <View className="flex-row justify-between mb-4">
                                <Text className="text-[#9C9CA3] text-sm font-semibold">Compressed Size</Text>
                                <Text className="text-white text-sm font-bold">{formatSize(compressedSize)}</Text>
                            </View>
                            {originalSize > compressedSize && (
                                <View className="flex-row justify-between pt-3 border-t border-[#2C2C2E]/60">
                                    <Text className="text-[#9C9CA3] text-sm font-semibold">Total Savings</Text>
                                    <Text className="text-[#22C55E] text-sm font-bold">
                                        {formatSize(originalSize - compressedSize)} ({savingsPercentage}% Less)
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View className="flex-row gap-4">
                            <Pressable
                                onPress={() => setCompressedUri(null)}
                                className="flex-1 bg-[#1C1C1E] py-4 rounded-2xl items-center active:opacity-80 border border-[#2C2C2E]"
                            >
                                <Text className="text-[#9C9CA3] text-base font-bold">Retry</Text>
                            </Pressable>

                            <Pressable
                                onPress={handleSave}
                                disabled={saving}
                                className="flex-[2] bg-[#FF3B30] py-4 rounded-2xl items-center active:opacity-85"
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text className="text-white text-base font-bold">Save File</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
