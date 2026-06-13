import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';

import { HugeIcon } from '@/components/HugeIcon';
import { Palette } from '@/constants/Colors';
import { useFilesStore } from '@/src/stores/filesStore';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RecentsScreen() {
  const router = useRouter();
  const files = useFilesStore((s) => s.files);
  const loadAll = useFilesStore((s) => s.loadAll);
  const toggleFavorite = useFilesStore((s) => s.toggleFavorite);
  const removeFile = useFilesStore((s) => s.removeFile);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <SafeAreaView className='flex-1 bg-[#0A0A0A]' edges={['top']}>
      <View className="flex-1 bg-[#0A0A0A]">
        {/* Custom Header */}
        <View className="px-6 pt-8 pb-4">
          <Text className="text-3xl font-black text-white tracking-tight" style={{
            fontFamily: "RocaTwoBold"
          }}>
            My Documents
          </Text>
          <Text className="text-xs font-bold text-[#9C9CA3] mt-1 ml-0.5">
            {files.length} file{files.length !== 1 ? 's' : ''} total
          </Text>
        </View>

        <FlatList
          data={files}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Palette.accent}
            />
          }
          ListEmptyComponent={
            <View className="items-center py-16">
              <View className="w-20 h-20 bg-[#1C1C1E] rounded-3xl items-center justify-center mb-4">
                <HugeIcon name="recents" size={36} color="#FF3B30" />
              </View>
              <Text className="text-white text-lg font-black">
                No files yet
              </Text>
              <Text className="text-[#9C9CA3] mt-1 text-center px-8 font-medium text-xs">
                Import a PDF to get started with all the powerful tools
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View className="bg-[#1C1C1E] rounded-3xl p-4 mb-3">
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-[#0A0A0A] rounded-2xl items-center justify-center mr-3">
                  <HugeIcon name="merge" size={22} color="#FF3B30" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-extrabold text-white" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View className="flex-row items-center mt-1 gap-2">
                    <Text className="text-xs font-bold text-[#9C9CA3]">
                      {formatSize(item.size)}
                    </Text>
                    <View className="w-1 h-1 rounded-full bg-[#3A3A3C]" />
                    <Text className="text-xs font-bold text-[#9C9CA3]">
                      {item.pageCount} pages
                    </Text>
                    <View className="w-1 h-1 rounded-full bg-[#3A3A3C]" />
                    <Text className="text-xs font-bold text-[#9C9CA3]">
                      {formatDate(item.modifiedAt)}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-1">
                  <Pressable onPress={() => toggleFavorite(item.id)} className="p-2">
                    <HugeIcon name="rate" size={18} color={item.isFavorite ? '#FF3B30' : '#3A3A3C'} />
                  </Pressable>
                  <Pressable onPress={() => removeFile(item.id)} className="p-2">
                    <HugeIcon name="search" size={18} color="#3A3A3C" />
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}