import { useRouter } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';

import { HugeIcon } from '@/components/HugeIcon';
import { useFilesStore } from '@/src/stores/filesStore';
import type { DeviceFile } from '@/src/types';
import Svg, { G, Path } from 'react-native-svg';

function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(isoDate: string) {
    const now = Date.now();
    const then = new Date(isoDate).getTime();
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoDate).toLocaleDateString();
}

function getAccentColor(fileType: string) {
    switch (fileType) {
        case 'pdf': return '#FF3B30';
        case 'document': return '#0FAFFF';
        case 'image': return '#22C55E';
        default: return '#FF3B30';
    }
}

function getFileIcon(fileType: string) {
    switch (fileType) {
        case 'pdf': return 'merge';
        case 'document': return 'reorder';
        case 'image': return 'image-to-pdf';
        default: return 'file-size';
    }
}

function BookmarkIcon({ filled }: { filled: boolean }) {
    return (
        <Svg width="18" height="18" viewBox="0 0 24 24">
            <Path
                fill={filled ? '#FF3B30' : 'none'}
                stroke={filled ? '#FF3B30' : '#9C9CA3'}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M4 17.98V9.709c0-3.634 0-5.45 1.172-6.58S8.229 2 12 2s5.657 0 6.828 1.129C20 4.257 20 6.074 20 9.708v8.273c0 2.306 0 3.459-.773 3.871c-1.497.8-4.304-1.867-5.637-2.67c-.773-.465-1.16-.698-1.59-.698s-.817.233-1.59.698c-1.333.803-4.14 3.47-5.637 2.67C4 21.44 4 20.287 4 17.981"
            />
        </Svg>
    );
}

function MoreIcon() {
    return (
        <Svg width="18" height="18" viewBox="0 0 24 24">
            <G fill="none" stroke="#9C9CA3" strokeWidth="1.5">
                <Path d="M12 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
                <Path d="M12 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
                <Path d="M12 18a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
            </G>
        </Svg>
    );
}

export default function FileCard({
    file,
    displayMode,
    onMenuPress,
}: {
    file: DeviceFile;
    displayMode: 'list' | 'grid';
    onMenuPress: (f: DeviceFile) => void;
}) {
    const router = useRouter();
    const toggleFav = useFilesStore((s) => s.toggleFavorite);

    // ---------- Grid mode (compact card) ----------
    if (displayMode === 'grid') {
        return (
            <Pressable
                onPress={() => router.push(`/file-viewer/${file.id}` as any)}
                className="flex-1 bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl p-3 items-center active:opacity-80"
                style={{ gap: 6 }}
            >
                <View
                    className="rounded-lg overflow-hidden items-center justify-center"
                    style={{
                        width: '100%',
                        height: 72,
                        backgroundColor: '#0A0A0A',
                    }}
                >
                    {(file.fileType === 'image' || file.fileType === 'pdf') && file.thumbnail ? (
                        <Image
                            source={{ uri: file.thumbnail }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                    ) : (
                        <HugeIcon name={getFileIcon(file.fileType)} size={22} color={getAccentColor(file.fileType)} />
                    )}
                </View>
                <Text
                    className="text-xs font-black text-white text-center"
                    numberOfLines={2}
                >
                    {file.name}
                </Text>
            </Pressable>
        );
    }

    // ---------- List mode (horizontal row) ----------
    return (
        <Pressable
            onPress={() => router.push(`/file-viewer/${file.id}` as any)}
            className="flex-row items-center active:opacity-80"
            style={{ gap: 12 }}
        >
            {/* Thumbnail */}
            <View
                className="rounded-lg overflow-hidden items-center justify-center"
                style={{
                    width: 44,
                    height: 56,
                    backgroundColor: '#0A0A0A',
                }}
            >
                {(file.fileType === 'image' || file.fileType === 'pdf') && file.thumbnail ? (
                    <Image
                        source={{ uri: file.thumbnail }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                ) : (
                    <HugeIcon name={getFileIcon(file.fileType)} size={20} color={getAccentColor(file.fileType)} />
                )}
            </View>

            {/* Metadata */}
            <View className="flex-1" style={{ gap: 2 }}>
                <Text className="text-sm font-black text-white" numberOfLines={1}>
                    {file.name}
                </Text>
                <Text className="text-[11px] font-bold text-[#9C9CA3]">
                    {formatSize(file.size)} · {file.fileType.charAt(0).toUpperCase() + file.fileType.slice(1)} · {formatRelativeTime(file.modifiedAt)}
                </Text>
            </View>

            {/* Favorite */}
            <Pressable onPress={() => toggleFav(file.id)} className="p-2">
                <BookmarkIcon filled={file.isFavorite} />
            </Pressable>

            {/* More Menu */}
            <Pressable onPress={() => onMenuPress(file)} className="p-2">
                <MoreIcon />
            </Pressable>
        </Pressable>
    );
}