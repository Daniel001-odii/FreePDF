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

export default function FavoritesScreen() {
  const router = useRouter();
  const favorites = useFilesStore((s) => s.favorites);
  const loadAll = useFilesStore((s) => s.loadAll);
  const toggleFavorite = useFilesStore((s) => s.toggleFavorite);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
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
            Favorites
          </Text>
          <Text className="text-xs font-bold text-[#9C9CA3] mt-1 ml-0.5">
            {favorites.length} favorited file{favorites.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <FlatList
          data={favorites}
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
                <HugeIcon name="rate" size={36} color="#FF3B30" />
              </View>
              <Text className="text-white text-lg font-black">
                No favorites yet
              </Text>
              <Text className="text-[#9C9CA3] mt-1 text-center px-8 font-medium text-xs">
                Tap the star icon on any file to add it to your favorites
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
                  </View>
                </View>
                <Pressable onPress={() => toggleFavorite(item.id)} className="p-2">
                  <HugeIcon name="rate" size={20} color="#FF3B30" />
                </Pressable>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}