import { useRouter } from 'expo-router';
import { Image, Modal, Pressable, Text, View } from 'react-native';

import { HugeIcon } from '@/components/HugeIcon';
import type { DeviceFile } from '@/src/types';
import Svg, { G, Path } from 'react-native-svg';

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

const menuActions = [
    {
        key: 'rename',
        label: 'Rename',
        icon: (
            <Svg width="22" height="22" viewBox="0 0 24 24">{/* Icon from Huge Icons by Hugeicons - undefined */}<G fill="none" stroke="#fff" strokeLinejoin="round" strokeWidth="1.5"><Path d="M14.074 3.885c.745-.807 1.117-1.21 1.513-1.446a3.1 3.1 0 0 1 3.103-.047c.403.224.787.616 1.555 1.4c.768.785 1.152 1.178 1.37 1.589a3.29 3.29 0 0 1-.045 3.17c-.23.404-.625.785-1.416 1.546l-9.403 9.057c-1.498 1.443-2.247 2.164-3.183 2.53s-1.965.338-4.023.285l-.28-.008c-.626-.016-.94-.024-1.121-.231c-.183-.207-.158-.526-.108-1.164l.027-.346c.14-1.796.21-2.694.56-3.502s.956-1.463 2.166-2.774zM13 4l7 7" /><Path strokeLinecap="round" d="M14 22h8" /></G></Svg>
        ),
    },
    {
        key: 'edit',
        label: 'Edit',
        icon: (
            <Svg width="22" height="22" viewBox="0 0 24 24">{/* Icon from Huge Icons by Hugeicons - undefined */}<G fill="none" stroke="#fff" strokeLinejoin="round" strokeWidth="1.5"><Path d="M13 20.827V22h1.173c.41 0 .614 0 .799-.076c.184-.076.328-.221.618-.51l4.823-4.825c.273-.273.41-.41.483-.556c.139-.28.139-.61 0-.89c-.073-.147-.21-.283-.483-.556s-.41-.41-.556-.483a1 1 0 0 0-.89 0c-.147.073-.284.21-.557.483l-4.823 4.824c-.29.289-.434.434-.51.618s-.077.388-.077.798Z" /><Path strokeLinecap="round" d="M19 11s0-1.57-.152-1.937s-.441-.657-1.02-1.235l-4.736-4.736c-.499-.499-.748-.748-1.058-.896a2 2 0 0 0-.197-.082C11.514 2 11.161 2 10.456 2c-3.245 0-4.868 0-5.967.886a4 4 0 0 0-.603.603C3 4.59 3 6.211 3 9.456V14c0 3.771 0 5.657 1.172 6.828C5.235 21.892 6.886 21.99 10 22m2-19.5V3c0 2.828 0 4.243.879 5.121C13.757 9 15.172 9 18 9h.5" /></G></Svg>
        ),
    },
    {
        key: 'delete',
        label: 'Delete',
        icon: (
            <Svg width="22" height="22" viewBox="0 0 24 24">{/* Icon from Huge Icons by Hugeicons - undefined */}<G fill="none" stroke="#FF3B30" strokeLinecap="round" strokeWidth="1.5"><Path d="m19.5 5.5l-.402 6.506M4.5 5.5l.605 10.025c.154 2.567.232 3.85.874 4.774c.317.456.726.842 1.2 1.131c.671.41 1.502.533 2.821.57" /><Path strokeLinejoin="round" d="m20 15l-7 7m7 0l-7-7" /><Path d="M3 5.5h18m-4.944 0l-.683-1.408c-.453-.936-.68-1.403-1.071-1.695a2 2 0 0 0-.275-.172C13.594 2 13.074 2 12.035 2c-1.066 0-1.599 0-2.04.234a2 2 0 0 0-.278.18c-.395.303-.616.788-1.058 1.757L8.053 5.5" /></G></Svg>
        ),
    },
] as const;

export default function FileActionSheet({
    visible,
    file,
    onClose,
    onDelete,
}: {
    visible: boolean;
    file: DeviceFile | null;
    onClose: () => void;
    onDelete: (fileId: string) => void;
}) {
    if (!file) return null;

    const router = useRouter();

    const handleAction = (key: string) => {
        onClose();
        switch (key) {
            case 'rename':
                router.push(`/file-viewer/${file.id}` as any);
                break;
            case 'edit':
                router.push(`/file-viewer/${file.id}` as any);
                break;
            case 'delete':
                onDelete(file.id);
                break;
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                <Pressable className="flex-1" onPress={onClose} />

                <View className="!bg-[#2e2e2e] border-t border-[#2C2C2E] rounded-t-[32px] px-6 pb-12">
                    {/* Bottom Sheet Indicator Handle */}
                    <View className="items-center mb-6">
                        <View className="w-12 h-1 bg-[#2C2C2E] rounded-full" />
                    </View>

                    {/* Header with file name */}
                    <View className="mb-6 flex-row items-center" style={{ gap: 14 }}>
                        {/* Thumbnail */}
                        <View
                            className="rounded-lg overflow-hidden items-center justify-center"
                            style={{
                                width: 48,
                                height: 60,
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
                        <View className="flex-1">
                            <Text className="text-lg font-bold text-white" numberOfLines={1}>
                                {file.name}
                            </Text>
                            <Text className="text-xs font-semibold text-[#9C9CA3] mt-1">
                                {file.fileType.charAt(0).toUpperCase() + file.fileType.slice(1)}
                            </Text>
                        </View>
                    </View>

                    {/* Menu Actions */}
                    <View className="mb-8" style={{ gap: 4 }}>
                        {menuActions.map((action) => (
                            <Pressable
                                key={action.key}
                                onPress={() => handleAction(action.key)}
                                className="flex-row items-center py-4 px-2 rounded-xl active:opacity-70"
                                style={{ gap: 14 }}
                            >
                                {action.icon}
                                <Text
                                    className="text-base font-semibold text-xl"
                                    style={{ color: action.key === 'delete' ? '#FF3B30' : '#FFFFFF' }}
                                >
                                    {action.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Close Button */}
                    <Pressable
                        onPress={onClose}
                        className="bg-[#1C1C1E] mt-3 py-4 rounded-2xl items-center active:opacity-80 border border-[#2C2C2E]"
                    >
                        <Text className="text-[#9C9CA3] text-sm font-bold">Cancel</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}