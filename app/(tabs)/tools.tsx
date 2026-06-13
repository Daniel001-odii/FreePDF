import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { HugeIcon } from '@/components/HugeIcon';
import { Palette } from '@/constants/Colors';
import { CATEGORIES, TOOL_DEFINITIONS } from '@/src/constants/toolDefinitions';
import type { ToolCategory, ToolDefinition } from '@/src/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export default function ToolsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'all'>('all');

  const filtered = TOOL_DEFINITIONS.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === 'all' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categoriesToShow = activeCategory === 'all'
    ? CATEGORIES
    : CATEGORIES.filter((c) => c.id === activeCategory);

  return (
    <SafeAreaView className='flex-1 bg-[#0A0A0A]' edges={['top']}>
      <ScrollView
        className="flex-1 bg-[#0A0A0A]"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 pt-8 pb-6 items-start">
          <Text className="text-3xl font-black text-white tracking-tight" style={{
            fontFamily: "RocaTwoBold"
          }}>
            Tools
          </Text>
          <Text className="text-xs font-bold text-[#9C9CA3] mt-2">
            {TOOL_DEFINITIONS.length} tools available
          </Text>
        </View>

        {/* Search Bar */}
        <View className="px-6 pb-4">
          <View className="flex-row items-center bg-[#1C1C1E] rounded-2xl px-4 py-3.5">
            <Svg width="25" height="25" viewBox="0 0 24 24"><Path fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m17 17l4 4m-2-10a8 8 0 1 0-16 0a8 8 0 0 0 16 0" /></Svg>
            <TextInput
              className="flex-1 ml-3 text-white font-medium"
              placeholder="Search tools..."
              placeholderTextColor={Palette.textFaint}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Svg width="25" height="25" viewBox="0 0 24 24">
                  <Path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18 6L6 18m12 0L6 6" />
                </Svg>
              </Pressable>
            )}
          </View>
        </View>

        {/* Category Pills */}
        {!search && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 8, paddingBottom: 16 }}
          >
            <Pill
              label="All"
              active={activeCategory === 'all'}
              onPress={() => setActiveCategory('all')}
            />
            {CATEGORIES.map((cat) => (
              <Pill
                key={cat.id}
                label={cat.title}
                active={activeCategory === cat.id}
                onPress={() =>
                  setActiveCategory((prev) =>
                    prev === cat.id ? 'all' : cat.id,
                  )
                }
              />
            ))}
          </ScrollView>
        )}

        {/* Tool Grid by Category */}
        {categoriesToShow.map((cat) => {
          const tools = filtered.filter((t) => t.category === cat.id);
          if (tools.length === 0) return null;
          return (
            <View key={cat.id} className="mb-7 px-6">
              <View className="flex-row items-center gap-2 mb-3">
                {/* <View className="w-1.5 h-5 bg-[#FF3B30] rounded-full" /> */}
                <View>
                  <Text style={{
                    fontFamily: 'RocaTwoBold'
                  }} className="Capitalize text-xl text-white tracking-wider">
                    {cat.title}
                  </Text>
                  <Text className="text-xs text-[#9C9CA3] mt-0.5">
                    {cat.subtitle}
                  </Text>
                </View>
              </View>
              <View style={{ gap: 12 }}>
                {chunkArray(tools, 3).map((row, rowIndex) => (
                  <View key={rowIndex} style={{ flexDirection: 'row', gap: 12 }}>
                    {row.map((tool) => (
                      <View key={tool.id} style={{ flex: 1 }}>
                        <ToolGridItem
                          tool={tool}
                          onPress={() => (router as any).push(tool.route)}
                        />
                      </View>
                    ))}
                    {row.length < 3 &&
                      Array.from({ length: 3 - row.length }).map((_, i) => (
                        <View key={`spacer-${i}`} style={{ flex: 1 }} />
                      ))}
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View className="items-center py-12 px-6">
            <View className="w-20 h-20 bg-[#1C1C1E] rounded-3xl items-center justify-center mb-4">
              <HugeIcon name="search" size={36} color="#FF3B30" />
            </View>
            <Text className="text-white text-lg font-black">
              No tools found
            </Text>
            <Text className="text-[#9C9CA3] mt-1 text-center px-8 font-medium text-xs">
              Try a different search term
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-2 rounded-full ${active ? 'bg-[#FF3B30]' : 'bg-[#1C1C1E]'
        }`}
    >
      <Text
        className={`${active ? 'text-white' : 'text-[#9C9CA3]'
          }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ToolGridItem({ tool, onPress, children }: { tool: ToolDefinition; onPress: () => void; children?: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 120
      }}
      className="bg-[#1C1C1E] rounded-2xl items-center active:opacity-80 p-5 justify-center items-center"
    >
      {children || <HugeIcon name={tool.icon || 'merge'} size={30} color="#fff" />}
      <Text
        className="text-white text-xs text-center p-2"
        numberOfLines={2}
      >
        {tool.name}
      </Text>
    </Pressable>
  );
}