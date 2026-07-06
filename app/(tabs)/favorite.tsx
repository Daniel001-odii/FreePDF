import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';

import FileActionSheet from '@/components/FileActionSheet';
import FileCard from '@/components/FileCard';
import { HugeIcon } from '@/components/HugeIcon';
import { Palette } from '@/constants/Colors';
import { useFilesStore } from '@/src/stores/filesStore';
import type { DeviceFile } from '@/src/types';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FavoritesScreen() {
  const router = useRouter();
  const favorites = useFilesStore((s) => s.favorites);
  const loadAll = useFilesStore((s) => s.loadAll);
  const removeFile = useFilesStore((s) => s.removeFile);
  const [refreshing, setRefreshing] = useState(false);
  const [fileActionSheetVisible, setFileActionSheetVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DeviceFile | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
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
          renderItem={({ item }) => (
            <View className="mb-3">
              <FileCard
                file={item}
                displayMode="list"
                onMenuPress={(f) => {
                  setSelectedFile(f);
                  setFileActionSheetVisible(true);
                }}
              />
            </View>
          )}
        />

        {/* File Action Bottom Sheet */}
        <FileActionSheet
          visible={fileActionSheetVisible}
          file={selectedFile}
          onClose={() => setFileActionSheetVisible(false)}
          onDelete={(fileId) => {
            removeFile(fileId);
            setFileActionSheetVisible(false);
          }}
        />
      </View>
    </SafeAreaView>
  );
}
