/**
 * pdfAdjustmentService.ts
 *
 * Strategy: "Native PDF Manipulation"
 *  1. Adjust color-setting operators (rg, RG, g, G, k, K) directly in page content streams.
 *  2. Prepend a solid background rectangle adjusted by the same ColorMatrix (so inverted/tinted pages look correct).
 *  3. Find all embedded Image XObjects.
 *  4. Extract their bytes using pdf-lib's decodePDFRawStream.
 *  5. Apply the ColorMatrix pixel manipulations on images (converting JPEG/raw streams to edited PNGs).
 *  6. Embed the adjusted PNGs and swap their references in the resources dictionary.
 */

import { Buffer } from 'buffer';
import * as ImageManipulator from 'expo-image-manipulator';
import {
    decodePDFRawStream,
    PDFArray,
    PDFDict,
    PDFDocument,
    PDFName,
    PDFRawStream,
    PDFRef,
    PDFStream,
    rgb,
    StandardFonts,
} from 'pdf-lib';
import RNBlobUtil from 'react-native-blob-util';
import UPNG from 'upng-js';
// @ts-ignore
import pako from 'pako';

// ─────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────

export interface PDFSignature {
    path: string;
    invertedPath: string;
    color: string;
    strokeWidth: number;
    x: number;
    y: number;
    width: number;
    height: number;
    page: number; // 1-indexed page
    canvasWidth: number;
    canvasHeight: number;
}

export interface PDFText {
    text: string;
    color: string;
    fontSize: number;
    x: number;
    y: number;
    width: number;
    height: number;
    page: number; // 1-indexed page
}

export interface Adjustments {
    brightness: number;   // 0–200  (100 = no change)
    contrast: number;     // 0–200
    saturation: number;   // 0–200
    grayscale: number;    // 0–100
    invert: number;       // 0–100
    sepia: number;        // 0–100
    hueShift: number;     // 0–360 degrees
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    invert: 0,
    sepia: 0,
    hueShift: 0,
};

// ─────────────────────────────────────────────
// 1. ColorMatrix math
// ─────────────────────────────────────────────

type Matrix = number[]; // 20 numbers, 5 columns × 4 rows

function identity(): Matrix {
    return [
        1, 0, 0, 0, 0,
        0, 1, 0, 0, 0,
        0, 0, 1, 0, 0,
        0, 0, 0, 1, 0,
    ];
}

function multiply(a: Matrix, b: Matrix): Matrix {
    const result: number[] = new Array(20).fill(0);
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
            let sum = 0;
            for (let k = 0; k < 4; k++) {
                sum += a[row * 5 + k] * b[k * 5 + col];
            }
            if (col === 4) sum += a[row * 5 + 4];
            result[row * 5 + col] = sum;
        }
    }
    return result;
}

function brightnessMatrix(val: number): Matrix {
    const b = val / 100;
    return [
        b, 0, 0, 0, 0,
        0, b, 0, 0, 0,
        0, 0, b, 0, 0,
        0, 0, 0, 1, 0,
    ];
}

function contrastMatrix(val: number): Matrix {
    const c = val / 100;
    const t = (1 - c) * 0.5;
    return [
        c, 0, 0, 0, t,
        0, c, 0, 0, t,
        0, 0, c, 0, t,
        0, 0, 0, 1, 0,
    ];
}

const LR = 0.2126, LG = 0.7152, LB = 0.0722;

function saturationMatrix(val: number): Matrix {
    const s = val / 100;
    return [
        LR + s * (1 - LR), LG - s * LG, LB - s * LB, 0, 0,
        LR - s * LR, LG + s * (1 - LG), LB - s * LB, 0, 0,
        LR - s * LR, LG - s * LG, LB + s * (1 - LB), 0, 0,
        0, 0, 0, 1, 0,
    ];
}

function grayscaleMatrix(val: number): Matrix {
    const g = val / 100;
    return [
        LR * g + (1 - g), LG * g, LB * g, 0, 0,
        LR * g, LG * g + (1 - g), LB * g, 0, 0,
        LR * g, LG * g, LB * g + (1 - g), 0, 0,
        0, 0, 0, 1, 0,
    ];
}

function invertMatrix(val: number): Matrix {
    const t = val / 100;
    return [
        1 - 2 * t, 0, 0, 0, t,
        0, 1 - 2 * t, 0, 0, t,
        0, 0, 1 - 2 * t, 0, t,
        0, 0, 0, 1, 0,
    ];
}

function sepiaMatrix(val: number): Matrix {
    const s = val / 100;
    return [
        1 - s * 0.607, s * 0.769, s * 0.189, 0, 0,
        s * 0.349, 1 - s * 0.314, s * 0.168, 0, 0,
        s * 0.272, s * 0.534, 1 - s * 0.869, 0, 0,
        0, 0, 0, 1, 0,
    ];
}

function hueRotateMatrix(deg: number): Matrix {
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return [
        LR + cos * (1 - LR) - sin * LR, LG - cos * LG - sin * LG, LB - cos * LB + sin * (1 - LB), 0, 0,
        LR - cos * LR + sin * 0.143, LG + cos * (1 - LG) + sin * 0.140, LB - cos * LB - sin * 0.283, 0, 0,
        LR - cos * LR - sin * (1 - LR), LG - cos * LG + sin * LG, LB + cos * (1 - LB) + sin * LB, 0, 0,
        0, 0, 0, 1, 0,
    ];
}

export function buildColorMatrix(adj: Adjustments): Matrix {
    let m = identity();
    m = multiply(m, brightnessMatrix(adj.brightness));
    m = multiply(m, contrastMatrix(adj.contrast));
    m = multiply(m, saturationMatrix(adj.saturation));
    m = multiply(m, grayscaleMatrix(adj.grayscale));
    m = multiply(m, invertMatrix(adj.invert));
    m = multiply(m, sepiaMatrix(adj.sepia));
    m = multiply(m, hueRotateMatrix(adj.hueShift));
    return m;
}

export function isIdentityAdjustment(adj: Adjustments): boolean {
    return (
        adj.brightness === 100 &&
        adj.contrast === 100 &&
        adj.saturation === 100 &&
        adj.grayscale === 0 &&
        adj.invert === 0 &&
        adj.sepia === 0 &&
        adj.hueShift === 0
    );
}

export function applyColorMatrixToPixels(pixels: Uint8ClampedArray, m: Matrix): void {
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i] / 255;
        const g = pixels[i + 1] / 255;
        const b = pixels[i + 2] / 255;
        const a = pixels[i + 3] / 255;

        pixels[i] = Math.min(255, Math.max(0, (m[0] * r + m[1] * g + m[2] * b + m[3] * a + m[4]) * 255));
        pixels[i + 1] = Math.min(255, Math.max(0, (m[5] * r + m[6] * g + m[7] * b + m[8] * a + m[9]) * 255));
        pixels[i + 2] = Math.min(255, Math.max(0, (m[10] * r + m[11] * g + m[12] * b + m[13] * a + m[14]) * 255));
        pixels[i + 3] = Math.min(255, Math.max(0, (m[15] * r + m[16] * g + m[17] * b + m[18] * a + m[19]) * 255));
    }
}

// ─────────────────────────────────────────────
// 2. Tokenizer and conversion helpers
// ─────────────────────────────────────────────

function bytesToLatin1String(bytes: Uint8Array): string {
    const CHUNK = 8192;
    let result = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
        result += String.fromCharCode(...(bytes.subarray(i, i + CHUNK) as any));
    }
    return result;
}

function asciiStringToBytes(str: string): Uint8Array {
    const out = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
    return out;
}

function tokenize(src: string): string[] {
    const tokens: string[] = [];
    let i = 0;

    while (i < src.length) {
        const ch = src[i];

        if (/\s/.test(ch)) { i++; continue; }

        if (ch === '%') {
            while (i < src.length && src[i] !== '\n' && src[i] !== '\r') i++;
            continue;
        }

        if (ch === '(') {
            let depth = 0;
            let s = '';
            while (i < src.length) {
                const c = src[i];
                if (c === '\\') { s += src[i] + src[i + 1]; i += 2; continue; }
                if (c === '(') depth++;
                if (c === ')') { if (--depth === 0) { s += c; i++; break; } }
                s += c; i++;
            }
            tokens.push(s);
            continue;
        }

        if (ch === '<' && src[i + 1] !== '<') {
            let s = '<';
            i++;
            while (i < src.length && src[i] !== '>') { s += src[i]; i++; }
            s += '>'; i++;
            tokens.push(s);
            continue;
        }

        if (ch === '<' && src[i + 1] === '<') { tokens.push('<<'); i += 2; continue; }
        if (ch === '>' && src[i + 1] === '>') { tokens.push('>>'); i += 2; continue; }

        if (ch === '[' || ch === ']') { tokens.push(ch); i++; continue; }

        if (ch === '/') {
            let s = '/';
            i++;
            while (i < src.length && !/[\s\/<>\[\](){}%]/.test(src[i])) { s += src[i]; i++; }
            tokens.push(s);
            continue;
        }

        let s = '';
        while (i < src.length && !/[\s\/<>\[\](){}%]/.test(src[i])) { s += src[i]; i++; }
        if (s) {
            tokens.push(s);
        } else {
            // Fallback for delimiters not caught by specific handlers (e.g. ')')
            tokens.push(src[i]);
            i++;
        }
    }

    return tokens;
}

// ─────────────────────────────────────────────
// 3. Content Stream Color Editing
// ─────────────────────────────────────────────

function adjustContentStreamColors(streamBytes: Uint8Array, adj: Adjustments): Uint8Array {
    const raw = bytesToLatin1String(streamBytes);
    const tokens = tokenize(raw);
    const m = buildColorMatrix(adj);

    const applyMatrix = (r: number, g: number, b: number): [number, number, number] => {
        const nr = Math.min(1, Math.max(0, m[0] * r + m[1] * g + m[2] * b + m[3] * 1 + m[4]));
        const ng = Math.min(1, Math.max(0, m[5] * r + m[6] * g + m[7] * b + m[8] * 1 + m[9]));
        const nb = Math.min(1, Math.max(0, m[10] * r + m[11] * g + m[12] * b + m[13] * 1 + m[14]));
        return [nr, ng, nb];
    };

    const output: string[] = [];
    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];

        // RGB fill color: r g b rg
        if (token === 'rg' && output.length >= 3) {
            const r = parseFloat(output[output.length - 3]);
            const g = parseFloat(output[output.length - 2]);
            const b = parseFloat(output[output.length - 1]);
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                const [nr, ng, nb] = applyMatrix(r, g, b);
                output[output.length - 3] = nr.toFixed(4);
                output[output.length - 2] = ng.toFixed(4);
                output[output.length - 1] = nb.toFixed(4);
            }
            output.push('rg');
            i++;
            continue;
        }

        // RGB stroke color: r g b RG
        if (token === 'RG' && output.length >= 3) {
            const r = parseFloat(output[output.length - 3]);
            const g = parseFloat(output[output.length - 2]);
            const b = parseFloat(output[output.length - 1]);
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                const [nr, ng, nb] = applyMatrix(r, g, b);
                output[output.length - 3] = nr.toFixed(4);
                output[output.length - 2] = ng.toFixed(4);
                output[output.length - 1] = nb.toFixed(4);
            }
            output.push('RG');
            i++;
            continue;
        }

        // Grayscale fill color: gray g
        if (token === 'g' && output.length >= 1) {
            const gray = parseFloat(output[output.length - 1]);
            if (!isNaN(gray)) {
                const [nr, ng, nb] = applyMatrix(gray, gray, gray);
                output[output.length - 1] = `${nr.toFixed(4)} ${ng.toFixed(4)} ${nb.toFixed(4)}`;
                output.push('rg'); // Convert operator to 'rg'
            } else {
                output.push('g');
            }
            i++;
            continue;
        }

        // Grayscale stroke color: gray G
        if (token === 'G' && output.length >= 1) {
            const gray = parseFloat(output[output.length - 1]);
            if (!isNaN(gray)) {
                const [nr, ng, nb] = applyMatrix(gray, gray, gray);
                output[output.length - 1] = `${nr.toFixed(4)} ${ng.toFixed(4)} ${nb.toFixed(4)}`;
                output.push('RG'); // Convert operator to 'RG'
            } else {
                output.push('G');
            }
            i++;
            continue;
        }

        // CMYK fill color: c m y k k
        if (token === 'k' && output.length >= 4) {
            const c = parseFloat(output[output.length - 4]);
            const mVal = parseFloat(output[output.length - 3]);
            const y = parseFloat(output[output.length - 2]);
            const k = parseFloat(output[output.length - 1]);
            if (!isNaN(c) && !isNaN(mVal) && !isNaN(y) && !isNaN(k)) {
                const r = (1 - c) * (1 - k);
                const g = (1 - mVal) * (1 - k);
                const b = (1 - y) * (1 - k);
                const [nr, ng, nb] = applyMatrix(r, g, b);
                output.splice(output.length - 4, 4, `${nr.toFixed(4)} ${ng.toFixed(4)} ${nb.toFixed(4)}`);
                output.push('rg');
            } else {
                output.push('k');
            }
            i++;
            continue;
        }

        // CMYK stroke color: c m y k K
        if (token === 'K' && output.length >= 4) {
            const c = parseFloat(output[output.length - 4]);
            const mVal = parseFloat(output[output.length - 3]);
            const y = parseFloat(output[output.length - 2]);
            const k = parseFloat(output[output.length - 1]);
            if (!isNaN(c) && !isNaN(mVal) && !isNaN(y) && !isNaN(k)) {
                const r = (1 - c) * (1 - k);
                const g = (1 - mVal) * (1 - k);
                const b = (1 - y) * (1 - k);
                const [nr, ng, nb] = applyMatrix(r, g, b);
                output.splice(output.length - 4, 4, `${nr.toFixed(4)} ${ng.toFixed(4)} ${nb.toFixed(4)}`);
                output.push('RG');
            } else {
                output.push('K');
            }
            i++;
            continue;
        }

        output.push(token);
        i++;
    }

    return asciiStringToBytes(output.join(' '));
}

// Helper to safely decode any type of PDFStream (including PDFContentStream, PDFFlateStream, PDFRawStream)
function decodePDFStream(stream: PDFStream): Uint8Array {
    try {
        const dict = stream.dict;
        const filter = dict.get(PDFName.of('Filter'));
        const filterStr = filter?.toString() ?? '';
        const isFlate = filterStr === '/FlateDecode' || 
            (filter instanceof PDFArray && filter.asArray().some(f => f.toString() === '/FlateDecode'));

        if (isFlate) {
            const contents = stream.getContents();
            if (contents && contents.length > 0) {
                try {
                    return pako.inflate(contents);
                } catch (err) {
                    console.log('[decodePDFStream] pako.inflate failed, trying fallback decoders:', err);
                }
            }
        }

        if (typeof (stream as any).getUnencodedContents === 'function') {
            return (stream as any).getUnencodedContents();
        }
        if (stream instanceof PDFRawStream) {
            const decoded = decodePDFRawStream(stream);
            return new Uint8Array(decoded.getBytes(Infinity));
        }
    } catch (err) {
        console.warn('[decodePDFStream] Error decoding stream, falling back to raw contents:', err);
    }
    return stream.getContents();
}

// ─────────────────────────────────────────────
// 4. Native Image XObject processing
// ─────────────────────────────────────────────

async function adjustImageXObject(
    xObject: PDFRawStream,
    adj: Adjustments,
    pdfDoc: PDFDocument
): Promise<PDFRef | null> {
    try {
        const dict = xObject.dict;
        const widthObj = dict.get(PDFName.of('Width')) as any;
        const heightObj = dict.get(PDFName.of('Height')) as any;
        const width = widthObj?.asNumber?.() ?? widthObj?.value?.();
        const height = heightObj?.asNumber?.() ?? heightObj?.value?.();
        console.log(`[adjustImageXObject] Image dimensions: ${width}x${height}`);
        if (!width || !height) return null;

        const filter = dict.get(PDFName.of('Filter'));
        const colorSpace = dict.get(PDFName.of('ColorSpace'));
        const bpcObj = dict.get(PDFName.of('BitsPerComponent')) as any;
        const bitsPerComponent: number = bpcObj?.asNumber?.() ?? bpcObj?.value?.() ?? 8;

        const filterStr = filter?.toString() ?? '';
        const isJpg =
            filterStr === '/DCTDecode' ||
            (filter instanceof PDFArray && filter.asArray().some(f => f.toString() === '/DCTDecode'));
        console.log(`[adjustImageXObject] Filter: ${filterStr}, isJpg: ${isJpg}, colorSpace: ${colorSpace?.toString()}, bitsPerComponent: ${bitsPerComponent}`);

        let pngBytes: Uint8Array | null = null;

        if (isJpg) {
            console.log('[adjustImageXObject] Processing JPEG stream');
            const rawJpgBytes = new Uint8Array(xObject.getContents());
            console.log('[adjustImageXObject] Raw JPG bytes length:', rawJpgBytes.length);

            // Write JPEG bytes to a temp file
            const tempJpgPath = `${RNBlobUtil.fs.dirs.CacheDir}/temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
            await RNBlobUtil.fs.writeFile(
                tempJpgPath,
                Buffer.from(rawJpgBytes as any).toString('base64'),
                'base64'
            );
            console.log('[adjustImageXObject] Temp JPG written to:', tempJpgPath);

            // Convert to PNG via expo-image-manipulator
            const pngResult = await ImageManipulator.manipulateAsync(
                `file://${tempJpgPath}`,
                [],
                { format: ImageManipulator.SaveFormat.PNG }
            );
            console.log('[adjustImageXObject] expo-image-manipulator decoded JPG to PNG:', pngResult.uri);

            // Read the generated PNG file
            const pngBase64 = await RNBlobUtil.fs.readFile(
                pngResult.uri.replace('file://', ''),
                'base64'
            );
            const pngInputBytes = Buffer.from(pngBase64, 'base64');

            // Clean up temp files
            try {
                await RNBlobUtil.fs.unlink(tempJpgPath);
                await RNBlobUtil.fs.unlink(pngResult.uri.replace('file://', ''));
            } catch { }

            // Decode PNG using upng-js
            const img = UPNG.decode(pngInputBytes.buffer);
            const frames = UPNG.toRGBA8(img);
            let pixels = new Uint8ClampedArray(frames[0]);
            console.log('[adjustImageXObject] Decoded temporary PNG to RGBA pixels:', pixels.length);

            // Apply matrix
            applyColorMatrixToPixels(pixels, buildColorMatrix(adj));

            // Encode PNG using fast native flow
            console.log('[adjustImageXObject] Encoding adjusted pixels back to PNG bytes natively');
            pngBytes = await convertPixelsToPngBytes(pixels, img.width, img.height);
            console.log('[adjustImageXObject] Finished native PNG encoding. Result size:', pngBytes.length);
        } else {
            console.log('[adjustImageXObject] Processing non-JPEG (Flate/LZW/etc.) stream');
            const bytes = decodePDFStream(xObject);
            console.log('[adjustImageXObject] Decoded raw stream bytes length:', bytes.length);

            if (bitsPerComponent === 8) {
                const m = buildColorMatrix(adj);
                const applyMatrix = (pr: number, pg: number, pb: number): [number, number, number] => {
                    const nr = Math.min(255, Math.max(0, m[0] * pr + m[1] * pg + m[2] * pb + m[3] * 255 + m[4] * 255));
                    const ng = Math.min(255, Math.max(0, m[5] * pr + m[6] * pg + m[7] * pb + m[8] * 255 + m[9] * 255));
                    const nb = Math.min(255, Math.max(0, m[10] * pr + m[11] * pg + m[12] * pb + m[13] * 255 + m[14] * 255));
                    return [nr, ng, nb];
                };

                let pixels: Uint8ClampedArray | null = null;
                const csStr = colorSpace?.toString() ?? '';
                const isRGB = csStr.includes('RGB') || csStr === '/DeviceRGB';
                const isGray = csStr.includes('Gray') || csStr === '/DeviceGray';
                const isCMYK = csStr.includes('CMYK') || csStr === '/DeviceCMYK';
                console.log(`[adjustImageXObject] ColorSpace info - isRGB: ${isRGB}, isGray: ${isGray}, isCMYK: ${isCMYK}`);

                if (isRGB) {
                    pixels = new Uint8ClampedArray(width * height * 4);
                    for (let idx = 0, pIdx = 0; idx < bytes.length; idx += 3, pIdx += 4) {
                        const [nr, ng, nb] = applyMatrix(bytes[idx], bytes[idx + 1], bytes[idx + 2]);
                        pixels[pIdx] = nr;
                        pixels[pIdx + 1] = ng;
                        pixels[pIdx + 2] = nb;
                        pixels[pIdx + 3] = 255;
                    }
                } else if (isGray) {
                    pixels = new Uint8ClampedArray(width * height * 4);
                    for (let idx = 0, pIdx = 0; idx < bytes.length; idx++, pIdx += 4) {
                        const val = bytes[idx];
                        const [nr, ng, nb] = applyMatrix(val, val, val);
                        pixels[pIdx] = nr;
                        pixels[pIdx + 1] = ng;
                        pixels[pIdx + 2] = nb;
                        pixels[pIdx + 3] = 255;
                    }
                } else if (isCMYK) {
                    pixels = new Uint8ClampedArray(width * height * 4);
                    for (let idx = 0, pIdx = 0; idx < bytes.length; idx += 4, pIdx += 4) {
                        const c = bytes[idx];
                        const mVal = bytes[idx + 1];
                        const y = bytes[idx + 2];
                        const k = bytes[idx + 3];
                        const rgbR = ((255 - c) * (255 - k)) / 255;
                        const rgbG = ((255 - mVal) * (255 - k)) / 255;
                        const rgbB = ((255 - y) * (255 - k)) / 255;
                        const [nr, ng, nb] = applyMatrix(rgbR, rgbG, rgbB);
                        pixels[pIdx] = nr;
                        pixels[pIdx + 1] = ng;
                        pixels[pIdx + 2] = nb;
                        pixels[pIdx + 3] = 255;
                    }
                }

                if (pixels) {
                    console.log('[adjustImageXObject] Encoding adjusted pixels back to PNG bytes natively');
                    pngBytes = await convertPixelsToPngBytes(pixels, width, height);
                    console.log('[adjustImageXObject] Finished native PNG encoding. Result size:', pngBytes.length);
                }
            }
        }

        if (pngBytes) {
            console.log('[adjustImageXObject] Embedding PNG bytes into pdfDoc');
            const embedded = await pdfDoc.embedPng(pngBytes);
            console.log('[adjustImageXObject] PNG embedded successfully. Ref:', embedded.ref.toString());
            return embedded.ref;
        }
    } catch (err) {
        console.error('[pdfAdjustmentService] Error adjusting image XObject:', err);
    }
    return null;
}

// ─────────────────────────────────────────────
// 5. Main export — applyAdjustmentsToPDF
// ─────────────────────────────────────────────

export async function applyAdjustmentsToPDF(
    sourceUri: string,
    allPagesAdjustments: Record<number, Adjustments>,
    onProgress?: (progress: number) => void,
    signature?: PDFSignature,
    textOverlay?: PDFText
): Promise<string> {
    console.log('[pdfAdjustmentService] Starting applyAdjustmentsToPDF. Source:', sourceUri);
    const normalizedUri = sourceUri.startsWith('file://')
        ? sourceUri
        : `file://${sourceUri}`;

    const cleanPath = normalizedUri.replace('file://', '');
    console.log('[pdfAdjustmentService] Reading source file from path:', cleanPath);
    const base64 = await RNBlobUtil.fs.readFile(cleanPath, 'base64');
    const srcBytes = Buffer.from(base64, 'base64');

    console.log('[pdfAdjustmentService] Loading PDF document. Bytes length:', srcBytes.length);
    const pdfDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();
    console.log('[pdfAdjustmentService] PDF loaded successfully. Page count:', pageCount);

    for (let i = 0; i < pageCount; i++) {
        const pageNumber = i + 1;
        if (onProgress) {
            onProgress(i / (pageCount + 1));
        }
        const adj = allPagesAdjustments[pageNumber] ?? DEFAULT_ADJUSTMENTS;
        console.log(`[pdfAdjustmentService] Processing page ${pageNumber}/${pageCount}`);

        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();

        // 1. Draw signature FIRST if present on this page (so it is included in content stream adjustment)
        if (signature && signature.page === pageNumber) {
            console.log(`[pdfAdjustmentService] Pre-drawing signature on page ${pageNumber}`);
            try {
                const pdfWidth = width;
                const pdfHeight = height;
                const pdfLeft = signature.x * pdfWidth;
                const pdfTop = signature.y * pdfHeight;
                const sigWidth = signature.width * pdfWidth;
                const pdfScale = sigWidth / signature.canvasWidth;
                const cleanHex = signature.color.replace('#', '');
                const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
                const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
                const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

                // pdf-lib drawSvgPath expects a standard SVG path (Y-axis down, origin top-left).
                // It internally transforms coordinates by flipping the Y-axis.
                // We specify the TOP edge of the signature bounding box, as the drawing extends DOWN.
                // We use borderColor and borderWidth to draw it as strokes (lines) instead of filled shapes.
                page.drawSvgPath(signature.path, {
                    x: pdfLeft,
                    y: pdfHeight - pdfTop,
                    scale: pdfScale,
                    borderColor: rgb(r, g, b),
                    borderWidth: signature.strokeWidth,
                });
            } catch (sigErr) {
                console.warn('[pdfAdjustmentService] Failed to pre-draw signature on page:', sigErr);
            }
        }

        // 1b. Draw text FIRST if present on this page (so it is included in content stream adjustment)
        if (textOverlay && textOverlay.page === pageNumber) {
            console.log(`[pdfAdjustmentService] Pre-drawing text overlay on page ${pageNumber}`);
            try {
                const pdfWidth = width;
                const pdfHeight = height;
                const pdfLeft = textOverlay.x * pdfWidth;
                const pdfTop = textOverlay.y * pdfHeight;
                const textBoxWidth = textOverlay.width * pdfWidth;
                const cleanHex = textOverlay.color.replace('#', '');
                const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
                const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
                const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

                const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

                // pdf-lib's drawText baseline: we subtract the font size to align it below the top offset
                page.drawText(textOverlay.text, {
                    x: pdfLeft,
                    y: pdfHeight - pdfTop - textOverlay.fontSize,
                    size: textOverlay.fontSize,
                    font: font,
                    color: rgb(r, g, b),
                    maxWidth: textBoxWidth,
                    lineHeight: textOverlay.fontSize * 1.2,
                });
            } catch (textErr) {
                console.warn('[pdfAdjustmentService] Failed to pre-draw text overlay on page:', textErr);
            }
        }

        // 2. If it has identity adjustments (and thus no color adjustments to apply), skip the rest
        if (isIdentityAdjustment(adj)) {
            console.log(`[pdfAdjustmentService] Page ${pageNumber} has identity adjustment (no-op). Skipping content stream rebuild.`);
            continue;
        }

        const m = buildColorMatrix(adj);
        console.log(`[pdfAdjustmentService] Page ${pageNumber} size: ${width}x${height}`);

        // A. Adjust all Image XObjects in Resources
        const resources = page.node.Resources();
        if (resources) {
            console.log(`[pdfAdjustmentService] Page ${pageNumber} has resources. checking XObjects.`);
            const xObjects = resources.lookup(PDFName.of('XObject'));
            if (xObjects instanceof PDFDict) {
                const keys = xObjects.keys();
                console.log(`[pdfAdjustmentService] Found ${keys.length} XObject keys in page resources.`);
                for (const key of keys) {
                    const xObjectRef = xObjects.get(key);
                    const xObject = pdfDoc.context.lookup(xObjectRef);
                    if (xObject instanceof PDFRawStream) {
                        const subtype = xObject.dict.get(PDFName.of('Subtype'));
                        if (subtype === PDFName.of('Image')) {
                            console.log(`[pdfAdjustmentService] Found image XObject with key ${key.toString()}. Adjusting...`);
                            const newImageRef = await adjustImageXObject(xObject, adj, pdfDoc);
                            if (newImageRef) {
                                console.log(`[pdfAdjustmentService] Successfully adjusted image ${key.toString()}`);
                                xObjects.set(key, newImageRef);
                            } else {
                                console.log(`[pdfAdjustmentService] Warning: adjustImageXObject returned null for key ${key.toString()}`);
                            }
                        }
                    }
                }
            }
        }

        // B. Adjust content streams (vectors & text)
        console.log(`[pdfAdjustmentService] Page ${pageNumber} adjusting content stream.`);
        let decodedContent = new Uint8Array();
        try {
            const contentsRef = page.node.get(PDFName.of('Contents'));
            if (contentsRef) {
                const contentsObj = pdfDoc.context.lookup(contentsRef);
                const streamBuffers: Uint8Array[] = [];

                const decodeOneStream = (obj: any) => {
                    if (obj instanceof PDFStream) {
                        const decodedBytes = decodePDFStream(obj);
                        if (decodedBytes && decodedBytes.length > 0) {
                            streamBuffers.push(decodedBytes);
                        }
                    }
                };

                if (contentsObj instanceof PDFArray) {
                    console.log(`[pdfAdjustmentService] Page ${pageNumber} has multiple content streams: ${contentsObj.size()}`);
                    for (let si = 0; si < contentsObj.size(); si++) {
                        const ref = contentsObj.get(si);
                        const streamObj = pdfDoc.context.lookup(ref);
                        decodeOneStream(streamObj);
                    }
                } else {
                    console.log(`[pdfAdjustmentService] Page ${pageNumber} has a single content stream.`);
                    decodeOneStream(contentsObj);
                }

                if (streamBuffers.length > 0) {
                    const totalLen = streamBuffers.reduce((s, b) => s + b.length, 0);
                    const combined = new Uint8Array(totalLen);
                    let offset = 0;
                    for (const buf of streamBuffers) {
                        combined.set(buf, offset);
                        offset += buf.length;
                    }
                    decodedContent = combined;
                    console.log(`[pdfAdjustmentService] Page ${pageNumber} combined content streams length:`, decodedContent.length);
                }
            }
        } catch (err) {
            console.log(`[pdfAdjustmentService] Error reading content streams on page ${pageNumber}:`, err);
        }

        try {
            const adjustedContentBytes = decodedContent.length > 0
                ? adjustContentStreamColors(decodedContent, adj)
                : new Uint8Array();
            console.log(`[pdfAdjustmentService] Page ${pageNumber} content streams adjusted. New length:`, adjustedContentBytes.length);

            // Calculate solid page background color based on the adjustments applied to white
            const bgR = Math.min(1, Math.max(0, m[0] + m[1] + m[2] + m[3] + m[4]));
            const bgG = Math.min(1, Math.max(0, m[5] + m[6] + m[7] + m[8] + m[9]));
            const bgB = Math.min(1, Math.max(0, m[10] + m[11] + m[12] + m[13] + m[14]));

            const bgStreamContent = `q\n${bgR.toFixed(4)} ${bgG.toFixed(4)} ${bgB.toFixed(4)} rg\n0 0 ${width} ${height} re\nf\nQ\n`;
            const bgStreamContentBytes = asciiStringToBytes(bgStreamContent);
            const combinedContentBytes = new Uint8Array(bgStreamContentBytes.length + adjustedContentBytes.length);
            combinedContentBytes.set(bgStreamContentBytes, 0);
            combinedContentBytes.set(adjustedContentBytes, bgStreamContentBytes.length);

            const contentStream = pdfDoc.context.stream(combinedContentBytes, {});
            const contentStreamRef = pdfDoc.context.register(contentStream);

            page.node.set(PDFName.of('Contents'), contentStreamRef);
            console.log(`[pdfAdjustmentService] Page ${pageNumber} Contents reference updated with single combined stream.`);
        } catch (streamErr) {
            console.warn(`[pdfAdjustmentService] Content stream adjust failed on page ${pageNumber}:`, streamErr);
        }
    }

    if (onProgress) {
        onProgress(pageCount / (pageCount + 1));
    }
    console.log('[pdfAdjustmentService] Saving updated PDF via pdfDoc.save()');
    const outputBytes = await pdfDoc.save();
    console.log('[pdfAdjustmentService] PDF saved. Output bytes size:', outputBytes.length);
    const outputPath = `${RNBlobUtil.fs.dirs.DocumentDir}/adjusted_${Date.now()}.pdf`;
    console.log('[pdfAdjustmentService] Writing PDF bytes to file:', outputPath);
    await RNBlobUtil.fs.writeFile(
        outputPath,
        Buffer.from(outputBytes).toString('base64'),
        'base64'
    );
    console.log('[pdfAdjustmentService] PDF write completed successfully.');
    if (onProgress) {
        onProgress(1.0);
    }

    return `file://${outputPath}`;
}

export async function applyAdjustmentsToImage(
    sourceUri: string,
    adj: Adjustments,
    onProgress?: (progress: number) => void
): Promise<string> {
    if (isIdentityAdjustment(adj)) {
        if (onProgress) onProgress(1.0);
        return sourceUri;
    }

    if (onProgress) onProgress(0.1);

    const normalizedUri = sourceUri.startsWith('file://')
        ? sourceUri
        : `file://${sourceUri}`;

    // Convert/manipulate image using expo-image-manipulator to get PNG
    const pngResult = await ImageManipulator.manipulateAsync(
        normalizedUri,
        [],
        { format: ImageManipulator.SaveFormat.PNG }
    );

    if (onProgress) onProgress(0.3);

    const cleanPngPath = pngResult.uri.replace('file://', '');
    const pngBase64 = await RNBlobUtil.fs.readFile(cleanPngPath, 'base64');
    const pngInputBytes = Buffer.from(pngBase64, 'base64');

    // Decode PNG using upng-js
    const img = UPNG.decode(pngInputBytes.buffer);
    const frames = UPNG.toRGBA8(img);
    let pixels = new Uint8ClampedArray(frames[0]);

    if (onProgress) onProgress(0.5);

    // Apply color matrix filter on pixel array
    applyColorMatrixToPixels(pixels, buildColorMatrix(adj));

    // Re-encode PNG using fast native flow
    const pngBytes = await convertPixelsToPngBytes(pixels, img.width, img.height);

    if (onProgress) onProgress(0.8);

    // Save final image in DocumentDir
    const outputPath = `${RNBlobUtil.fs.dirs.DocumentDir}/adjusted_${Date.now()}.png`;
    await RNBlobUtil.fs.writeFile(
        outputPath,
        Buffer.from(pngBytes).toString('base64'),
        'base64'
    );

    // Clean up temporary PNG
    try {
        await RNBlobUtil.fs.unlink(cleanPngPath);
    } catch (err) {
        console.warn('[pdfAdjustmentService] Failed to clean up temp PNG:', err);
    }

    if (onProgress) onProgress(1.0);

    return `file://${outputPath}`;
}

// ─────────────────────────────────────────────
// 7. Live preview helpers (pixel-accurate, fast)
// ─────────────────────────────────────────────

export interface PreviewPixelData {
    pixels: Uint8ClampedArray;
    width: number;
    height: number;
}

/**
 * Load an image (or PDF page thumbnail) into raw RGBA pixels for live preview.
 * Always downscales to maxWidth (default 500px) for fast processing.
 */
export async function loadPreviewPixels(
    sourceUri: string,
    maxWidth: number = 500
): Promise<PreviewPixelData> {
    const normalizedUri = sourceUri.startsWith('file://')
        ? sourceUri
        : `file://${sourceUri}`;

    const pngResult = await ImageManipulator.manipulateAsync(
        normalizedUri,
        [{ resize: { width: maxWidth } }],
        { format: ImageManipulator.SaveFormat.PNG }
    );

    const cleanPath = pngResult.uri.replace('file://', '');
    const pngBase64 = await RNBlobUtil.fs.readFile(cleanPath, 'base64');
    const pngBytes = Buffer.from(pngBase64, 'base64');

    const img = UPNG.decode(pngBytes.buffer);
    const frames = UPNG.toRGBA8(img);
    const pixels = new Uint8ClampedArray(frames[0]);

    // Clean up temp file
    try { await RNBlobUtil.fs.unlink(cleanPath); } catch { }

    return { pixels, width: img.width, height: img.height };
}

/**
 * Encode raw RGBA pixels as an uncompressed 32-bit BMP.
 * BMP has zero compression — just a 54-byte header + raw BGRA pixels —
 * making it ~100x faster than PNG deflate for the same image.
 */
function encodeRawBMP(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
    const rowSize = Math.ceil((width * 3) / 4) * 4;
    const paddingSize = rowSize - (width * 3);
    const pixelDataSize = rowSize * height;
    const fileSize = 54 + pixelDataSize;
    const buf = new Uint8Array(fileSize);
    const view = new DataView(buf.buffer);

    // ── BMP File Header (14 bytes) ──
    buf[0] = 0x42; buf[1] = 0x4D;          // "BM"
    view.setUint32(2, fileSize, true);      // file size
    view.setUint32(10, 54, true);           // pixel data offset

    // ── BITMAPINFOHEADER (40 bytes) ──
    view.setUint32(14, 40, true);           // header size
    view.setInt32(18, width, true);         // width
    view.setInt32(22, height, true);        // positive = bottom-up row order (100% compatible)
    view.setUint16(26, 1, true);            // planes
    view.setUint16(28, 24, true);           // 24 bits per pixel (RGB)
    view.setUint32(30, 0, true);            // compression: 0 (BI_RGB)
    view.setUint32(34, pixelDataSize, true); // image size

    // ── Pixel data: RGBA → BGR (bottom-up with padding) ──
    let offset = 54;
    for (let y = height - 1; y >= 0; y--) {
        let rgbaIdx = y * width * 4;
        for (let x = 0; x < width; x++) {
            buf[offset]     = rgba[rgbaIdx + 2]; // B
            buf[offset + 1] = rgba[rgbaIdx + 1]; // G
            buf[offset + 2] = rgba[rgbaIdx];     // R
            offset += 3;
            rgbaIdx += 4;
        }
        // Add row padding
        for (let p = 0; p < paddingSize; p++) {
            buf[offset] = 0;
            offset++;
        }
    }

    return buf;
}

/**
 * Convert raw RGBA pixels to PNG bytes using the fast native BMP-to-PNG compression flow.
 * This avoids calling pure-JS UPNG.encode on large images, which blocks the thread or hangs.
 */
async function convertPixelsToPngBytes(
    pixels: Uint8ClampedArray,
    width: number,
    height: number
): Promise<Uint8Array> {
    const bmpBytes = encodeRawBMP(pixels, width, height);
    const tempBmpPath = `${RNBlobUtil.fs.dirs.CacheDir}/temp_native_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.bmp`;
    await RNBlobUtil.fs.writeFile(
        tempBmpPath,
        Buffer.from(bmpBytes).toString('base64'),
        'base64'
    );

    const nativePng = await ImageManipulator.manipulateAsync(
        `file://${tempBmpPath}`,
        [],
        { format: ImageManipulator.SaveFormat.PNG }
    );
    const cleanPngPath = nativePng.uri.replace('file://', '');
    const base64Png = await RNBlobUtil.fs.readFile(cleanPngPath, 'base64');
    const pngBytes = new Uint8Array(Buffer.from(base64Png, 'base64'));

    try {
        await RNBlobUtil.fs.unlink(tempBmpPath);
        await RNBlobUtil.fs.unlink(cleanPngPath);
    } catch {}

    return pngBytes;
}


// Alternate between two filenames so React Native sees a "new" URI each time
let _previewFileIdx = 0;

/**
 * Apply a color matrix to a copy of the source pixels, encode as BMP,
 * write to a temp cache file, and return a file:// URI for <Image>.
 *
 * Typical latency: ~15-30ms for a 500×650 image (vs ~300-500ms with PNG).
 */
export async function generateFilteredPreview(
    source: PreviewPixelData,
    adj: Adjustments
): Promise<string> {
    // 1. Apply colour matrix to a copy (~5-10ms)
    const processed = new Uint8ClampedArray(source.pixels);
    applyColorMatrixToPixels(processed, buildColorMatrix(adj));

    // 2. Encode as raw BMP (~1-2ms, zero compression)
    const bmpBytes = encodeRawBMP(processed, source.width, source.height);

    // 3. Write to cache file (~10-15ms)
    _previewFileIdx = (_previewFileIdx + 1) % 2;
    const path = `${RNBlobUtil.fs.dirs.CacheDir}/adjust_preview_${_previewFileIdx}.bmp`;
    await RNBlobUtil.fs.writeFile(
        path,
        Buffer.from(bmpBytes).toString('base64'),
        'base64'
    );

    return `file://${path}`;
}