import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View
} from 'react-native';

import { HugeIcon } from '@/components/HugeIcon';
import { Palette } from '@/constants/Colors';
import { TOOL_DEFINITIONS } from '@/src/constants/toolDefinitions';
import { useFilesStore } from '@/src/stores/filesStore';
import type { PDFFile, ToolDefinition } from '@/src/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, G, LinearGradient, Path, RadialGradient, Stop, SvgProps } from 'react-native-svg';

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

const CATEGORIES = [
  { id: 'all', name: 'All Tools', icon: 'home' },
  { id: 'organize', name: 'Organize', icon: 'merge' },
  { id: 'convert', name: 'Convert', icon: 'pdf-to-image' },
  { id: 'edit', name: 'Edit', icon: 'watermark' },
  { id: 'scanner', name: 'Scan', icon: 'document-scanner' },
  { id: 'security', name: 'Secure', icon: 'password-protect' },
] as const;



export function FluentColorCloud16(props: SvgProps) {
  return (
    <Svg width="28" height="28" viewBox="0 0 16 16" {...props}>
      {/* Icon from Fluent UI System Color Icons by Microsoft Corporation - https://github.com/microsoft/fluentui-system-icons/blob/main/LICENSE */}
      <G fill="none">
        <Path fill="url(#SVG8IW38dSG)" d="M4.03 5.507a4 4 0 0 1 7.94 0A3.25 3.25 0 0 1 11.75 12h-7.5a3.25 3.25 0 0 1-.22-6.493" />
        <Path fill="url(#SVGrl7xrNZq)" fillOpacity={0.3} d="M7.5 8.75a3.25 3.25 0 1 1-6.5 0a3.25 3.25 0 0 1 6.5 0" />
        <Path fill="url(#SVGduLFAe2m)" fillOpacity={0.3} d="M8 10a4 4 0 1 0-3.97-4.493q.11-.007.22-.007a3.25 3.25 0 0 1 3.027 4.435Q7.63 10 8 10" />
        <Path fill="url(#SVGaGBtedbX)" d="M8 10a4 4 0 1 0-3.97-4.493q.11-.007.22-.007a3.25 3.25 0 0 1 3.027 4.435Q7.63 10 8 10" />
        <Path fill="url(#SVGmJ3YVcGs)" fillOpacity={0.5} d="M4.03 5.507a4 4 0 0 1 7.94 0A3.25 3.25 0 0 1 11.75 12h-7.5a3.25 3.25 0 0 1-.22-6.493" />
        <Defs>
          <LinearGradient id="SVG8IW38dSG" x1="1.5" x2="7.948" y1="3.875" y2="13.254" gradientUnits="userSpaceOnUse">
            <Stop stopColor="#0fafff" />
            <Stop offset="1" stopColor="#367af2" />
          </LinearGradient>
          <LinearGradient id="SVGrl7xrNZq" x1="1" x2="5.382" y1="6.613" y2="10.492" gradientUnits="userSpaceOnUse">
            <Stop stopColor="#fff" />
            <Stop offset="1" stopColor="#fcfcfc" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="SVGduLFAe2m" x1="5.412" x2="6.47" y1="2.45" y2="7.965" gradientUnits="userSpaceOnUse">
            <Stop stopColor="#fff" />
            <Stop offset="1" stopColor="#fcfcfc" stopOpacity={0} />
          </LinearGradient>
          <RadialGradient id="SVGaGBtedbX" cx={0} cy={0} r={1} gradientTransform="matrix(4.49228 -1.9 1.69846 4.01577 4.342 8.55)" gradientUnits="userSpaceOnUse">
            <Stop offset="0.412" stopColor="#2c87f5" />
            <Stop offset="1" stopColor="#2c87f5" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="SVGmJ3YVcGs" cx={0} cy={0} r={1} gradientTransform="rotate(64.034 2.609 6.618)scale(12.3236 87.8769)" gradientUnits="userSpaceOnUse">
            <Stop offset="0.5" stopColor="#dd3ce2" stopOpacity={0} />
            <Stop offset="1" stopColor="#dd3ce2" />
          </RadialGradient>
        </Defs>
      </G>
    </Svg>
  );
}

export function FluentImageColor16(props: SvgProps) {
  return (
    <Svg width="28" height="28" viewBox="0 0 16 16" {...props}>
      <G fill="none">
        <Path fill="url(#SVGQTqyMbnj)" d="M2 4.5A2.5 2.5 0 0 1 4.5 2h7A2.5 2.5 0 0 1 14 4.5v7a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 11.5z" />
        <Path fill="url(#SVGdNpfQrOx)" d="M13.586 12.879A2.5 2.5 0 0 1 11.5 14h-7a2.5 2.5 0 0 1-2.086-1.121l4.384-4.384a1.7 1.7 0 0 1 2.404 0z" />
        <Path fill="url(#SVGogbcOc6t)" d="M11.5 5.502a1.002 1.002 0 1 1-2.004 0a1.002 1.002 0 0 1 2.004 0" />
        <Defs>
          <LinearGradient id="SVGdNpfQrOx" x1="6.286" x2="7.572" y1="7.997" y2="14.347" gradientUnits="userSpaceOnUse">
            <Stop stopColor="#B3E0FF" />
            <Stop offset="1" stopColor="#8CD0FF" />
          </LinearGradient>
          <LinearGradient id="SVGogbcOc6t" x1="10.097" x2="10.829" y1="4.277" y2="6.913" gradientUnits="userSpaceOnUse">
            <Stop stopColor="#FDFDFD" />
            <Stop offset="1" stopColor="#B3E0FF" />
          </LinearGradient>
          <RadialGradient id="SVGQTqyMbnj" cx={0} cy={0} r={1} gradientTransform="matrix(20.57146 26.03575 -23.68122 18.71109 -2.714 -4.75)" gradientUnits="userSpaceOnUse">
            <Stop offset="0.338" stopColor="#0FAFFF" />
            <Stop offset="0.529" stopColor="#367AF2" />
          </RadialGradient>
        </Defs>
      </G>
    </Svg>
  );
}

export function FluentPdfToWord32(props: SvgProps) {
  return (
    <Svg width="28" height="28" viewBox="0 0 32 32" {...props}>
      <G fill="none">
        <Path fill="url(#SVGRYJ6vbiV)" d="M17 2H8a3 3 0 0 0-3 3v22a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3V12l-7-3z" />
        <Path fill="url(#SVGNuJ7pdcP)" fillOpacity={0.5} d="M17 2H8a3 3 0 0 0-3 3v22a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3V12l-7-3z" />
        <Path fill="url(#SVGqtO3jXrP)" d="M17 10V2l10 10h-8a2 2 0 0 1-2-2" />
        <Defs>
          <LinearGradient id="SVGRYJ6vbiV" x1="20.4" x2="22.711" y1="2" y2="25.61" gradientUnits="userSpaceOnUse">
            <Stop stopColor="#6CE0FF" />
            <Stop offset="1" stopColor="#4894FE" />
          </LinearGradient>
          <LinearGradient id="SVGqtO3jXrP" x1="21.983" x2="19.483" y1="6.167" y2="10.333" gradientUnits="userSpaceOnUse">
            <Stop stopColor="#9FF0F9" />
            <Stop offset="1" stopColor="#B3E0FF" />
          </LinearGradient>
          <RadialGradient id="SVGNuJ7pdcP" cx={0} cy={0} r={1} gradientTransform="rotate(133.108 13.335 7.491)scale(17.438 10.2853)" gradientUnits="userSpaceOnUse">
            <Stop offset="0.362" stopColor="#4A43CB" />
            <Stop offset="1" stopColor="#4A43CB" stopOpacity={0} />
          </RadialGradient>
        </Defs>
      </G>
    </Svg>
  );
}

export function FluentWordToPdf28(props: SvgProps) {
  return (
    <Svg width="28" height="28" viewBox="0 0 28 28" {...props}>
      <G fill="none">
        <Path fill="url(#SVGcrfgCerp)" d="M15 2H6.5A2.5 2.5 0 0 0 4 4.5v19A2.5 2.5 0 0 0 6.5 26h15a2.5 2.5 0 0 0 2.5-2.5V11l-7-2z" />
        <Path fill="url(#SVGBFwMEd8D)" fillOpacity={0.5} d="M15 2H6.5A2.5 2.5 0 0 0 4 4.5v19A2.5 2.5 0 0 0 6.5 26h15a2.5 2.5 0 0 0 2.5-2.5V11l-7-2z" />
        <Path fill="url(#SVGBFwMEd8D)" fillOpacity={0.3} d="M15 2H6.5A2.5 2.5 0 0 0 4 4.5v19A2.5 2.5 0 0 0 6.5 26h15a2.5 2.5 0 0 0 2.5-2.5V11l-7-2z" />
        <Path fill="url(#SVGnzhecdAR)" d="M15 9.5V2l9 9h-7.5A1.5 1.5 0 0 1 15 9.5" />
        <Path fill="url(#SVGUv95sGLc)" fillOpacity={0.9} d="M9.25 14.5a.75.75 0 0 0 0 1.5h9.5a.75.75 0 0 0 0-1.5zm-.75 3.75a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5h-9.5a.75.75 0 0 1-.75-.75m.75 2.25a.75.75 0 0 0 0 1.5h9.5a.75.75 0 0 0 0-1.5z" />
        <Defs>
          <LinearGradient id="SVGcrfgCerp" x1="18" x2="19.388" y1="2" y2="20.598" gradientUnits="userSpaceOnUse">
            <Stop stopColor="#6CE0FF" />
            <Stop offset="1" stopColor="#4894FE" />
          </LinearGradient>
          <LinearGradient id="SVGnzhecdAR" x1="19.485" x2="17.235" y1="5.75" y2="9.5" gradientUnits="userSpaceOnUse">
            <Stop stopColor="#9FF0F9" />
            <Stop offset="1" stopColor="#B3E0FF" />
          </LinearGradient>
          <LinearGradient id="SVGUv95sGLc" x1="19.5" x2="12.2" y1="25" y2="9.731" gradientUnits="userSpaceOnUse">
            <Stop stopColor="#9DEAFF" />
            <Stop offset="1" stopColor="#fff" />
          </LinearGradient>
          <RadialGradient id="SVGBFwMEd8D" cx={0} cy={0} r={1} gradientTransform="rotate(133.966 11.833 6.65)scale(16.325 9.64965)" gradientUnits="userSpaceOnUse">
            <Stop offset="0.362" stopColor="#4A43CB" />
            <Stop offset="1" stopColor="#4A43CB" stopOpacity={0} />
          </RadialGradient>
        </Defs>
      </G>
    </Svg>
  );
}



export default function HomeScreen() {
  const router = useRouter();
  const files = useFilesStore((s) => s.files);
  const recentFiles = useFilesStore((s) => s.recentFiles);
  const loadAll = useFilesStore((s) => s.loadAll);

  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    loadAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const filteredTools = TOOL_DEFINITIONS.filter((tool) => {
    const matchesSearch = search
      ? tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase())
      : true;

    const matchesCategory =
      activeCategory === 'all' ||
      tool.category?.toLowerCase() === activeCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const favoriteCount = files.filter((f) => f.isFavorite).length;

  return (
    <SafeAreaView className='flex-1 bg-[#0A0A0A]' edges={['top']}>
      {/* <View className="bg-[#0A0A0A]"> */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Palette.accent}
          />
        }
      >
        {/* Brand Header */}
        <View className="flex-row items-center justify-between px-6 pt-8 pb-6">
          <View>
            <Text className="text-3xl font-black text-white tracking-tight" style={{
              fontFamily: "RocaTwoBold"
            }}>
              FreePDF
            </Text>
          </View>
          <View className="flex-row items-center gap-4">
            <Pressable className="w-9 h-9 items-center justify-center">
              <Svg width="28" height="28" viewBox="0 0 24 24"><Path fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m17 17l4 4m-2-10a8 8 0 1 0-16 0a8 8 0 0 0 16 0"/></Svg>
            </Pressable>
            <Pressable
              onPress={() => router.push('/settings')}
              className="w-10 h-10 rounded-full items-center justify-center "
            >
              <Svg width="28" height="28" viewBox="0 0 24 24"><G fill="none" stroke="currentColor" strokeWidth="2"><Path d="M15.5 12a3.5 3.5 0 1 1-7 0a3.5 3.5 0 0 1 7 0Z"/><Path d="M20.79 9.152C21.598 10.542 22 11.237 22 12s-.403 1.458-1.21 2.848l-1.923 3.316c-.803 1.384-1.205 2.076-1.865 2.456s-1.462.38-3.065.38h-3.874c-1.603 0-2.405 0-3.065-.38s-1.062-1.072-1.865-2.456L3.21 14.848C2.403 13.458 2 12.763 2 12s.403-1.458 1.21-2.848l1.923-3.316C5.936 4.452 6.338 3.76 6.998 3.38S8.46 3 10.063 3h3.874c1.603 0 2.405 0 3.065.38s1.062 1.072 1.865 2.456z"/></G></Svg>
            </Pressable>
          </View>
        </View>

        {/* Quick Action Cards (2x2) */}
        <View className="px-6 pb-6">
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <QuickActionCard
                label="From iCloud"
                onPress={() => { }}
                renderIcon={() => <FluentColorCloud16 />}
              />
              <QuickActionCard
                label="Image to PDF"
                onPress={() => router.push('/tool/image-to-pdf' as any)}
                renderIcon={() => <FluentImageColor16 />}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <QuickActionCard
                label="PDF to Word"
                onPress={() => { }}
                renderIcon={() => <FluentPdfToWord32 />}
              />
              <QuickActionCard
                label="Word to PDF"
                onPress={() => { }}
                renderIcon={() => <FluentWordToPdf28 />}
              />
            </View>
          </View>
        </View>

   
        {/* Recent Files */}
        <View className="pb-7">
          <View className="px-6 flex-row items-center justify-between mb-4">
            <Text className="text-base font-black text-white tracking-tight">
              All
            </Text>
            {files.length > 5 && (
              <Pressable onPress={() => router.push('/recents')}>
                <Text className="text-[#FF3B30] font-bold text-xs">See All</Text>
              </Pressable>
            )}
          </View>

          {recentFiles.length === 0 ? (
            <View className="mx-6 py-10 items-center bg-[#1C1C1E] border border-[#2C2C2E] rounded-3xl">
              <HugeIcon name="recents" size={32} color={Palette.textMuted} />
              <Text className="text-[#9C9CA3] mt-2 text-xs text-center font-bold">
                No recent files yet. Import a PDF.
              </Text>
            </View>
          ) : (
            <FlatList
              horizontal
              data={recentFiles.slice(0, 5)}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, gap: 14 }}
              renderItem={({ item }) => <RecentFileCard file={item} />}
            />
          )}
        </View>
      </ScrollView>

      {/* </View> */}
    </SafeAreaView>
  );
}

// --------------- Sub-components ---------------

function QuickActionCard({
  label,
  onPress,
  renderIcon,
}: {
  label: string;
  onPress: () => void;
  renderIcon: () => React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 bg-[#1C1C1E] rounded-xl p-5 flex-row items-center justify-between active:opacity-80"
    >
      <Text className="text-white font-extrabold text-sm flex-1 mr-2">
        {label}
      </Text>
      <View className="w-9 h-9 rounded-xl items-center justify-center">
        {renderIcon()}
      </View>
    </Pressable>
  );
}

function ActionIcon({
  label,
  iconName,
  onPress,
}: {
  label: string;
  iconName: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="items-center active:opacity-70" style={{ gap: 8 }}>
      <View className="w-14 h-14 rounded-2xl bg-[#1C1C1E] border border-[#2C2C2E] items-center justify-center">
        <HugeIcon name={iconName as any} size={22} color={Palette.text} />
      </View>
      <Text className="text-[11px] font-bold text-[#9C9CA3]">{label}</Text>
    </Pressable>
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <View className="items-center flex-1">
      <Text className="text-xl font-black text-[#FF3B30]">{value}</Text>
      <Text className="text-[10px] font-bold text-[#9C9CA3] mt-1 text-center">
        {label}
      </Text>
    </View>
  );
}

function RecentFileCard({ file }: { file: PDFFile }) {
  const toggleFav = useFilesStore((s) => s.toggleFavorite);
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <View className="w-44 bg-[#1C1C1E] border border-[#2C2C2E] rounded-[28px] p-4">
      <View className="w-full h-24 bg-[#0A0A0A] rounded-2xl items-center justify-center mb-3 relative overflow-hidden">
        <View className="absolute top-0 left-0 right-0 h-[3px] bg-[#FF3B30]" />
        <HugeIcon name="merge" size={24} color="#FFFFFF" />
      </View>

      <Text className="text-sm font-black text-white" numberOfLines={1}>
        {file.name}
      </Text>

      <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-[#2C2C2E]">
        <Text className="text-[10px] font-bold text-[#9C9CA3]">
          {formatSize(file.size)}
        </Text>
        <Pressable onPress={() => toggleFav(file.id)} className="p-1">
          <HugeIcon
            name="rate"
            size={14}
            color={file.isFavorite ? '#FF3B30' : Palette.textFaint}
          />
        </Pressable>
      </View>
    </View>
  );
}

function ToolGridItem({ tool, onPress }: { tool: ToolDefinition; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-3xl p-5 active:opacity-80"
    >
      <View className="w-12 h-12 bg-[#0A0A0A] rounded-2xl items-center justify-center mb-3">
        <HugeIcon name={tool.icon || 'merge'} size={20} color="#FF3B30" />
      </View>
      <Text className="text-[10px] font-black uppercase text-[#FF3B30] tracking-wider mb-1">
        {tool.category || 'Utility'}
      </Text>
      <Text className="text-base font-extrabold text-white mb-1">
        {tool.name}
      </Text>
      <Text className="text-xs text-[#9C9CA3]" numberOfLines={2}>
        {tool.description}
      </Text>
    </Pressable>
  );
}
