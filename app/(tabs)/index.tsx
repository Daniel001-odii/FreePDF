import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import FileActionSheet from '@/components/FileActionSheet';
import FileCard from '@/components/FileCard';
import { Palette } from '@/constants/Colors';
import { TOOL_DEFINITIONS } from '@/src/constants/toolDefinitions';
import { useFilesStore } from '@/src/stores/filesStore';
import type { DeviceFile, FileType } from '@/src/types';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
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

export function HugeiconsMenu04(props: any) {
  return (
    <Svg width="28" height="28" viewBox="0 0 24 24">{/* Icon from Huge Icons by Hugeicons - undefined */}<Path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 5h10M4 12h16M7 19h10" /></Svg>
  )
}

export function HugeiconsPlus(props: any) {
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24">
      <Path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v14M5 12h14" />
    </Svg>
  );
}


// -----------------------------------------------------------
// MIME → FileType lookup
// -----------------------------------------------------------

function mimeToFileType(mimeType: string | null | undefined): FileType {
  if (!mimeType) return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'text/plain'
  ) {
    return 'document';
  }
  return 'pdf';
}

function makeFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// -----------------------------------------------------------
// Quick Action Picker Helpers
// -----------------------------------------------------------

async function pickGeneralFiles() {
  return DocumentPicker.getDocumentAsync({
    type: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/heic',
      'image/heif',
    ],
    copyToCacheDirectory: true,
  });
}

async function pickImageFiles() {
  return DocumentPicker.getDocumentAsync({
    type: ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'],
    copyToCacheDirectory: true,
  });
}

async function pickWordFiles() {
  return DocumentPicker.getDocumentAsync({
    type: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    copyToCacheDirectory: true,
  });
}

async function pickPDFFile() {
  return DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });
}

function FilterIcon() {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <Path stroke="#9C9CA3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 7h16M7 12h10M10 17h4" />
    </Svg>
  );
}
function NameIcon({ color }: { color: string }) {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <Path stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h12M3 12h10M3 17h8m6-10l4 4-4 4" />
    </Svg>
  );
}

function SizeIcon({ color }: { color: string }) {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <Path stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm4 5h8m-8 4h5" />
    </Svg>
  );
}

function CalendarIcon({ color }: { color: string }) {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <Path stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
    </Svg>
  );
}

function ClockIcon({ color }: { color: string }) {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <Path stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <Path stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 6L6 18M6 6l12 12" />
    </Svg>
  );
}

export function HugeiconsLayoutGrid(props: any) {
  return (
    <Svg width="20" height="20" viewBox="0 0 24 24">{/* Icon from Huge Icons by Hugeicons - undefined */}<G fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="1.5"><Path strokeLinejoin="round" d="M20.109 3.891C21.5 5.282 21.5 7.521 21.5 12c0 4.478 0 6.718-1.391 8.109S16.479 21.5 12 21.5c-4.478 0-6.718 0-8.109-1.391S2.5 16.479 2.5 12c0-4.478 0-6.718 1.391-8.109S7.521 2.5 12 2.5c4.478 0 6.718 0 8.109 1.391" /><Path d="M21.5 12h-19M12 2.5v19" /></G></Svg>
  )
}

export function HugeiconsMenu06(props: any) {
  return (
    <Svg width="20" height="20" viewBox="0 0 24 24">{/* Icon from Huge Icons by Hugeicons - undefined */}<Path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 5h16M4 12h4m12 0h-9m-3 0l1.5 2l1.5-2m-3 0h3m-7 7h16" /></Svg>
  )
}

export function HugeiconsFilter(props: any) {
  return (
    <Svg width="20" height="20" viewBox="0 0 24 24">{/* Icon from Huge Icons by Hugeicons - undefined */}<Path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.857 12.506C6.37 10.646 4.596 8.6 3.627 7.45c-.3-.356-.398-.617-.457-1.076c-.202-1.572-.303-2.358.158-2.866S4.604 3 6.234 3h11.532c1.63 0 2.445 0 2.906.507c.461.508.36 1.294.158 2.866c-.06.459-.158.72-.457 1.076c-.97 1.152-2.747 3.202-5.24 5.065a1.05 1.05 0 0 0-.402.747c-.247 2.731-.475 4.227-.617 4.983c-.229 1.222-1.96 1.957-2.888 2.612c-.552.39-1.222-.074-1.293-.678a196 196 0 0 1-.674-6.917a1.05 1.05 0 0 0-.402-.755" /></Svg>
  )
}

// -----------------------------------------------------------
// Main Screen
// -----------------------------------------------------------

export default function HomeScreen() {
  const router = useRouter();
  const files = useFilesStore((s) => s.files);
  const loadAll = useFilesStore((s) => s.loadAll);
  const addFile = useFilesStore((s) => s.addFile);
  const removeFile = useFilesStore((s) => s.removeFile);

  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [displayMode, setDisplayMode] = useState<'list' | 'grid'>('list');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'createdAt' | 'modifiedAt'>('modifiedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
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

  // Shared handler: pick files and navigate to viewer
  const handlePickAndNavigate = async (
    pickerFn: () => Promise<DocumentPicker.DocumentPickerResult>,
  ) => {
    try {
      const result = await pickerFn();
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const fileType = mimeToFileType(asset.mimeType);
        const now = new Date().toISOString();
        const newFile: DeviceFile = {
          id: makeFileId(),
          uri: asset.uri,
          name: asset.name,
          size: asset.size ?? 0,
          fileType,
          createdAt: now,
          modifiedAt: now,
          isFavorite: false,
        };
        await addFile(newFile);
        router.push(`/file-viewer/${newFile.id}` as any);
      }
    } catch (err) {
      console.error('File picker error:', err);
    }
  };

  const handleImageToPDFPick = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Permission to access gallery is required to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map(asset => asset.uri);
        router.push({
          pathname: '/tool/images-to-pdf',
          params: {
            images: JSON.stringify(uris),
          },
        } as any);
      }
    } catch (err) {
      console.error('Image picker error:', err);
      Alert.alert('Error', 'Failed to pick images from gallery.');
    }
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

  const sortedFiles = [...files]
    .sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'size':
          cmp = a.size - b.size;
          break;
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'modifiedAt':
          cmp = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    })
    .slice(0, 10);

  const importLabel = Platform.OS === 'ios' ? 'From iCloud' : 'Import from Device';

  return (
    <SafeAreaView className='flex-1 bg-[#0A0A0A]' edges={['top']}>
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
            {/* <Pressable className="w-9 h-9 items-center justify-center">
              <Svg width="28" height="28" viewBox="0 0 24 24"><Path fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m17 17l4 4m-2-10a8 8 0 1 0-16 0a8 8 0 0 0 16 0" /></Svg>
            </Pressable> */}
            <Pressable
              onPress={() => router.push('/settings')}
              className="w-10 h-10 rounded-full items-center justify-center "
            >
              <HugeiconsMenu04 />
            </Pressable>
          </View>
        </View>

        {/* Quick Action Cards (2x2) */}
        <View className="px-6 pb-6">
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <QuickActionCard
                label={importLabel}
                onPress={() => handlePickAndNavigate(pickGeneralFiles)}
                renderIcon={() => <FluentColorCloud16 />}
              />
              <QuickActionCard
                label="Image to PDF"
                onPress={handleImageToPDFPick}
                renderIcon={() => <FluentImageColor16 />}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <QuickActionCard
                label="PDF to Word"
                onPress={() => handlePickAndNavigate(pickPDFFile)}
                renderIcon={() => <FluentPdfToWord32 />}
              />
              <QuickActionCard
                label="Word to PDF"
                onPress={() => handlePickAndNavigate(pickWordFiles)}
                renderIcon={() => <FluentWordToPdf28 />}
              />
            </View>
          </View>
        </View>

        {/* Recent Files */}
        <View className="pb-7">
          <View className="px-6 flex-row items-center justify-between mb-4">
            <Text className="text-base text-xl font-bold text-white tracking-tight">
              Recent Files
            </Text>
            <View className="flex-row items-center" style={{ gap: 4 }}>
              {/* Display type toggle */}
              {/*  <Pressable
                onPress={() => setDisplayMode(displayMode === 'list' ? 'grid' : 'list')}
                className="w-8 h-8 items-center justify-center"
              >
                {displayMode === 'list' ? <HugeiconsLayoutGrid /> : <HugeiconsMenu06 />}
              </Pressable> */}
              {/* Filter */}
              <Pressable
                onPress={() => setShowFilterSheet(true)}
                className="w-8 h-8 items-center justify-center"
              >
                <HugeiconsFilter />
              </Pressable>
              {files.length > 8 && (
                <Pressable onPress={() => router.push('/recents')} className="ml-1">
                  <Text className="text-[#FF3B30] font-bold text-xs">See All</Text>
                </Pressable>
              )}
            </View>
          </View>

          {files.length === 0 ? (
            <Pressable
              onPress={() => handlePickAndNavigate(pickGeneralFiles)}
              className="mx-6 py-12 items-center active:opacity-80"
            >
              <Image source={require('@/assets/images/add-file.png')} style={{ width: 40, height: 40 }} />
              <Text className="text-[#9C9CA3] mt-4 text-center font-bold">
                No files yet. Tap to import.
              </Text>
            </Pressable>
          ) : (
            <FlatList
              key={displayMode}
              data={sortedFiles}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
              numColumns={displayMode === 'grid' ? 3 : 1}
              columnWrapperStyle={displayMode === 'grid' ? { gap: 10 } : undefined}
              contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }}
              renderItem={({ item }) => (
                <FileCard
                  file={item}
                  displayMode={displayMode}
                  onMenuPress={(f) => {
                    setSelectedFile(f);
                    setFileActionSheetVisible(true);
                  }}
                />
              )}
            />
          )}
        </View>

        {/* Filter Bottom Sheet */}
        <FilterSheet
          visible={showFilterSheet}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onApply={(by, order) => {
            setSortBy(by);
            setSortOrder(order);
            setShowFilterSheet(false);
          }}
          onClose={() => setShowFilterSheet(false)}
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
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <Pressable
        onPress={() => handlePickAndNavigate(pickGeneralFiles)}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-[#FF3B30] items-center justify-center shadow-lg active:opacity-85"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
          elevation: 8,
        }}
      >
        <HugeiconsPlus />
      </Pressable>
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

// --------------- Filter Bottom Sheet (Redesigned) ---------------
function FilterSheet({
  visible,
  sortBy,
  sortOrder,
  onApply,
  onClose,
}: {
  visible: boolean;
  sortBy: 'name' | 'size' | 'createdAt' | 'modifiedAt';
  sortOrder: 'asc' | 'desc';
  onApply: (by: 'name' | 'size' | 'createdAt' | 'modifiedAt', order: 'asc' | 'desc') => void;
  onClose: () => void;
}) {
  const [localSortBy, setLocalSortBy] = useState(sortBy);
  const [localSortOrder, setLocalSortOrder] = useState(sortOrder);

  // Sync state when sheet is opened
  useEffect(() => {
    if (visible) {
      setLocalSortBy(sortBy);
      setLocalSortOrder(sortOrder);
    }
  }, [visible, sortBy, sortOrder]);

  const sortOptions = [
    { key: 'name', label: 'File Name', icon: NameIcon },
    { key: 'size', label: 'File Size', icon: SizeIcon },
    { key: 'createdAt', label: 'Date Created', icon: CalendarIcon },
    { key: 'modifiedAt', label: 'Date Modified', icon: ClockIcon },
  ] as const;

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

          {/* Header row */}
          {/*      <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-white tracking-tight">
              Sort & Filter
            </Text>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-[#1C1C1E] items-center justify-center active:opacity-70"
            >
              <CloseIcon />
            </Pressable>
          </View> */}

          {/* Section: Order */}
          <View>
            {([
              { key: 'asc', label: 'Ascending' },
              { key: 'desc', label: 'Descending' },
            ] as const).map((opt) => {
              const isSelected = localSortOrder === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setLocalSortOrder(opt.key)}
                  className="flex-row items-center justify-between py-3"
                >
                  <Text
                    className="text-xl font-semibold"
                    style={{ color: isSelected ? '#FFFFFF' : '#9C9CA3' }}
                  >
                    {opt.label}
                  </Text>
                  {/* Checkmark Indicator */}
                  {isSelected && (
                    <Svg width="24" height="24" viewBox="0 0 24 24">
                      <Path fill="none" stroke="#FF3B30" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m5 14l3.5 3.5L19 6.5" />
                    </Svg>
                  )}
                </Pressable>
              );
            })}
          </View>


          {/* Separator */}
          <View className="bg-[#2C2C2E] h-px mb-6" />

          {/* Section: Sort By */}
          <View className="mb-6" style={{ gap: 8 }}>
            {sortOptions.map((opt) => {
              const isSelected = localSortBy === opt.key;
              const Icon = opt.icon;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setLocalSortBy(opt.key)}
                  className="flex-row items-center justify-between py-2"
                >
                  <View className="flex-row items-center" style={{ gap: 12 }}>
                    <Text
                      className="text-xl font-semibold"
                      style={{ color: isSelected ? '#FFFFFF' : '#9C9CA3' }}
                    >
                      {opt.label}
                    </Text>
                  </View>

                  {/* Checkmark Indicator */}
                  {isSelected && (
                    <Svg width="24" height="24" viewBox="0 0 24 24">
                      <Path fill="none" stroke="#FF3B30" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m5 14l3.5 3.5L19 6.5" />
                    </Svg>
                  )}
                </Pressable>
              );
            })}
          </View>




          {/* Actions Footer */}
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <Pressable
              onPress={() => {
                setLocalSortBy('modifiedAt');
                setLocalSortOrder('desc');
              }}
              className="flex-1 bg-[#1C1C1E] py-4 rounded-2xl items-center active:opacity-80 border border-[#2C2C2E]"
            >
              <Text className="text-[#9C9CA3] text-sm font-bold">Clear</Text>
            </Pressable>

            <Pressable
              onPress={() => onApply(localSortBy, localSortOrder)}
              className="flex-[2] bg-[#FF3B30] py-4 rounded-2xl items-center active:opacity-85"
            >
              <Text className="text-white text-sm font-bold">Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

