import { useGlobalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    PanResponder,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
    Modal,
} from 'react-native';

import { HugeIcon } from '@/components/HugeIcon';
import { Palette } from '@/constants/Colors';
import { getFileById, insertFile, renameFile } from '@/src/db/repository';
import { useFilesStore } from '@/src/stores/filesStore';
import { applyAdjustmentsToPDF, applyAdjustmentsToImage, loadPreviewPixels, generateFilteredPreview } from '@/src/services/pdfAdjustmentService';
import type { PreviewPixelData } from '@/src/services/pdfAdjustmentService';
import type { DeviceFile } from '@/src/types';
import { usePostHog } from 'posthog-react-native';
import { ImageZoom } from '@likashefqet/react-native-image-zoom';
import RNBlobUtil from 'react-native-blob-util';
import * as Sharing from 'expo-sharing';
import Pdf from 'react-native-pdf';
import PdfThumbnail from 'react-native-pdf-thumbnail';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { G, Path } from 'react-native-svg';

// -----------------------------------------------------------
// Inline SVG icons (keep existing + new adjust icons)
// -----------------------------------------------------------

export function HugeiconsArrowLeft01(props: any) {
    return (
        <Svg width="28" height="28" viewBox="0 0 24 24">
            <Path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 6s-6 4.419-6 6s6 6 6 6" />
        </Svg>
    );
}

export function HugeiconsShare03(props: any) {
    return (
        <Svg width="28" height="28" viewBox="0 0 24 24">
            <Path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7s2.196-2.716 3.404-3.761a.9.9 0 0 1 .63-.238a.92.92 0 0 1 .562.238C13.804 4.284 16 7 16 7m-3.966-3v11M8 11c-1.4 0-2.1 0-2.635.273a2.5 2.5 0 0 0-1.093 1.092C4 12.9 4 13.6 4 15v1c0 2.357 0 3.535.732 4.268S6.643 21 9 21h6c2.357 0 3.535 0 4.268-.732C20 19.535 20 18.357 20 16v-1c0-1.4 0-2.1-.273-2.635a2.5 2.5 0 0 0-1.092-1.092C18.1 11 17.4 11 16 11" />
        </Svg>
    );
}

export function HugeiconsFiles01(props: any) {
    return (
        <Svg width="24" height="24" viewBox="0 0 24 24">
            <G fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
                <Path d="M14.5 19h-2c-2.829 0-4.243 0-5.121-.879c-.88-.878-.88-2.293-.88-5.121V8c0-2.828 0-4.243.88-5.121C8.256 2 9.67 2 12.499 2h1.344c.818 0 1.226 0 1.594.152c.367.152.656.442 1.234 1.02l2.657 2.656c.578.578.867.868 1.02 1.235c.152.368.152.776.152 1.594V13c0 2.828 0 4.243-.879 5.121C18.743 19 17.328 19 14.5 19" />
                <Path d="M15 2.5v1c0 1.886 0 2.828.586 3.414c.585.586 1.528.586 3.414.586h1M6.5 5a3 3 0 0 0-3 3v8c0 2.828 0 4.243.878 5.121C5.257 22 6.671 22 9.5 22h5a3 3 0 0 0 3-3M10 11h4m-4 4h7" />
            </G>
        </Svg>
    );
}

export function HugeiconsPdf02(props: any) {
    return (
        <Svg width="24" height="24" viewBox="0 0 24 24">
            <G fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
                <Path d="M19 11c0-.818 0-1.57-.152-1.937s-.441-.657-1.02-1.235l-4.736-4.736c-.499-.499-.748-.748-1.058-.896a2 2 0 0 0-.197-.082C11.514 2 11.161 2 10.456 2c-3.245 0-4.868 0-5.967.886a4 4 0 0 0-.603.603C3 4.59 3 6.211 3 9.456V14c0 3.771 0 5.657 1.172 6.828S7.229 22 11 22h8M12 2.5V3c0 2.828 0 4.243.879 5.121C13.757 9 15.172 9 18 9h.5" />
                <Path d="M21 14h-2a1 1 0 0 0-1 1v1.5m0 0V19m0-2.5h2.5M7 19v-2m0 0v-3h1.5a1.5 1.5 0 0 1 0 3zm5.5-3h1.286c.947 0 1.714.746 1.714 1.667v1.666c0 .92-.768 1.667-1.714 1.667H12.5z" />
            </G>
        </Svg>
    );
}

export function HugeiconsFileSync(props: any) {
    return (
        <Svg width="24" height="24" viewBox="0 0 24 24">
            <G fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
                <Path d="M20 14.005v-3.344c0-.818 0-1.227-.152-1.595s-.441-.657-1.02-1.235l-4.736-4.739c-.499-.499-.748-.748-1.058-.896a2 2 0 0 0-.197-.082C12.514 2 12.161 2 11.456 2c-3.245 0-4.868 0-5.967.886a4 4 0 0 0-.603.604C4 4.59 4 6.213 4 9.46v4.545c0 3.773 0 5.66 1.172 6.832C6.115 21.78 7.52 21.964 10 22m3-19.5V3c0 2.83 0 4.245.879 5.124c.878.879 2.293.879 5.121.879h.5" />
                <Path d="m11 16l1 2c.243-1.696 1.737-3 3.5-3c1.19 0 2.24.593 2.873 1.5M20 21l-1-2c-.243 1.696-1.737 3-3.5 3c-1.19 0-2.24-.593-2.873-1.5" />
            </G>
        </Svg>
    );
}

// -----------------------------------------------------------
// Constants & Custom Types
// -----------------------------------------------------------

const SCREEN_WIDTH = Dimensions.get('window').width;
const THUMB_WIDTH = 56 - 10;
const THUMB_HEIGHT = 72 - 10;
const THUMB_GAP = 8;

interface Adjustments {
    brightness: number;  // 0% - 200%
    contrast: number;    // 0% - 200%
    saturation: number;  // 0% - 200%
    grayscale: number;   // 0% - 100%
    invert: number;      // 0% - 100%
    sepia: number;       // 0% - 100%
    hueShift: number;    // 0deg - 360deg
}

const DEFAULT_ADJUSTMENTS: Adjustments = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    invert: 0,
    sepia: 0,
    hueShift: 0,
};

const PRESETS: Record<string, { label: string; values: Adjustments }> = {
    original: {
        label: 'Original',
        values: { ...DEFAULT_ADJUSTMENTS },
    },
    crispScan: {
        label: 'Crisp Scan',
        values: { brightness: 105, contrast: 135, saturation: 85, grayscale: 0, invert: 0, sepia: 0, hueShift: 0 },
    },
    warmReader: {
        label: 'Warm Reader',
        values: { brightness: 96, contrast: 98, saturation: 85, grayscale: 0, invert: 0, sepia: 35, hueShift: 0 },
    },
    darkMode: {
        label: 'Dark Mode',
        values: { brightness: 90, contrast: 110, saturation: 15, grayscale: 0, invert: 100, sepia: 0, hueShift: 0 },
    },
    highContrastDark: {
        label: 'High Contrast Dark',
        values: { brightness: 95, contrast: 145, saturation: 0, grayscale: 100, invert: 100, sepia: 0, hueShift: 0 },
    },
    draftMono: {
        label: 'Draft / Mono',
        values: { brightness: 100, contrast: 155, saturation: 0, grayscale: 100, invert: 0, sepia: 0, hueShift: 0 },
    },
    blueprint: {
        label: 'Blueprint Blue',
        values: { brightness: 100, contrast: 125, saturation: 100, grayscale: 0, invert: 100, sepia: 0, hueShift: 210 },
    },
};

const getMatchingPreset = (adj: Adjustments): string => {
    for (const [key, preset] of Object.entries(PRESETS)) {
        const match = (Object.keys(DEFAULT_ADJUSTMENTS) as Array<keyof Adjustments>).every(
            (k) => adj[k] === preset.values[k]
        );
        if (match) return key;
    }
    return '';
};

// -----------------------------------------------------------
// Custom CustomSlider Component
// -----------------------------------------------------------
interface SliderProps {
    label: string;
    min: number;
    max: number;
    value: number;
    onChange: (val: number) => void;
    suffix?: string;
}

function CustomSlider({ label, min, max, value, onChange, suffix = '' }: SliderProps) {
    const widthRef = useRef<number>(0);
    const startXRef = useRef<number>(0);
    const startValRef = useRef<number>(0);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderTerminationRequest: () => false,
            onPanResponderGrant: (evt, gestureState) => {
                const touchX = evt.nativeEvent.locationX;
                const width = widthRef.current || 1;
                const startVal = min + (touchX / width) * (max - min);
                const clampedStartVal = Math.max(min, Math.min(max, startVal));

                startXRef.current = touchX;
                startValRef.current = clampedStartVal;

                onChange(Math.round(clampedStartVal));
            },
            onPanResponderMove: (evt, gestureState) => {
                const width = widthRef.current || 1;
                const dx = gestureState.dx;
                const newTouchX = Math.max(0, Math.min(width, startXRef.current + dx));
                const newVal = min + (newTouchX / width) * (max - min);
                onChange(Math.round(newVal));
            },
        })
    ).current;

    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <View className="mb-4">
            <View className="flex-row justify-between mb-1">
                <Text className="text-[#9C9CA3] text-xs font-bold">{label}</Text>
                <Text className="text-white text-xs font-semibold">{value}{suffix}</Text>
            </View>
            <View
                onLayout={(e) => { widthRef.current = e.nativeEvent.layout.width; }}
                {...panResponder.panHandlers}
                className="h-6 justify-center"
            >
                <View className="h-1.5 bg-[#2C2C2E] rounded-full w-full relative" pointerEvents="none">
                    <View
                        className="h-1.5 bg-[#FF3B30] rounded-full absolute left-0 top-0"
                        style={{ width: `${percentage}%` }}
                    />
                    <View
                        className="w-4 h-4 bg-white rounded-full absolute top-1/2 -mt-2 -ml-2 border border-black/30"
                        style={{ left: `${percentage}%` }}
                    />
                </View>
            </View>
        </View>
    );
}

// -----------------------------------------------------------
// FloatingSignature Component — interactive overlay
// -----------------------------------------------------------
interface FloatingSignatureProps {
    signature: {
        path: string;
        invertedPath: string;
        color: string;
        strokeWidth: number;
        x: number;
        y: number;
        width: number;
        height: number;
        canvasWidth: number;
        canvasHeight: number;
        page: number;
    };
    onChange: (updated: any) => void;
    containerWidth: number;
    containerHeight: number;
}

function FloatingSignature({
    signature,
    onChange,
    containerWidth,
    containerHeight,
}: FloatingSignatureProps) {
    const dragStartRef = useRef({ x: 0, y: 0 });
    const resizeStartRef = useRef({ width: 0, height: 0 });
    const propsRef = useRef({ signature, containerWidth, containerHeight, onChange });

    useEffect(() => {
        propsRef.current = { signature, containerWidth, containerHeight, onChange };
    });

    useEffect(() => {
        if (signature && (signature.height === 0 || !signature.height) && containerWidth > 0 && containerHeight > 0) {
            const aspect = signature.canvasWidth / signature.canvasHeight;
            const initialHeight = (signature.width * containerWidth / aspect) / containerHeight;
            onChange({ ...signature, height: initialHeight });
        }
    }, [signature, containerWidth, containerHeight, onChange]);

    const dragPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                const { signature } = propsRef.current;
                dragStartRef.current = { x: signature.x, y: signature.y };
            },
            onPanResponderMove: (_, gestureState) => {
                const { signature, containerWidth, containerHeight, onChange } = propsRef.current;
                const dx_percent = gestureState.dx / containerWidth;
                const dy_percent = gestureState.dy / containerHeight;
                let newX = dragStartRef.current.x + dx_percent;
                let newY = dragStartRef.current.y + dy_percent;

                // Constrain boundaries
                newX = Math.max(0, Math.min(1 - signature.width, newX));
                newY = Math.max(0, Math.min(1 - signature.height, newY));

                onChange({ ...signature, x: newX, y: newY });
            },
        })
    ).current;

    const resizePanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                const { signature } = propsRef.current;
                resizeStartRef.current = { width: signature.width, height: signature.height };
            },
            onPanResponderMove: (_, gestureState) => {
                const { signature, containerWidth, containerHeight, onChange } = propsRef.current;
                const dw_percent = gestureState.dx / containerWidth;
                let newWidth = resizeStartRef.current.width + dw_percent;

                // Constraints: min width 10%, max width fits container
                newWidth = Math.max(0.1, Math.min(0.8, 1 - signature.x, newWidth));

                // Maintain Aspect Ratio: ar = canvasWidth / canvasHeight
                const aspect = signature.canvasWidth / signature.canvasHeight;
                const newHeight = (newWidth * containerWidth / aspect) / containerHeight;

                if (signature.y + newHeight <= 1) {
                    onChange({ ...signature, width: newWidth, height: newHeight });
                }
            },
        })
    ).current;

    const left = signature.x * containerWidth;
    const top = signature.y * containerHeight;
    const width = signature.width * containerWidth;
    const height = signature.height * containerHeight;

    return (
        <View
            style={{
                position: 'absolute',
                left,
                top,
                width,
                height,
                borderWidth: 1.5,
                borderColor: '#FF3B30',
                borderStyle: 'dashed',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            {/* Delete button top-left */}
            <Pressable
                onPress={() => onChange(null)}
                style={{
                    position: 'absolute',
                    top: -16,
                    left: -16,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#FF3B30',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                }}
            >
                <Svg width="18" height="18" viewBox="0 0 24 24">
                    <Path
                        fill="none"
                        stroke="#fff"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M18 6L6 18m12 0L6 6"
                    />
                </Svg>
            </Pressable>

            {/* Render vector signature path */}
            <Svg
                viewBox={`0 0 ${signature.canvasWidth} ${signature.canvasHeight}`}
                style={{ width: '100%', height: '100%' }}
                {...dragPanResponder.panHandlers}
            >
                <Path
                    d={signature.path}
                    fill="none"
                    stroke={signature.color}
                    strokeWidth={signature.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>

            {/* Resize button bottom-right */}
            <View
                style={{
                    position: 'absolute',
                    bottom: -16,
                    right: -16,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#007AFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                }}
                {...resizePanResponder.panHandlers}
            >
                <Svg width="18" height="18" viewBox="0 0 24 24">
                    <Path
                        fill="none"
                        stroke="#fff"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M7.5 3.266c-.844-.012-3.64-.593-4.234 0s-.012 3.39 0 4.234m.228-4.009l7.004 7.005M20.734 16.5c.012.844.593 3.64 0 4.234s-3.39.012-4.234 0m-3.002-7.237l7.004 7.006"
                    />
                </Svg>
            </View>
        </View>
    );
}

// -----------------------------------------------------------
// FloatingText Component — interactive overlay for text annotations
// -----------------------------------------------------------
interface FloatingTextProps {
    textOverlay: {
        text: string;
        color: string;
        fontSize: number;
        x: number;
        y: number;
        width: number;
        height: number;
        page: number;
    };
    onChange: (updated: any) => void;
    containerWidth: number;
    containerHeight: number;
    onEdit: () => void;
}

function FloatingText({
    textOverlay,
    onChange,
    containerWidth,
    containerHeight,
    onEdit,
}: FloatingTextProps) {
    const dragStartRef = useRef({ x: 0, y: 0 });
    const resizeStartRef = useRef({ width: 0 });
    const propsRef = useRef({ textOverlay, containerWidth, containerHeight, onChange, onEdit });

    // Track the auto-layout height in percentage to dynamically constrain Y dragging boundaries
    const [measuredHeightPercent, setMeasuredHeightPercent] = useState(0.08);

    useEffect(() => {
        propsRef.current = { textOverlay, containerWidth, containerHeight, onChange, onEdit };
    });

    const dragPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                const { textOverlay } = propsRef.current;
                dragStartRef.current = { x: textOverlay.x, y: textOverlay.y };
            },
            onPanResponderMove: (_, gestureState) => {
                const { textOverlay, containerWidth, containerHeight, onChange } = propsRef.current;
                const dx_percent = gestureState.dx / containerWidth;
                const dy_percent = gestureState.dy / containerHeight;
                let newX = dragStartRef.current.x + dx_percent;
                let newY = dragStartRef.current.y + dy_percent;

                // Constrain boundaries using dynamic layout height
                newX = Math.max(0, Math.min(1 - textOverlay.width, newX));
                newY = Math.max(0, Math.min(1 - measuredHeightPercent, newY));

                onChange({ ...textOverlay, x: newX, y: newY });
            },
            onPanResponderRelease: (_, gestureState) => {
                // If user just tapped (did not drag more than 5px), open re-editing modal
                const distance = Math.sqrt(gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy);
                if (distance < 5) {
                    propsRef.current.onEdit();
                }
            },
        })
    ).current;

    const resizePanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                const { textOverlay } = propsRef.current;
                resizeStartRef.current = { width: textOverlay.width };
            },
            onPanResponderMove: (_, gestureState) => {
                const { textOverlay, containerWidth, onChange } = propsRef.current;
                const dw_percent = gestureState.dx / containerWidth;
                let newWidth = resizeStartRef.current.width + dw_percent;

                // Constraints: min width 10%
                newWidth = Math.max(0.1, Math.min(0.9, 1 - textOverlay.x, newWidth));

                onChange({ ...textOverlay, width: newWidth });
            },
        })
    ).current;

    const handleLayout = (e: any) => {
        const { height } = e.nativeEvent.layout;
        setMeasuredHeightPercent(height / containerHeight);
    };

    const left = textOverlay.x * containerWidth;
    const top = textOverlay.y * containerHeight;
    const width = textOverlay.width * containerWidth;

    // Scale font size dynamically relative to screen container reference size (500px)
    const scaledFontSize = textOverlay.fontSize * (containerWidth / 500);

    return (
        <View
            onLayout={handleLayout}
            style={{
                position: 'absolute',
                left,
                top,
                width,
                borderWidth: 1.5,
                borderColor: '#FF3B30',
                borderStyle: 'dashed',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
            }}
        >
            {/* Delete button top-left */}
            <Pressable
                onPress={() => onChange(null)}
                style={{
                    position: 'absolute',
                    top: -16,
                    left: -16,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#FF3B30',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                }}
            >
                <Svg width="18" height="18" viewBox="0 0 24 24">
                    <Path
                        fill="none"
                        stroke="#fff"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M18 6L6 18m12 0L6 6"
                    />
                </Svg>
            </Pressable>

            {/* Click/drag interaction layer - standard View handles PanResponder cleanly */}
            <View
                style={{ width: '100%', padding: 4, justifyContent: 'flex-start', alignItems: 'flex-start' }}
                {...dragPanResponder.panHandlers}
            >
                <Text
                    style={{
                        fontSize: scaledFontSize,
                        color: textOverlay.color,
                        fontWeight: 'bold',
                        width: '100%',
                    }}
                >
                    {textOverlay.text}
                </Text>
            </View>

            {/* Resize button bottom-right */}
            <View
                style={{
                    position: 'absolute',
                    bottom: -16,
                    right: -16,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#007AFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                }}
                {...resizePanResponder.panHandlers}
            >
                <Svg width="18" height="18" viewBox="0 0 24 24">
                    <Path
                        fill="none"
                        stroke="#fff"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M7.5 3.266c-.844-.012-3.64-.593-4.234 0s-.012 3.39 0 4.234m.228-4.009l7.004 7.005M20.734 16.5c.012.844.593 3.64 0 4.234s-3.39.012-4.234 0m-3.002-7.237l7.004 7.006"
                    />
                </Svg>
            </View>
        </View>
    );
}

// -----------------------------------------------------------
// AdjustPreview Component — pixel-accurate live preview
// -----------------------------------------------------------
interface AdjustPreviewProps {
    file: DeviceFile;
    currentPage: number;
    thumbnails: Record<number, { uri: string; width: number; height: number }>;
    imageDimensions: { width: number; height: number } | null;
    currentAdjustments: Adjustments;
    isComparing: boolean;
    activeSignature: any | null;
    setActiveSignature: (sig: any) => void;
    activeText: any | null;
    setActiveText: (txt: any) => void;
    onEditText: () => void;
}

function AdjustPreview({
    file,
    currentPage,
    thumbnails,
    imageDimensions,
    currentAdjustments,
    isComparing,
    activeSignature,
    setActiveSignature,
    activeText,
    setActiveText,
    onEditText,
}: AdjustPreviewProps) {
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    const [loadingPixels, setLoadingPixels] = useState(true);
    const [containerLayout, setContainerLayout] = useState<{ width: number; height: number } | null>(null);
    const sourcePixelsRef = useRef<PreviewPixelData | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Track which source we loaded so we can reload when the page changes
    const loadedSourceRef = useRef<string>('');

    // Determine the source URI to load pixels from
    const sourceUri = file.fileType === 'pdf'
        ? thumbnails[currentPage]?.uri ?? null
        : file.uri;

    // Load raw RGBA pixels when source changes
    useEffect(() => {
        if (!sourceUri) {
            setLoadingPixels(true);
            return;
        }

        // Avoid reloading the same source
        if (loadedSourceRef.current === sourceUri && sourcePixelsRef.current) {
            return;
        }

        let cancelled = false;
        setLoadingPixels(true);

        const load = async () => {
            try {
                // loadPreviewPixels defaults to 500px max width for fast processing
                const data = await loadPreviewPixels(sourceUri);
                if (!cancelled) {
                    sourcePixelsRef.current = data;
                    loadedSourceRef.current = sourceUri;
                    setLoadingPixels(false);
                }
            } catch (err) {
                console.warn('[AdjustPreview] Failed to load pixels:', err);
                if (!cancelled) setLoadingPixels(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [sourceUri, file.fileType]);

    // Regenerate preview when adjustments or compare state changes (debounced)
    useEffect(() => {
        if (!sourcePixelsRef.current) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);

        const adj = isComparing ? DEFAULT_ADJUSTMENTS : currentAdjustments;

        debounceRef.current = setTimeout(async () => {
            try {
                const uri = await generateFilteredPreview(sourcePixelsRef.current!, adj);
                setPreviewUri(uri);
            } catch (err) {
                console.warn('[AdjustPreview] Failed to generate preview:', err);
            }
        }, 50);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [currentAdjustments, isComparing, loadingPixels]);

    // Show loading indicator while pixels are being prepared
    if (!sourceUri || loadingPixels) {
        const color = file.fileType === 'pdf' ? '#FF3B30' : '#22C55E';
        const label = file.fileType === 'pdf' ? 'Generating preview page...' : 'Loading image...';
        return (
            <View className="flex-1 items-center justify-center bg-[#0A0A0A]">
                <ActivityIndicator size="large" color={color} />
                <Text className="text-[#9C9CA3] text-xs font-semibold mt-3">{label}</Text>
            </View>
        );
    }

    // Determine aspect-ratio-fit dimensions
    const srcData = sourcePixelsRef.current;
    const origW = srcData?.width ?? 1;
    const origH = srcData?.height ?? 1;

    return (
        <View
            className="flex-1 items-center justify-center bg-[#0A0A0A]"
            onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                setContainerLayout({ width, height });
            }}
        >
            {previewUri && containerLayout ? (() => {
                const contW = containerLayout.width - 32;
                const contH = containerLayout.height - 32;
                const ratio = Math.min(contW / origW, contH / origH, 1);
                const w = origW * ratio;
                const h = origH * ratio;

                return (
                    <View style={{
                        width: w,
                        height: h,
                        borderRadius: 4,
                        position: 'relative',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 5,
                    }}>
                        <Image
                            source={{ uri: previewUri }}
                            style={{ width: w, height: h }}
                            resizeMode="contain"
                        />
                        {activeSignature && activeSignature.page === currentPage && (
                            <FloatingSignature
                                signature={activeSignature}
                                onChange={setActiveSignature}
                                containerWidth={w}
                                containerHeight={h}
                            />
                        )}
                        {activeText && activeText.page === currentPage && (
                            <FloatingText
                                textOverlay={activeText}
                                onChange={setActiveText}
                                containerWidth={w}
                                containerHeight={h}
                                onEdit={onEditText}
                            />
                        )}
                    </View>
                );
            })() : (
                <ActivityIndicator size="small" color="#9C9CA3" />
            )}
        </View>
    );
}

// -----------------------------------------------------------
// Main Screen
// -----------------------------------------------------------

export default function FileViewerScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const posthog = usePostHog();
    const insets = useSafeAreaInsets();
    const { id } = useGlobalSearchParams<{ id: string }>();
    const [file, setFile] = useState<DeviceFile | null>(null);
    const [loading, setLoading] = useState(true);

    // PDF state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const pdfRef = useRef<any>(null);

    // Thumbnails state
    interface ThumbnailInfo {
        uri: string;
        width: number;
        height: number;
    }
    const [thumbnails, setThumbnails] = useState<Record<number, ThumbnailInfo>>({});
    const [thumbGenQueue, setThumbGenQueue] = useState<number[]>([]);
    const [failedPages, setFailedPages] = useState<Set<number>>(new Set());
    const thumbScrollRef = useRef<ScrollView>(null);

    // Image state
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
    const [reloadTrigger, setReloadTrigger] = useState(0);

    // Rename state
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameText, setRenameText] = useState('');
    const renameInputRef = useRef<TextInput>(null);

    // Edit mode states
    const [editMode, setEditMode] = useState(false);

    // Adjust feature states
    const [isAdjusting, setIsAdjusting] = useState(false);

    // Disable iOS swipe-back gesture when user is in edit/adjustment mode
    // to prevent accidental pops while dragging items or sliders.
    useEffect(() => {
        navigation.setOptions({
            gestureEnabled: !isAdjusting,
        });
    }, [navigation, isAdjusting]);

    const [saving, setSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState(0);
    const [showSignCanvas, setShowSignCanvas] = useState(false);
    const [activeSignature, setActiveSignature] = useState<any | null>(null);
    const [adjustTab, setAdjustTab] = useState<'presets' | 'sliders'>('presets');
    const [allPagesAdjustments, setAllPagesAdjustments] = useState<Record<number, Adjustments>>({});
    const [backupAdjustments, setBackupAdjustments] = useState<Record<number, Adjustments>>({});
    const [currentAdjustments, setCurrentAdjustments] = useState<Adjustments>({ ...DEFAULT_ADJUSTMENTS });
    const [activePreset, setActivePreset] = useState<string>('original');
    const [isComparing, setIsComparing] = useState(false);

    // Signature drawing states & handlers
    const [strokes, setStrokes] = useState<Array<Array<{ x: number; y: number }>>>([]);
    const [selectedColor, setSelectedColor] = useState('#000000');
    const [selectedThickness, setSelectedThickness] = useState(4);
    const [customHex, setCustomHex] = useState('');
    const currentStrokeRef = useRef<Array<{ x: number; y: number }>>([]);

    const canvasPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderTerminationRequest: () => false,
            onPanResponderGrant: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                currentStrokeRef.current = [{ x: locationX, y: locationY }];
                setStrokes((prev) => [...prev, [{ x: locationX, y: locationY }]]);
            },
            onPanResponderMove: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                currentStrokeRef.current.push({ x: locationX, y: locationY });
                setStrokes((prev) => {
                    const next = [...prev];
                    if (next.length > 0) {
                        next[next.length - 1] = [...currentStrokeRef.current];
                    }
                    return next;
                });
            },
            onPanResponderRelease: () => {
                currentStrokeRef.current = [];
            },
        })
    ).current;

    const handleCancelSignature = () => {
        setStrokes([]);
        setShowSignCanvas(false);
    };

    const handleSaveSignature = () => {
        if (strokes.length === 0) {
            Alert.alert('Draw Signature', 'Please draw a signature first.');
            return;
        }

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        strokes.forEach((stroke) => {
            stroke.forEach((p) => {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            });
        });

        if (minX === Infinity || maxX === -Infinity || minY === Infinity || maxY === -Infinity) {
            Alert.alert('Draw Signature', 'Please draw a signature first.');
            return;
        }

        // Add padding of 8px to avoid cropping stroke edges
        const padding = 8;
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        const cropWidth = maxX - minX + padding;
        const cropHeight = maxY - minY + padding;

        if (cropWidth <= 0 || cropHeight <= 0) {
            Alert.alert('Draw Signature', 'Please draw a signature first.');
            return;
        }

        const translatedStrokes = strokes.map((stroke) =>
            stroke.map((p) => ({
                x: p.x - minX,
                y: p.y - minY,
            }))
        );

        const path = translatedStrokes
            .map((stroke) =>
                stroke
                    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
                    .join(' ')
            )
            .join(' ');

        const invertedPath = translatedStrokes
            .map((stroke) =>
                stroke
                    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${(cropHeight - p.y).toFixed(1)}`)
                    .join(' ')
            )
            .join(' ');

        setActiveSignature({
            path,
            invertedPath,
            color: selectedColor,
            strokeWidth: selectedThickness,
            x: 0.3,
            y: 0.35,
            width: 0.4,
            height: 0, // Calculated dynamically when mounted in FloatingSignature
            canvasWidth: cropWidth,
            canvasHeight: cropHeight,
            page: currentPage,
        });

        setStrokes([]);
        setIsAdjusting(true);
        slideInEditFooter();
        setShowSignCanvas(false);
    };

    // Text overlay states & handlers
    const [showTextInputModal, setShowTextInputModal] = useState(false);
    const [activeText, setActiveText] = useState<any | null>(null);
    const [textValue, setTextValue] = useState('');
    const [textColor, setTextColor] = useState('#000000');
    const [textFontSize, setTextFontSize] = useState(24);
    const [textCustomHex, setTextCustomHex] = useState('');

    const handleCancelText = () => {
        setTextValue('');
        setShowTextInputModal(false);
    };

    const handleEditText = () => {
        if (!activeText) return;
        setTextValue(activeText.text);
        setTextColor(activeText.color);
        setTextFontSize(activeText.fontSize);
        const uppercaseColor = activeText.color.toUpperCase();
        if (['#000000', '#007AFF', '#FF3B30', '#34C759', '#AF52DE'].includes(uppercaseColor)) {
            setTextCustomHex('');
        } else {
            setTextCustomHex(activeText.color.replace('#', ''));
        }
        setShowTextInputModal(true);
    };

    const handleSaveText = () => {
        const trimmed = textValue.trim();
        if (!trimmed) {
            Alert.alert('Text Input', 'Please enter some text first.');
            return;
        }

        // If editing an existing text block, maintain its position/dimensions
        if (activeText) {
            setActiveText({
                ...activeText,
                text: trimmed,
                color: textColor,
                fontSize: textFontSize,
            });
        } else {
            // New text block: default size and position
            setActiveText({
                text: trimmed,
                color: textColor,
                fontSize: textFontSize,
                x: 0.3,
                y: 0.4,
                width: 0.4,
                height: 0.1, // Aspect-ratio height scaled dynamically on screen or default
                page: currentPage,
            });
        }

        setTextValue('');
        setIsAdjusting(true);
        slideInEditFooter();
        setShowTextInputModal(false);
    };

    // Slide animation for edit mode footer
    const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

    const slideInEditFooter = () => {
        setEditMode(true);
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
        }).start();
    };

    const slideOutEditFooter = () => {
        Animated.timing(slideAnim, {
            toValue: SCREEN_WIDTH,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            setEditMode(false);
        });
    };

    useEffect(() => {
        if (id) {
            getFileById(id).then((f) => {
                setFile(f);
                setLoading(false);
            }).catch(() => {
                setLoading(false);
            });
        }
    }, [id]);

    // Get image dimensions on load
    useEffect(() => {
        if (file && file.fileType === 'image') {
            Image.getSize(
                file.uri,
                (width, height) => {
                    setImageDimensions({ width, height });
                },
                (err) => {
                    console.warn('Failed to get image size:', err);
                }
            );
        }
    }, [file]);

    // Ensure the current page's thumbnail is generated on demand during adjustment
    useEffect(() => {
        if (!isAdjusting || !file?.uri || file.fileType !== 'pdf' || !currentPage) return;
        if (thumbnails[currentPage] || failedPages.has(currentPage)) return;

        let cancelled = false;
        const generateCurrentPage = async () => {
            try {
                const result = await PdfThumbnail.generate(file.uri, currentPage - 1);
                if (!cancelled && result?.uri) {
                    setThumbnails((prev) => ({ ...prev, [currentPage]: result }));
                }
            } catch (err) {
                console.warn('Failed to generate current page thumbnail on demand:', err);
            }
        };

        generateCurrentPage();
        return () => { cancelled = true; };
    }, [isAdjusting, currentPage, file?.uri, file?.fileType, thumbnails, failedPages]);

    // Load custom page settings when shifting pages
    useEffect(() => {
        const loaded = allPagesAdjustments[currentPage] || { ...DEFAULT_ADJUSTMENTS };
        setCurrentAdjustments(loaded);
        setActivePreset(getMatchingPreset(loaded));
    }, [currentPage, isAdjusting, allPagesAdjustments]);

    // Generate thumbnails sequentially when totalPages is known
    useEffect(() => {
        if (totalPages <= 0 || !file?.uri || file.fileType !== 'pdf') return;

        const queue: number[] = [];
        for (let p = 1; p <= Math.min(totalPages, 30); p++) {
            if (!thumbnails[p] && !failedPages.has(p)) {
                queue.push(p);
            }
        }
        if (queue.length === 0) return;
        setThumbGenQueue(queue);
    }, [totalPages, file?.uri, file?.fileType, thumbnails]);

    useEffect(() => {
        if (thumbGenQueue.length === 0 || !file?.uri) return;

        let cancelled = false;
        const generateNext = async () => {
            const page = thumbGenQueue[0];
            if (page == null || cancelled) return;

            try {
                const result = await PdfThumbnail.generate(file.uri, page - 1);
                if (!cancelled && result?.uri) {
                    setThumbnails((prev) => ({ ...prev, [page]: result }));
                } else if (!cancelled) {
                    setFailedPages((prev) => new Set(prev).add(page));
                }
            } catch {
                setFailedPages((prev) => new Set(prev).add(page));
            }

            if (!cancelled) {
                setThumbGenQueue((prev) => prev.slice(1));
            }
        };

        generateNext();
        return () => { cancelled = true; };
    }, [thumbGenQueue, file?.uri]);

    // Auto-scroll thumbnail strip when currentPage changes
    useEffect(() => {
        if (totalPages <= 0) return;
        const xOffset = (currentPage - 1) * (THUMB_WIDTH + THUMB_GAP) - SCREEN_WIDTH / 2 + THUMB_WIDTH / 2;
        thumbScrollRef.current?.scrollTo({
            x: Math.max(0, xOffset),
            animated: true,
        });
    }, [currentPage, totalPages]);

    const commitRename = async () => {
        const trimmed = renameText.trim();
        if (trimmed && trimmed !== file?.name && id) {
            try {
                await renameFile(id, trimmed);
                setFile((prev) => prev ? { ...prev, name: trimmed } : prev);
            } catch {
                Alert.alert('Error', 'Could not rename file.');
            }
        }
        setIsRenaming(false);
    };

    const handleShare = async () => {
        if (file?.uri) {
            try {
                await Sharing.shareAsync(file.uri);
                posthog.capture('file_shared', {
                    file_type: file.fileType,
                    file_size: file.size,
                });
            } catch {
                Alert.alert('Error', 'Could not share this file.');
            }
        }
    };

    const handleThumbnailPress = (page: number) => {
        setCurrentPage(page);
        pdfRef.current?.setPage(page);
    };

    const handlePdfLoadComplete = (numberOfPages: number) => {
        setTotalPages(numberOfPages);
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getAccentColor = (fileType: string) => {
        switch (fileType) {
            case 'pdf': return '#FF3B30';
            case 'document': return '#0FAFFF';
            case 'image': return '#22C55E';
            default: return '#FF3B30';
        }
    };

    const getFileIcon = (fileType: string) => {
        switch (fileType) {
            case 'pdf': return 'merge';
            case 'document': return 'reorder';
            case 'image': return 'image-to-pdf';
            default: return 'file-size';
        }
    };

    // ---------- Adjust Action Handlers ----------
    const updateAdjustmentValue = (key: keyof Adjustments, val: number) => {
        const next = { ...currentAdjustments, [key]: val };
        setCurrentAdjustments(next);
        setAllPagesAdjustments((prev) => ({ ...prev, [currentPage]: next }));
    };

    const applyPreset = (presetKey: string) => {
        const target = PRESETS[presetKey];
        if (target) {
            setActivePreset(presetKey);
            setCurrentAdjustments({ ...target.values });
            setAllPagesAdjustments((prev) => ({ ...prev, [currentPage]: { ...target.values } }));
        }
    };

    const handleResetPage = () => {
        setActivePreset('original');
        setCurrentAdjustments({ ...DEFAULT_ADJUSTMENTS });
        setAllPagesAdjustments((prev) => {
            const next = { ...prev };
            delete next[currentPage];
            return next;
        });
    };

    const handleResetAll = () => {
        setActivePreset('original');
        setCurrentAdjustments({ ...DEFAULT_ADJUSTMENTS });
        setAllPagesAdjustments({});
    };

    const handleApplyToAllPages = () => {
        const updatedSet: Record<number, Adjustments> = {};
        for (let i = 1; i <= (totalPages || 1); i++) {
            updatedSet[i] = { ...currentAdjustments };
        }
        setAllPagesAdjustments(updatedSet);
        Alert.alert('Status', 'Settings applied to all pages.');
    };

    const handleStartAdjusting = () => {
        setBackupAdjustments({ ...allPagesAdjustments });
        setIsAdjusting(true);
    };

    const handleSaveAdjustments = async () => {
        if (!file || saving) return;
        setSaving(true);
        setSaveProgress(0);

        try {
            let tempModifiedUri = '';
            if (file.fileType === 'image') {
                tempModifiedUri = await applyAdjustmentsToImage(
                    file.uri, 
                    currentAdjustments,
                    (p) => setSaveProgress(p)
                );
            } else {
                tempModifiedUri = await applyAdjustmentsToPDF(
                    file.uri, 
                    allPagesAdjustments,
                    (p) => setSaveProgress(p),
                    activeSignature || undefined,
                    activeText || undefined
                );
            }

            const ext = file.fileType === 'image' ? '.png' : '.pdf';
            const permanentFileName = `file_${Date.now()}${ext}`;
            const permanentUri = `file://${RNBlobUtil.fs.dirs.DocumentDir}/${permanentFileName}`;

            const srcPath = tempModifiedUri.replace('file://', '');
            const destPath = permanentUri.replace('file://', '');
            const oldPath = file.uri.replace('file://', '');

            // Copy to the permanent location in DocumentDir (where we have full write permissions)
            await RNBlobUtil.fs.cp(srcPath, destPath);

            // Clean up the temporary adjusted file and the old file (if different)
            await RNBlobUtil.fs.unlink(srcPath).catch(() => {});
            if (oldPath !== destPath) {
                await RNBlobUtil.fs.unlink(oldPath).catch(() => {});
            }

            // Delete old thumbnail file if it exists (only if it is a separate file, like for PDFs)
            if (file.thumbnail && file.thumbnail !== file.uri) {
                const thumbPath = file.thumbnail.replace('file://', '');
                await RNBlobUtil.fs.unlink(thumbPath).catch(() => {});
            }

            // Get new file size from the permanent file system path
            const stat = await RNBlobUtil.fs.stat(destPath).catch(() => null);
            const fileSize = stat ? stat.size : 0;

            // Generate new thumbnail for the edited file
            let newThumbnail: string | undefined = undefined;
            if (file.fileType === 'image') {
                newThumbnail = permanentUri;
            } else if (file.fileType === 'pdf') {
                try {
                    const result = await PdfThumbnail.generate(permanentUri, 0);
                    if (result && result.uri) {
                        newThumbnail = result.uri;
                    }
                } catch (thumbErr) {
                    console.warn('[handleSaveAdjustments] Failed to generate new PDF thumbnail:', thumbErr);
                }
            }

            const updatedFile: DeviceFile = {
                ...file,
                uri: permanentUri, // Update URI to the permanent DocumentDir location
                size: fileSize,
                modifiedAt: new Date().toISOString(),
                thumbnail: newThumbnail,
            };

            await insertFile(updatedFile);
            setFile(updatedFile);
            setThumbnails({}); // Clear cached preview thumbnails state
            setActiveSignature(null); // Clear active signature after successful save
            setActiveText(null); // Clear active text after successful save

            // Force components (Pdf / ImageZoom) to reload updated contents
            setReloadTrigger(prev => prev + 1);

            // Refresh files store to update homepage/recents lists instantly
            try {
                await useFilesStore.getState().refresh();
            } catch (storeErr) {
                console.warn('Store refresh failed:', storeErr);
            }

            posthog.capture('pdf_edited_saved', {
                file_type: file.fileType,
                has_signature: Boolean(activeSignature),
                has_text_overlay: Boolean(activeText),
                adjusted_pages: Object.keys(allPagesAdjustments).length,
            });
            const typeLabel = file.fileType === 'image' ? 'Image' : 'PDF';
            Alert.alert('Saved', `${typeLabel} updated successfully.`);
            setIsAdjusting(false);
            slideOutEditFooter();
        } catch (err) {
            const typeLabel = file.fileType === 'image' ? 'image' : 'PDF';
            Alert.alert('Error', `Could not save adjusted ${typeLabel}.`);
            console.error('Adjust save error:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleCancelAdjustments = () => {
        setAllPagesAdjustments(backupAdjustments);
        setActiveSignature(null);
        setActiveText(null);
        setIsAdjusting(false);
    };



    // ---------- Loading ----------
    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-[#0A0A0A]" edges={['top']}>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={Palette.accent} />
                </View>
            </SafeAreaView>
        );
    }

    // ---------- Not Found ----------
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

    const accentColor = getAccentColor(file.fileType);

    // ---------- Render ----------
    return (
        <SafeAreaView className="flex-1 bg-[#0A0A0A]" edges={['top']}>
            {/* ===== Header ===== */}
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-[#2C2C2E]">
                {isAdjusting ? (
                    <Pressable
                        onPress={handleCancelAdjustments}
                        className="px-2 py-1"
                    >
                        <Text className="text-[#9C9CA3] font-bold">Cancel</Text>
                    </Pressable>
                ) : (
                    <Pressable
                        onPress={() => router.back()}
                        className="w-10 h-10 items-center justify-center"
                    >
                        <HugeiconsArrowLeft01 />
                    </Pressable>
                )}

                {isRenaming && !isAdjusting ? (
                    /* ---------- Rename Input ---------- */
                    <View className="flex-1 flex-row items-center mx-2">
                        <TextInput
                            ref={renameInputRef}
                            className="flex-1 text-white text-xl font-extrabold text-center border-b pb-1"
                            style={{ borderBottomColor: accentColor, borderBottomWidth: 1 }}
                            value={renameText}
                            onChangeText={setRenameText}
                            onSubmitEditing={commitRename}
                            onBlur={commitRename}
                            autoFocus
                            selectTextOnFocus
                            returnKeyType="done"
                            placeholderTextColor={Palette.textMuted}
                        />
                        <Pressable
                            onPress={commitRename}
                            className="w-10 h-10 items-center justify-center ml-1"
                        >
                            <Svg width="20" height="20" viewBox="0 0 24 24">
                                <Path
                                    fill="none"
                                    stroke={accentColor}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M5 14l5 5L21 8"
                                />
                            </Svg>
                        </Pressable>
                    </View>
                ) : (
                    /* ---------- File Name ---------- */
                    <Pressable
                        onPress={() => {
                            if (isAdjusting) return;
                            setRenameText(file.name);
                            setIsRenaming(true);
                            setTimeout(() => renameInputRef.current?.focus(), 100);
                        }}
                        className="flex-1 flex-row items-center justify-center mx-2"
                        disabled={isAdjusting}
                    >
                        <Text
                            className="text-white text-xl font-extrabold capitalize text-center flex-1"
                            numberOfLines={1}
                            style={{ maxWidth: '65%' }}
                        >
                            {isAdjusting ? `Page ${currentPage}/${totalPages || '?'}` : file.name}
                        </Text>
                        {!isAdjusting && (
                            <View className="ml-2">
                                <Svg width="14" height="14" viewBox="0 0 24 24">
                                    <G fill="none" stroke="#9C9CA3" strokeLinejoin="round" strokeWidth="1.5">
                                        <Path d="M14.074 3.885c.745-.807 1.117-1.21 1.513-1.446a3.1 3.1 0 0 1 3.103-.047c.403.224.787.616 1.555 1.4c.768.785 1.152 1.178 1.37 1.589a3.29 3.29 0 0 1-.045 3.17c-.23.404-.625.785-1.416 1.546l-9.403 9.057c-1.498 1.443-2.247 2.164-3.183 2.53s-1.965.338-4.023.285l-.28-.008c-.626-.016-.94-.024-1.121-.231c-.183-.207-.158-.526-.108-1.164l.027-.346c.14-1.796.21-2.694.56-3.502s.956-1.463 2.166-2.774zM13 4l7 7" />
                                        <Path strokeLinecap="round" d="M14 22h8" />
                                    </G>
                                </Svg>
                            </View>
                        )}
                    </Pressable>
                )}

                {isAdjusting ? (
                    <Pressable
                        onPress={handleSaveAdjustments}
                        disabled={saving}
                        className="px-3 py-1"
                    >
                        <Text style={{ color: saving ? Palette.textMuted : accentColor }} className="font-bold">Done</Text>
                    </Pressable>
                ) : (
                    <Pressable
                        onPress={handleShare}
                        className="w-10 h-10 items-center justify-center"
                    >
                        <HugeiconsShare03 />
                    </Pressable>
                )}
            </View>

            {/* ===== File Content (flex: 1) ===== */}
            <View className="flex-1 relative">
                {isAdjusting ? (
                    <AdjustPreview
                        file={file}
                        currentPage={currentPage}
                        thumbnails={thumbnails}
                        imageDimensions={imageDimensions}
                        currentAdjustments={currentAdjustments}
                        isComparing={isComparing}
                        activeSignature={activeSignature}
                        setActiveSignature={setActiveSignature}
                        activeText={activeText}
                        setActiveText={setActiveText}
                        onEditText={handleEditText}
                    />
                ) : file.fileType === 'pdf' ? (
                    <View className="flex-1">
                        <Pdf
                            key={`pdf-${reloadTrigger}`}
                            ref={pdfRef}
                            source={{ uri: file.uri, cache: false }}
                            onLoadComplete={handlePdfLoadComplete}
                            onPageChanged={(page) => setCurrentPage(page)}
                            onError={(error) => console.warn('PDF error:', error)}
                            style={{ flex: 1, backgroundColor: '#0A0A0A' }}
                            enablePaging={true}
                            horizontal={false}
                            trustAllCerts={false}
                        />
                    </View>
                ) : file.fileType === 'image' ? (
                    <View className="flex-1">
                        <ImageZoom
                            key={`img-${reloadTrigger}`}
                            source={{ uri: `${file.uri}?t=${reloadTrigger}` }}
                            maxZoom={5}
                            minZoom={1}
                            zoomStep={0.5}
                            initialZoom={1}
                            bindToBorders={true}
                            style={{ flex: 1, backgroundColor: '#0A0A0A' }}
                            resizeMode="contain"
                        />
                    </View>
                ) : (
                    /* Document (Word, etc.) — preview not available */
                    <View className="flex-1 items-center justify-center px-6">
                        <View
                            className="w-32 h-32 rounded-3xl items-center justify-center mb-6"
                            style={{ backgroundColor: accentColor + '20' }}
                        >
                            <HugeIcon
                                name={getFileIcon(file.fileType)}
                                size={56}
                                color={accentColor}
                            />
                        </View>
                        <Text className="text-white text-xl font-black text-center px-4 mb-2">
                            Preview not available
                        </Text>
                        <Text className="text-[#9C9CA3] text-sm font-bold text-center px-4">
                            {file.name}
                        </Text>
                        <Text className="text-[#9C9CA3] text-sm font-bold mt-1">
                            {formatSize(file.size)}
                        </Text>
                        <Text className="text-[#5C5C61] text-xs font-bold mt-1 uppercase">
                            {file.fileType}
                        </Text>
                    </View>
                )}
            </View>

            {/* ===== Thumbnail Strip (PDF only) ===== */}
            {!isAdjusting && file.fileType === 'pdf' && totalPages > 0 && (
                <View className="border-t border-[#2C2C2E] py-3">
                    <ScrollView
                        ref={thumbScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{
                            paddingHorizontal: 16,
                            gap: THUMB_GAP,
                        }}
                    >
                        {Array.from({ length: Math.min(totalPages, 30) }, (_, i) => i + 1).map((page) => {
                            const isSelected = page === currentPage;
                            const thumb = thumbnails[page];
                            const thumbUri = thumb?.uri;

                            return (
                                <Pressable
                                    key={page}
                                    onPress={() => handleThumbnailPress(page)}
                                    className="items-center"
                                    style={{ width: THUMB_WIDTH }}
                                >
                                    <View
                                        className="rounded-lg overflow-hidden border-2"
                                        style={{
                                            width: THUMB_WIDTH,
                                            height: THUMB_HEIGHT,
                                            backgroundColor: '#1C1C1E',
                                            borderColor: isSelected ? accentColor : 'transparent',
                                        }}
                                    >
                                        {thumbUri ? (
                                            <Image
                                                source={{ uri: thumbUri }}
                                                style={{ width: '100%', height: '100%' }}
                                                resizeMode="cover"
                                            />
                                        ) : failedPages.has(page) ? (
                                            <View className="flex-1 items-center justify-center">
                                                <HugeIcon name="recents" size={16} color={Palette.textMuted} />
                                            </View>
                                        ) : (
                                            <View className="flex-1 items-center justify-center">
                                                <ActivityIndicator size="small" color={Palette.textMuted} />
                                            </View>
                                        )}
                                    </View>
                                    <Text
                                        className="text-[10px] font-bold mt-1"
                                        style={{ color: isSelected ? accentColor : Palette.textMuted }}
                                    >
                                        {page}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* ===== Footer Panel / Dynamic View States ===== */}
            <View style={{ overflow: 'hidden' }}>
                {isAdjusting ? (
                    /* ---------- ADVANCED ADJUSTMENT PANEL (Active Adjust) ---------- */
                    <View className="border-t border-[#2C2C2E] bg-[#0A0A0A] px-4 pt-2 pb-14">
                        {/* Adjustment Mode Navigation tabs */}
                        <View className="flex-row bg-[#1C1C1E] rounded-xl p-1 mb-4">
                            <Pressable
                                onPress={() => setAdjustTab('presets')}
                                className="flex-1 p-2 rounded-lg items-center"
                                style={{ backgroundColor: adjustTab === 'presets' ? accentColor : 'transparent' }}
                            >
                                <Text className="text-sm font-bold" style={{ color: adjustTab === 'presets' ? Palette.white : Palette.textMuted }}>
                                    Quick Looks
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => setAdjustTab('sliders')}
                                className="flex-1 p-2 rounded-lg items-center"
                                style={{ backgroundColor: adjustTab === 'sliders' ? accentColor : 'transparent' }}
                            >
                                <Text className="text-sm font-bold" style={{ color: adjustTab === 'sliders' ? Palette.white : Palette.textMuted }}>
                                    Fine Adjustments
                                </Text>
                            </Pressable>
                        </View>

                        {/* Presets Grid */}
                        {adjustTab === 'presets' && (
                            <View className="mb-4">
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
                                    {Object.entries(PRESETS).map(([key, item]) => {
                                        const isActive = activePreset === key;
                                        return (
                                            <Pressable
                                                key={key}
                                                onPress={() => applyPreset(key)}
                                                className="px-4 py-3 rounded-lg"
                                                style={{
                                                    backgroundColor: isActive ? accentColor : '#1C1C1E',
                                                    borderColor: isActive ? accentColor : '#2C2C2E',
                                                    borderWidth: 1,
                                                }}
                                            >
                                                <Text
                                                    className="text-xs font-bold"
                                                    style={{ color: isActive ? Palette.white : Palette.text }}
                                                >
                                                    {item.label}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        {/* Dynamic Range Sliders Container */}
                        {adjustTab === 'sliders' && (
                            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                                <CustomSlider
                                    label="Brightness"
                                    min={0}
                                    max={200}
                                    value={currentAdjustments.brightness}
                                    onChange={(v) => updateAdjustmentValue('brightness', v)}
                                    suffix="%"
                                />
                                <CustomSlider
                                    label="Contrast"
                                    min={0}
                                    max={200}
                                    value={currentAdjustments.contrast}
                                    onChange={(v) => updateAdjustmentValue('contrast', v)}
                                    suffix="%"
                                />
                                <CustomSlider
                                    label="Saturation"
                                    min={0}
                                    max={200}
                                    value={currentAdjustments.saturation}
                                    onChange={(v) => updateAdjustmentValue('saturation', v)}
                                    suffix="%"
                                />
                                <CustomSlider
                                    label="Grayscale"
                                    min={0}
                                    max={100}
                                    value={currentAdjustments.grayscale}
                                    onChange={(v) => updateAdjustmentValue('grayscale', v)}
                                    suffix="%"
                                />
                                <CustomSlider
                                    label="Invert Colors"
                                    min={0}
                                    max={100}
                                    value={currentAdjustments.invert}
                                    onChange={(v) => updateAdjustmentValue('invert', v)}
                                    suffix="%"
                                />
                                <CustomSlider
                                    label="Sepia"
                                    min={0}
                                    max={100}
                                    value={currentAdjustments.sepia}
                                    onChange={(v) => updateAdjustmentValue('sepia', v)}
                                    suffix="%"
                                />
                                <CustomSlider
                                    label="Hue Shift"
                                    min={0}
                                    max={360}
                                    value={currentAdjustments.hueShift}
                                    onChange={(v) => updateAdjustmentValue('hueShift', v)}
                                    suffix="°"
                                />
                            </ScrollView>
                        )}

                        {/* Live Comparison and Reset Utility Bar */}
                        <View className="flex-row items-center justify-between pt-3 gap-3">
                            <Pressable
                                onPress={handleResetAll}
                                className=""
                            >
                                <Svg width="20" height="20" viewBox="0 0 24 24"><Path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 2v3.132c0 .294.367.427.555.201A9.97 9.97 0 0 1 12.005 2C17.525 2 22 6.477 22 12c0 3.958-2.299 7.38-5.633 9m-4.632 1q.7 0 1.376-.092M2.265 8.667Q2.097 9.263 2 9.869m.035 3.67q.105.6.274 1.186m1.524 3.271q.358.531.774 1.019M7.43 21.36q.53.303 1.103.547" /></Svg>
                            </Pressable>

                            <Pressable
                                onPress={handleResetPage}
                                className="px-3 py-2 bg-[#1C1C1E] flex flex-row items-center gap-2 rounded-lg"
                            >
                                <Svg width="20" height="20" viewBox="0 0 24 24"><Path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18 6L6 18m12 0L6 6" /></Svg>
                                <Text className="text-[#9C9CA3] text-xs font-bold">Reset</Text>
                            </Pressable>

                            <Pressable
                                onPressIn={() => setIsComparing(true)}
                                onPressOut={() => setIsComparing(false)}
                                className="px-3 py-3 bg-[#1C1C1E] rounded-lg flex-row items-center"
                            >
                                <Text className="text-white text-xs font-bold">Hold to Compare</Text>
                            </Pressable>

                            <Pressable
                                onPress={handleApplyToAllPages}
                                className="px-3 py-3 rounded-lg"
                                style={{ backgroundColor: accentColor + '20' }}
                            >
                                <Text style={{ color: accentColor }} className="text-xs font-bold">Apply All Pages</Text>
                            </Pressable>
                        </View>
                    </View>
                ) : (
                    /* ---------- Standard Menu Footer views ---------- */
                    <View>
                        {/* Default Footer (always rendered when not editing) */}
                        <View className="border-t border-[#2C2C2E] px-4 pt-2 pb-14 items-start bg-[#0A0A0A]">
                            <View className="flex-row w-full" style={{ justifyContent: 'space-between' }}>
                                {/* Pages — PDF only */}
                                <Pressable
                                    onPress={() => {
                                        if (file?.fileType !== 'pdf') {
                                            Alert.alert('PDF Only', 'Page management is only available for PDF files.');
                                            return;
                                        }
                                        router.push({ pathname: '/file-viewer/pages', params: { id } } as any);
                                    }}
                                    className="flex-1 py-3 items-center active:opacity-80"
                                    style={{ opacity: file?.fileType === 'pdf' ? 1 : 0.35 }}
                                >
                                    <HugeiconsFiles01 />
                                    <Text className="text-[#9C9CA3] text-[10px] font-bold mt-1">Pages</Text>
                                </Pressable>

                                {/* Edit — PDF & image supported; doc not supported */}
                                <Pressable
                                    onPress={() => {
                                        if (file?.fileType === 'document') {
                                            Alert.alert('Not Supported', 'Visual editing is not available for document files.');
                                            return;
                                        }
                                        slideInEditFooter();
                                    }}
                                    className="flex-1 py-3 items-center active:opacity-80"
                                    style={{ opacity: file?.fileType === 'document' ? 0.35 : 1 }}
                                >
                                    <HugeIcon name="watermark" size={24} color={file?.fileType === 'document' ? '#555' : Palette.text} />
                                    <Text className="text-[#9C9CA3] text-[10px] font-bold mt-1">Edit</Text>
                                </Pressable>

                                {/* To PDF — image & doc only (already PDF = disabled) */}
                                <Pressable
                                    onPress={() => {
                                        if (file?.fileType === 'pdf') {
                                            Alert.alert('Already PDF', 'This file is already a PDF.');
                                            return;
                                        }
                                        if (file?.fileType === 'image') {
                                            router.push({
                                                pathname: '/tool/images-to-pdf',
                                                params: {
                                                    images: JSON.stringify([file.uri])
                                                }
                                            } as any);
                                            return;
                                        }
                                        Alert.alert('Coming Soon', 'Convert to PDF feature is coming soon.');
                                    }}
                                    className="flex-1 py-3 items-center active:opacity-80"
                                    style={{ opacity: file?.fileType === 'pdf' ? 0.35 : 1 }}
                                >
                                    <HugeiconsPdf02 />
                                    <Text className="text-[#9C9CA3] text-[10px] font-bold mt-1">To PDF</Text>
                                </Pressable>

                                {/* Reduce Size — PDF only */}
                                <Pressable
                                    onPress={() => {
                                        if (file?.fileType !== 'pdf') {
                                            Alert.alert('PDF Only', 'Size reduction is only available for PDF files.');
                                            return;
                                        }
                                        router.push({ pathname: '/file-viewer/reduce-size', params: { id } } as any);
                                    }}
                                    className="flex-1 py-3 items-center active:opacity-80"
                                    style={{ opacity: file?.fileType === 'pdf' ? 1 : 0.35 }}
                                >
                                    <HugeiconsFileSync />
                                    <Text className="text-[#9C9CA3] text-[10px] font-bold mt-1">Reduce Size</Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Edit Mode Overlay Drawer (Slides over from right side) */}
                        <Animated.View
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                transform: [{ translateX: slideAnim }],
                            }}
                            className="border-t border-[#2C2C2E] px-4 pt-2 pb-14 items-start bg-[#0A0A0A]"
                        >
                            <View className="flex-row w-full items-center" style={{ justifyContent: 'space-between' }}>
                                <Pressable
                                    onPress={slideOutEditFooter}
                                    className="py-3 pr-3 items-center active:opacity-80"
                                >
                                    <Svg width="24" height="24" viewBox="0 0 24 24">
                                        <Path
                                            fill="none"
                                            stroke="#fff"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="1.5"
                                            d="M15 18s-6-4.419-6-6s6-6 6-6"
                                        />
                                    </Svg>
                                </Pressable>

                                {/* Sign */}
                                <Pressable
                                    onPress={() => setShowSignCanvas(true)}
                                    className="flex-1 py-3 items-center active:opacity-80"
                                >
                                    <Svg width="24" height="24" viewBox="0 0 24 24">
                                        <G fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
                                            <Path d="M5.076 17C4.089 4.545 12.912 1.012 19.973 2.224c.286 4.128-1.734 5.673-5.58 6.387c.742.776 2.055 1.753 1.913 2.974c-.1.868-.69 1.295-1.87 2.147C11.85 15.6 8.854 16.78 5.076 17" />
                                            <Path d="M4 22c0-6.5 3.848-9.818 6.5-12" />
                                        </G>
                                    </Svg>
                                    <Text className="text-[#9C9CA3] text-[10px] font-bold mt-1">
                                        Sign
                                    </Text>
                                </Pressable>

                                {/* Doodle */}
                                <Pressable
                                    onPress={() => Alert.alert('Info', 'Doodle feature coming soon.')}
                                    className="flex-1 py-3 items-center active:opacity-80"
                                >
                                    <Svg width="24" height="24" viewBox="0 0 24 24">
                                        <G fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
                                            <Path d="M16.946 3.173c.587-.587.88-.88 1.206-1.021c.469-.203 1-.203 1.469 0c.325.14.619.434 1.206 1.021s.88.881 1.021 1.206c.203.469.203 1 0 1.469c-.14.325-.434.619-1.021 1.206l-5.022 5.022c-1.237 1.237-1.855 1.855-2.63 2.222s-1.646.452-3.387.624L9 15l.078-.788c.172-1.741.257-2.612.624-3.387s.985-1.393 2.222-2.63z" />
                                            <Path strokeLinecap="round" d="M6 15H3.75a1.75 1.75 0 1 0 0 3.5h9.5a1.75 1.75 0 1 1 0 3.5H11" />
                                        </G>
                                    </Svg>
                                    <Text className="text-[#9C9CA3] text-[10px] font-bold mt-1">
                                        Doodle
                                    </Text>
                                </Pressable>

                                {/* Text */}
                                <Pressable
                                    onPress={() => setShowTextInputModal(true)}
                                    className="flex-1 py-3 items-center active:opacity-80"
                                >
                                    <Svg width="24" height="24" viewBox="0 0 24 24">
                                        <Path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m13 17l-1.929-4.5M3 17l1.929-4.5m0 0l2.094-4.887C7.213 7.172 7.547 7 8 7s.788.172.977.613l2.094 4.887m-6.142 0h6.142M16 3c.833-.007 2 .5 2.5 1.5m0 0C19 3.5 20.167 3 21 3m-2.5 1.5v15M21 21c-.833.007-2-.5-2.5-1.5m0 0c-.5 1-1.667 1.5-2.5 1.5m4-9h-3" />
                                    </Svg>
                                    <Text className="text-[#9C9CA3] text-[10px] font-bold mt-1">
                                        Text
                                    </Text>
                                </Pressable>

                                {/* Adjust Option */}
                                <Pressable
                                    onPress={handleStartAdjusting}
                                    className="flex-1 py-3 items-center active:opacity-80"
                                >
                                    <Svg width="24" height="24" viewBox="0 0 24 24">
                                        <Path fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.58 9.71a6 6 0 0 0-7.16 3.58m7.16-3.58A6 6 0 1 1 12 19.972M17.58 9.71a6 6 0 1 0-11.16 0m4 3.58A6 6 0 0 0 10 15.5c0 1.777.773 3.374 2 4.472m-1.58-6.682a6.01 6.01 0 0 1-4-3.58m0 0A6 6 0 1 0 12 19.972" />
                                    </Svg>
                                    <Text className="text-[#9C9CA3] text-[10px] font-bold mt-1">
                                        Adjust
                                    </Text>
                                </Pressable>
                            </View>
                        </Animated.View>
                    </View>
                )}
            </View>

            {/* ===== Progress Saving Modal ===== */}
            <Modal
                transparent={true}
                visible={saving}
                animationType="fade"
            >
                <View className="flex-1 justify-center items-center bg-black/80">
                    <View className="bg-[#1C1C1E] border border-white/10 rounded-2xl p-6 w-[80%] max-w-[300px] items-center shadow-2xl">
                        <ActivityIndicator size="large" color={accentColor} className="mb-4" />
                        
                        <Text className="text-white font-black text-lg mb-1 text-center">
                            Saving Adjustments
                        </Text>
                        
                        <Text className="text-gray-400 text-xs mb-4 text-center">
                            {file?.fileType === 'pdf'
                                ? `Processing PDF pages...`
                                : `Applying image filters...`}
                        </Text>

                        {/* Progress Bar Container */}
                        <View className="w-full bg-white/10 h-2 rounded-full overflow-hidden mb-2">
                            <View 
                                style={{ 
                                    width: `${Math.round(saveProgress * 100)}%`,
                                    backgroundColor: accentColor 
                                }} 
                                className="h-full rounded-full"
                            />
                        </View>

                        <Text style={{ color: accentColor }} className="text-sm font-black">
                            {Math.round(saveProgress * 100)}%
                        </Text>
                    </View>
                </View>
            </Modal>

            {/* ===== Signature Canvas Modal ===== */}
            <Modal
                visible={showSignCanvas}
                animationType="slide"
                transparent={false}
            >
                <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }} className="flex-1 bg-[#0A0A0A]">
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-4 py-4 border-b border-[#2C2C2E]">
                        <Pressable
                            onPress={handleCancelSignature}
                            className="px-2 py-1"
                        >
                            <Text className="text-[#9C9CA3] font-bold">Cancel</Text>
                        </Pressable>
                        <Text className="text-white text-lg font-bold">Draw Signature</Text>
                        <Pressable
                            onPress={handleSaveSignature}
                            className="px-3 py-1"
                        >
                            <Text style={{ color: accentColor }} className="font-bold">Done</Text>
                        </Pressable>
                    </View>

                    {/* Canvas Area */}
                    <View className="p-4 flex-1 w-full">
                        <View 
                            className="flex-1 w-full bg-white rounded-2xl overflow-hidden relative shadow-lg"
                            style={{
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 5,
                            }}
                        >
                            {/* Dotted Signing Guideline */}
                            <View className="absolute bottom-20 left-6 right-6 border-b border-dashed border-gray-300 pointer-events-none" />
                            <Text className="absolute bottom-6 left-6 text-gray-400 text-[10px] font-bold tracking-wider uppercase pointer-events-none">
                                Sign Above This Line
                            </Text>

                            {/* Floating Clear Button */}
                            {strokes.length > 0 && (
                                <Pressable
                                    onPress={() => setStrokes([])}
                                    style={{
                                        position: 'absolute',
                                        top: 16,
                                        right: 16,
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        backgroundColor: '#F2F2F7',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        zIndex: 10,
                                    }}
                                    className="active:scale-95 shadow-sm"
                                >
                                    <Svg width="18" height="18" viewBox="0 0 24 24">
                                        <Path
                                            fill="none"
                                            stroke="#FF3B30"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"
                                        />
                                    </Svg>
                                </Pressable>
                            )}

                            {/* Interactive Drawing Layer */}
                            <View className="flex-1" {...canvasPanResponder.panHandlers}>
                                <Svg style={{ flex: 1 }}>
                                    {strokes.map((stroke, index) => {
                                        const pathData = stroke
                                            .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
                                            .join(' ');
                                        return (
                                            <Path
                                                key={index}
                                                d={pathData}
                                                fill="none"
                                                stroke={selectedColor}
                                                strokeWidth={selectedThickness}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        );
                                    })}
                                </Svg>
                            </View>
                        </View>
                    </View>

                    {/* Color and Thickness controls */}
                    <View className="border-t border-[#2C2C2E] bg-[#1C1C1E] px-6 pt-5 pb-8">
                        {/* Preset Colors & Custom HEX Picker */}
                        <View className="mb-6">
                            <Text className="text-[#9C9CA3] text-xs font-bold mb-3 uppercase tracking-wider">
                                Signature Color
                            </Text>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row gap-3">
                                    {['#000000', '#007AFF', '#FF3B30', '#34C759', '#AF52DE'].map((color) => {
                                        const isSelected = selectedColor.toLowerCase() === color.toLowerCase();
                                        return (
                                            <Pressable
                                                key={color}
                                                onPress={() => {
                                                    setSelectedColor(color);
                                                    setCustomHex('');
                                                }}
                                                style={{
                                                    backgroundColor: color,
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 16,
                                                    borderWidth: isSelected ? 3 : 0,
                                                    borderColor: isSelected ? '#ffffff' : 'transparent',
                                                }}
                                            />
                                        );
                                    })}
                                </View>

                                {/* Custom Hex input field */}
                                <View className="flex-row items-center bg-[#2C2C2E] rounded-lg px-3 py-2 w-[110px]">
                                    <Text className="text-[#9C9CA3] text-xs font-bold mr-1">#</Text>
                                    <TextInput
                                        placeholder="HEX"
                                        placeholderTextColor="#5C5C61"
                                        className="text-white text-xs font-bold flex-1 p-0 m-0"
                                        value={customHex}
                                        onChangeText={(val) => {
                                            const sanitized = val.replace(/[^a-fA-F0-9]/g, '').slice(0, 6);
                                            setCustomHex(sanitized);
                                            if (sanitized.length === 6) {
                                                setSelectedColor(`#${sanitized}`);
                                            }
                                        }}
                                        maxLength={6}
                                        autoCapitalize="characters"
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Custom Slider for thickness */}
                        <View className="mb-4">
                            <CustomSlider
                                label="Stroke Thickness"
                                min={2}
                                max={12}
                                value={selectedThickness}
                                onChange={setSelectedThickness}
                                suffix="px"
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ===== Text Input Modal ===== */}
            <Modal
                visible={showTextInputModal}
                animationType="slide"
                transparent={false}
            >
                <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }} className="flex-1 bg-[#0A0A0A]">
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-4 py-4 border-b border-[#2C2C2E]">
                        <Pressable
                            onPress={handleCancelText}
                            className="px-2 py-1"
                        >
                            <Text className="text-[#9C9CA3] font-bold">Cancel</Text>
                        </Pressable>
                        <Text className="text-white text-lg font-bold">Edit Text</Text>
                        <Pressable
                            onPress={handleSaveText}
                            className="px-3 py-1"
                        >
                            <Text style={{ color: accentColor }} className="font-bold">Done</Text>
                        </Pressable>
                    </View>

                    {/* Text Input Area */}
                    <View className="p-4 flex-1 w-full justify-center">
                        <View 
                            className="flex-1 w-full bg-[#1C1C1E] rounded-2xl overflow-hidden relative shadow-lg p-4"
                            style={{
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 5,
                            }}
                        >
                            <TextInput
                                placeholder="Type your text here..."
                                placeholderTextColor="#5C5C61"
                                className="text-white text-xl font-bold flex-1"
                                style={{
                                    textAlignVertical: 'top',
                                    color: '#ffffff',
                                }}
                                multiline={true}
                                value={textValue}
                                onChangeText={setTextValue}
                                autoFocus={true}
                            />
                        </View>
                    </View>

                    {/* Color and Font Size controls */}
                    <View className="border-t border-[#2C2C2E] bg-[#1C1C1E] px-6 pt-5 pb-8">
                        {/* Preset Colors & Custom HEX Picker */}
                        <View className="mb-6">
                            <Text className="text-[#9C9CA3] text-xs font-bold mb-3 uppercase tracking-wider">
                                Text Color
                            </Text>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row gap-3">
                                    {['#000000', '#007AFF', '#FF3B30', '#34C759', '#AF52DE', '#FFFFFF'].map((color) => {
                                        const isSelected = textColor.toLowerCase() === color.toLowerCase();
                                        return (
                                            <Pressable
                                                key={color}
                                                onPress={() => {
                                                    setTextColor(color);
                                                    setTextCustomHex('');
                                                }}
                                                style={{
                                                    backgroundColor: color,
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 16,
                                                    borderWidth: isSelected ? 3 : 0,
                                                    borderColor: isSelected ? (color === '#FFFFFF' ? '#000000' : '#ffffff') : 'transparent',
                                                }}
                                            />
                                        );
                                    })}
                                </View>

                                {/* Custom Hex input field */}
                                <View className="flex-row items-center bg-[#2C2C2E] rounded-lg px-3 py-2 w-[110px]">
                                    <Text className="text-[#9C9CA3] text-xs font-bold mr-1">#</Text>
                                    <TextInput
                                        placeholder="HEX"
                                        placeholderTextColor="#5C5C61"
                                        className="text-white text-xs font-bold flex-1 p-0 m-0"
                                        value={textCustomHex}
                                        onChangeText={(val) => {
                                            const sanitized = val.replace(/[^a-fA-F0-9]/g, '').slice(0, 6);
                                            setTextCustomHex(sanitized);
                                            if (sanitized.length === 6) {
                                                setTextColor(`#${sanitized}`);
                                            }
                                        }}
                                        maxLength={6}
                                        autoCapitalize="characters"
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Custom Slider for font size */}
                        <View className="mb-4">
                            <CustomSlider
                                label="Font Size"
                                min={12}
                                max={72}
                                value={textFontSize}
                                onChange={setTextFontSize}
                                suffix="px"
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}