import { ScrollView, Text, View } from 'react-native';

import { HugeIcon } from '@/components/HugeIcon';

export default function AboutScreen() {
  return (
    <ScrollView
      className="flex-1 bg-[#FAF7F0]"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Custom Header */}
      <View className="px-6 pt-14 pb-4">
        <View className="flex-row items-center gap-2">
          <View className="w-3 h-3 bg-[#8B6FE0] rounded-full" />
          <Text className="text-xl font-black text-[#1F222A] tracking-tight">
            About
          </Text>
        </View>
      </View>

      <View className="items-center py-6 px-5">
        <View className="w-24 h-24 bg-[#F4EFFD] rounded-3xl items-center justify-center mb-4 border-2 border-white shadow-sm">
          <HugeIcon name="merge" size={48} color="#8B6FE0" />
        </View>
        <Text className="text-2xl font-black text-[#1F222A]">
          FreePDF
        </Text>
        <Text className="text-sm font-bold text-[#8C857B] mt-1">
          Version 1.0.0
        </Text>
      </View>

      <View className="px-5">
        <View className="bg-white border-2 border-[#EFEBE3] rounded-3xl p-5 mb-4">
          <Text className="text-base font-extrabold text-[#1F222A] mb-2">
            About
          </Text>
          <Text className="text-sm font-medium text-[#605A51] leading-5">
            FreePDF is a production-ready mobile PDF toolkit built with React Native
            and Expo. All processing happens locally on your device—no uploads to servers,
            no internet required. Your documents stay private and secure.
          </Text>
        </View>

        <View className="bg-white border-2 border-[#EFEBE3] rounded-3xl p-5 mb-4">
          <Text className="text-base font-extrabold text-[#1F222A] mb-2">
            Features
          </Text>
          <View className="gap-2">
            {[
              'Merge & Split PDFs',
              'Compress & Rotate Pages',
              'Add Watermarks & Signatures',
              'Document Scanning',
              'Password Protection',
              'Offline-First Processing',
            ].map((f) => (
              <View key={f} className="flex-row items-center gap-2">
                <View className="w-1.5 h-1.5 bg-[#FF7E8A] rounded-full" />
                <Text className="text-sm font-medium text-[#605A51]">{f}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="bg-white border-2 border-[#EFEBE3] rounded-3xl p-5">
          <Text className="text-base font-extrabold text-[#1F222A] mb-2">
            Tech Stack
          </Text>
          <Text className="text-sm font-medium text-[#605A51] leading-5">
            React Native • Expo v56 • TypeScript • Expo Router • NativeWind
            • Zustand • Expo SQLite • PDF-lib • Reanimated
          </Text>
        </View>

        <Text className="text-xs font-bold text-[#D4CCC1] text-center mt-8">
          © 2026 FreePDF. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
}
