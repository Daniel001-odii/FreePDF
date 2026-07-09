// ============================================================
// PDF Service Layer – Abstractions over pdf-lib operations
// Uses expo-file-system and pdf-lib for all PDF processing
// ============================================================

import * as FileSystem from 'expo-file-system/legacy';
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// React Native polyfill for Buffer (needed by pdf-lib)
import { Buffer } from 'buffer';
(globalThis as Record<string, unknown>).Buffer = Buffer;

// -----------------------------------------------------------
// Utility: Load a PDF from a file URI
// -----------------------------------------------------------

export async function loadPDF(uri: string): Promise<PDFDocument> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const pdfBytes = Uint8Array.from(
    Buffer.from(base64, 'base64'),
  );
  return PDFDocument.load(pdfBytes);
}

export async function loadPDFs(
  uris: string[],
): Promise<PDFDocument[]> {
  return Promise.all(uris.map(loadPDF));
}

// -----------------------------------------------------------
// Utility: Save a PDF and return the file URI
// -----------------------------------------------------------

export async function savePDF(
  pdfDoc: PDFDocument,
  fileName: string,
): Promise<string> {
  const pdfBytes = await pdfDoc.save();
  const base64 = Buffer.from(pdfBytes).toString('base64');
  const dir = `${FileSystem.documentDirectory ?? ''}output/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const path = `${dir}${fileName}.pdf`;
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return path;
}

// -----------------------------------------------------------
// Merge multiple PDFs into one
// -----------------------------------------------------------

export async function mergePDFs(uris: string[]): Promise<string> {
  const mergedDoc = await PDFDocument.create();
  for (const uri of uris) {
    const doc = await loadPDF(uri);
    const pages = await mergedDoc.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => mergedDoc.addPage(page));
  }
  return savePDF(mergedDoc, `merged_${Date.now()}`);
}

// -----------------------------------------------------------
// Split a PDF – extract pages by index (0-based)
// -----------------------------------------------------------

export async function splitPDF(
  uri: string,
  pageRanges: number[][],
): Promise<string[]> {
  const doc = await loadPDF(uri);
  const results: string[] = [];
  for (let i = 0; i < pageRanges.length; i++) {
    const newDoc = await PDFDocument.create();
    const pages = await newDoc.copyPages(doc, pageRanges[i]);
    pages.forEach((p) => newDoc.addPage(p));
    const outPath = await savePDF(newDoc, `split_${Date.now()}_${i}`);
    results.push(outPath);
  }
  return results;
}

// -----------------------------------------------------------
// Compress PDF (strip metadata, re-save for size reduction)
// -----------------------------------------------------------

export async function compressPDF(
  uri: string,
  _quality: number = 80,
): Promise<string> {
  const doc = await loadPDF(uri);
  doc.setTitle('');
  doc.setAuthor('');
  doc.setSubject('');
  doc.setCreator('');
  doc.setProducer('');
  doc.setKeywords([]);
  return savePDF(doc, `compressed_${Date.now()}`);
}

// -----------------------------------------------------------
// Rotate pages
// -----------------------------------------------------------

export async function rotatePDFPages(
  uri: string,
  rotations: { pageIndex: number; angle: 0 | 90 | 180 | 270 }[],
): Promise<string> {
  const doc = await loadPDF(uri);
  for (const { pageIndex, angle } of rotations) {
    const page = doc.getPage(pageIndex);
    page.setRotation(degrees(angle));
  }
  return savePDF(doc, `rotated_${Date.now()}`);
}

// -----------------------------------------------------------
// Page adjustment types
// -----------------------------------------------------------

export interface PageAdjustments {
  brightness: number;   // 0–200, default 100
  contrast: number;     // 0–200, default 100
  saturation: number;   // 0–200, default 100
  grayscale: number;    // 0–100
  invert: number;       // 0–100
  sepia: number;        // 0–100
  hueShift: number;     // 0–360
}

export const DEFAULT_ADJUSTMENTS: PageAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  invert: 0,
  sepia: 0,
  hueShift: 0,
};

function isDefaultAdjustment(adj: PageAdjustments): boolean {
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

// -----------------------------------------------------------
// SVG feColorMatrix computation for CSS-filter replication
// -----------------------------------------------------------

/** Multiply two 5x4 colour matrices (20 values each, row-major). */
function multiplyMatrices(a: number[], b: number[]): number[] {
  const result = new Array<number>(20).fill(0);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      for (let k = 0; k < 5; k++) {
        result[row * 5 + col] += a[row * 5 + k] * b[k * 5 + col];
      }
    }
  }
  return result;
}

/** Identity 5x4 colour matrix. */
function identityMatrix(): number[] {
  return [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

/** Brightness matrix (v: 0-200, normalised). */
function brightnessMatrix(v: number): number[] {
  const s = v / 100;
  return [s, 0, 0, 0, 0, 0, s, 0, 0, 0, 0, 0, s, 0, 0, 0, 0, 0, 1, 0];
}

/** Contrast matrix (v: 0-200). */
function contrastMatrix(v: number): number[] {
  const s = v / 100;
  const o = (1 - s) * 0.499; // midpoint offset
  return [s, 0, 0, 0, o, 0, s, 0, 0, o, 0, 0, s, 0, o, 0, 0, 0, 1, 0];
}

/** Saturation matrix (v: 0-200). */
function saturationMatrix(v: number): number[] {
  const s = v / 100;
  const lumR = 0.3086;
  const lumG = 0.6094;
  const lumB = 0.082;
  const sr = (1 - s) * lumR;
  const sg = (1 - s) * lumG;
  const sb = (1 - s) * lumB;
  return [
    sr + s, sg, sb, 0, 0,
    sr, sg + s, sb, 0, 0,
    sr, sg, sb + s, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

/** Grayscale matrix (v: 0-100). */
function grayscaleMatrix(v: number): number[] {
  const p = v / 100;
  const lumR = 0.2126;
  const lumG = 0.7152;
  const lumB = 0.0722;
  const r = (1 - p) + p * lumR;
  const g = (1 - p) + p * lumG;
  const b = (1 - p) + p * lumB;
  return [
    r, p * lumG, p * lumB, 0, 0,
    p * lumR, g, p * lumB, 0, 0,
    p * lumR, p * lumG, b, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

/** Invert matrix (v: 0-100). */
function invertMatrix(v: number): number[] {
  const p = v / 100;
  const s = 1 - 2 * p;
  const o = p;
  return [s, 0, 0, 0, o, 0, s, 0, 0, o, 0, 0, s, 0, o, 0, 0, 0, 1, 0];
}

/** Sepia matrix (v: 0-100). */
function sepiaMatrix(v: number): number[] {
  const p = v / 100;
  return [
    0.393 + 0.607 * (1 - p), 0.769 - 0.769 * (1 - p), 0.189 - 0.189 * (1 - p), 0, 0,
    0.349 - 0.349 * (1 - p), 0.686 + 0.314 * (1 - p), 0.168 - 0.168 * (1 - p), 0, 0,
    0.272 - 0.272 * (1 - p), 0.534 - 0.534 * (1 - p), 0.131 + 0.869 * (1 - p), 0, 0,
    0, 0, 0, 1, 0,
  ];
}

/** Hue-rotate matrix (v: 0-360). */
function hueRotateMatrix(v: number): number[] {
  const a = (v * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const lumR = 0.213;
  const lumG = 0.715;
  const lumB = 0.072;
  return [
    lumR + cos * (1 - lumR) + sin * -lumR,
    lumG + cos * -lumG + sin * -lumG,
    lumB + cos * -lumB + sin * (1 - lumB), 0, 0,
    lumR + cos * -lumR + sin * 0.143,
    lumG + cos * (1 - lumG) + sin * 0.140,
    lumB + cos * -lumB + sin * -0.283, 0, 0,
    lumR + cos * -lumR + sin * -(1 - lumR),
    lumG + cos * -lumG + sin * lumG,
    lumB + cos * (1 - lumB) + sin * lumB, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

/**
 * Build a combined SVG feColorMatrix values string from page adjustments.
 * Applies filters in CSS order: brightness → contrast → saturate → grayscale
 * → invert → sepia → hue-rotate.
 *
 * Returns a space-separated string of 20 numbers for direct use in
 * `<feColorMatrix type="matrix" values="..." />`.
 */
export function getFilterColorMatrix(adj: PageAdjustments): string {
  let matrix = identityMatrix();

  if (adj.brightness !== 100) {
    matrix = multiplyMatrices(matrix, brightnessMatrix(adj.brightness));
  }
  if (adj.contrast !== 100) {
    matrix = multiplyMatrices(matrix, contrastMatrix(adj.contrast));
  }
  if (adj.saturation !== 100) {
    matrix = multiplyMatrices(matrix, saturationMatrix(adj.saturation));
  }
  if (adj.grayscale > 0) {
    matrix = multiplyMatrices(matrix, grayscaleMatrix(adj.grayscale));
  }
  if (adj.invert > 0) {
    matrix = multiplyMatrices(matrix, invertMatrix(adj.invert));
  }
  if (adj.sepia > 0) {
    matrix = multiplyMatrices(matrix, sepiaMatrix(adj.sepia));
  }
  if (adj.hueShift !== 0) {
    matrix = multiplyMatrices(matrix, hueRotateMatrix(adj.hueShift));
  }

  return matrix.join(' ');
}

/**
 * Bake per-page colour adjustments permanently into a PDF.
 * Uses the same overlay-rectangle maths as the React Native visual preview
 * so the saved result exactly matches what the user saw.
 *
 * @param uri              Source PDF file URI
 * @param allAdjustments   Map of 1-based page numbers → adjustments
 */
export async function applyAdjustmentsToPDF(
  uri: string,
  allAdjustments: Record<number, PageAdjustments>,
): Promise<string> {
  const doc = await loadPDF(uri);
  const pages = doc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1; // 1-based
    const adj = allAdjustments[pageNum];

    // Skip pages with no adjustments or only default values
    if (!adj || isDefaultAdjustment(adj)) continue;

    const page = pages[i];
    const { width, height } = page.getSize();

    const drawOverlay = (r: number, g: number, b: number, opacity: number) => {
      if (opacity <= 0) return;
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: rgb(r, g, b),
        opacity: Math.min(1, Math.max(0, opacity)),
      });
    };

    // ---- Sepia tint ----
    if (adj.sepia > 0) {
      drawOverlay(0.933, 0.855, 0.635, (adj.sepia / 100) * 0.25);
    }

    // ---- Grayscale / mono tint ----
    if (adj.grayscale > 0) {
      drawOverlay(0.498, 0.498, 0.498, (adj.grayscale / 100) * 0.30);
    }

    // ---- Desaturation tint (only when grayscale is off) ----
    if (adj.saturation < 100 && adj.grayscale === 0) {
      const desat = 100 - adj.saturation;
      drawOverlay(0.498, 0.498, 0.498, (desat / 100) * 0.20);
    }

    // ---- Contrast ----
    if (adj.contrast !== 100) {
      const diff = adj.contrast - 100;
      if (diff < 0) {
        drawOverlay(0.502, 0.502, 0.502, (Math.abs(diff) / 100) * 0.25);
      } else {
        drawOverlay(0, 0, 0, (diff / 100) * 0.05);
      }
    }

    // ---- Brightness ----
    if (adj.brightness !== 100) {
      const difference = adj.brightness - 100;
      if (difference < 0) {
        drawOverlay(0, 0, 0, Math.min(0.9, Math.abs(difference) / 100));
      } else {
        drawOverlay(1, 1, 1, Math.min(0.5, (difference / 100) * 0.3));
      }
    }

    // ---- Invert (white tint simulation) ----
    if (adj.invert > 0) {
      drawOverlay(1, 1, 1, (adj.invert / 100) * 0.50);
    }

    // ---- Blueprint / Hue tint ----
    if (adj.hueShift > 150) {
      drawOverlay(0, 0.18, 0.478, 0.35);
    }
  }

  return savePDF(doc, `adjusted_${Date.now()}`);
}


// -----------------------------------------------------------
// Reorder pages
// -----------------------------------------------------------

export async function reorderPages(
  uri: string,
  newOrder: number[],
): Promise<string> {
  const doc = await loadPDF(uri);
  // Collect page references in desired order BEFORE removing (avoids index shift)
  const pages = newOrder.map((i) => doc.getPage(i));
  // Remove all pages
  while (doc.getPageCount() > 0) {
    doc.removePage(0);
  }
  // Re-add in new order
  pages.forEach((p) => doc.addPage(p));
  return savePDF(doc, `reordered_${Date.now()}`);
}

// -----------------------------------------------------------
// Extract pages into a new PDF
// -----------------------------------------------------------

export async function extractPages(
  uri: string,
  pageIndices: number[],
): Promise<string> {
  const doc = await loadPDF(uri);
  const newDoc = await PDFDocument.create();
  const copied = await newDoc.copyPages(doc, pageIndices);
  copied.forEach((p) => newDoc.addPage(p));
  return savePDF(newDoc, `extracted_${Date.now()}`);
}

// -----------------------------------------------------------
// Add watermark text to all pages
// -----------------------------------------------------------

export async function addWatermark(
  uri: string,
  text: string,
  options?: {
    fontSize?: number;
    opacity?: number;
    color?: { r: number; g: number; b: number };
  },
): Promise<string> {
  const doc = await loadPDF(uri);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();
  const fs = options?.fontSize ?? 60;
  const opacity = options?.opacity ?? 0.15;
  const color = options?.color ?? { r: 0.5, g: 0.5, b: 0.5 };

  for (const page of pages) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fs);
    const textHeight = font.heightAtSize(fs);

    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: (height - textHeight) / 2,
      size: fs,
      font,
      opacity,
      color: rgb(color.r, color.g, color.b),
    });
  }
  return savePDF(doc, `watermarked_${Date.now()}`);
}

// -----------------------------------------------------------
// Get PDF metadata
// -----------------------------------------------------------

export async function getPDFMetadata(uri: string): Promise<{
  title: string;
  author: string;
  subject: string;
  creator: string;
  producer: string;
  pageCount: number;
  fileSize: number;
}> {
  const doc = await loadPDF(uri);
  const info = await FileSystem.getInfoAsync(uri);
  return {
    title: doc.getTitle() ?? '',
    author: doc.getAuthor() ?? '',
    subject: doc.getSubject() ?? '',
    creator: doc.getCreator() ?? '',
    producer: doc.getProducer() ?? '',
    pageCount: doc.getPageCount(),
    fileSize: (info as any).size ?? 0,
  };
}

// -----------------------------------------------------------
// Get page count (lightweight)
// -----------------------------------------------------------

export async function getPageCount(uri: string): Promise<number> {
  const doc = await loadPDF(uri);
  return doc.getPageCount();
}

// -----------------------------------------------------------
// Update PDF metadata
// -----------------------------------------------------------

export async function updatePDFMetadata(
  uri: string,
  metadata: {
    title: string;
    author: string;
    subject: string;
    creator: string;
    producer: string;
  },
): Promise<string> {
  const doc = await loadPDF(uri);
  doc.setTitle(metadata.title);
  doc.setAuthor(metadata.author);
  doc.setSubject(metadata.subject);
  doc.setCreator(metadata.creator);
  doc.setProducer(metadata.producer);
  return savePDF(doc, `metadata_${Date.now()}`);
}

// -----------------------------------------------------------
// Add custom text to a specific page
// -----------------------------------------------------------

export async function addTextToPDF(
  uri: string,
  text: string,
  options: {
    pageIndex: number;
    x: number;
    y: number;
    fontSize?: number;
    color?: { r: number; g: number; b: number };
  },
): Promise<string> {
  const doc = await loadPDF(uri);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  if (options.pageIndex < 0 || options.pageIndex >= pages.length) {
    throw new Error('Invalid page index');
  }
  const page = pages[options.pageIndex];
  const fs = options.fontSize ?? 18;
  const color = options.color ?? { r: 0, g: 0, b: 0 };

  page.drawText(text, {
    x: options.x,
    y: options.y,
    size: fs,
    font,
    color: rgb(color.r, color.g, color.b),
  });

  return savePDF(doc, `annotated_${Date.now()}`);
}

// -----------------------------------------------------------
// Add image to a specific page
// -----------------------------------------------------------

export async function addImageToPDF(
  pdfUri: string,
  imageUri: string,
  options: {
    pageIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;
  },
): Promise<string> {
  const doc = await loadPDF(pdfUri);
  const pages = doc.getPages();
  if (options.pageIndex < 0 || options.pageIndex >= pages.length) {
    throw new Error('Invalid page index');
  }
  const page = pages[options.pageIndex];

  // Read the image as base64
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const imageBytes = Uint8Array.from(Buffer.from(base64, 'base64'));

  // Embed image (JPEG)
  const pdfImage = await doc.embedJpg(imageBytes);

  page.drawImage(pdfImage, {
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
  });

  return savePDF(doc, `with_image_${Date.now()}`);
}