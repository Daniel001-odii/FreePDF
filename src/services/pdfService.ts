// ============================================================
// PDF Service Layer – Abstractions over pdf-lib operations
// Uses expo-file-system and pdf-lib for all PDF processing
// ============================================================

import * as FileSystem from 'expo-file-system';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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
    page.setRotation(angle);
  }
  return savePDF(doc, `rotated_${Date.now()}`);
}

// -----------------------------------------------------------
// Reorder pages
// -----------------------------------------------------------

export async function reorderPages(
  uri: string,
  newOrder: number[],
): Promise<string> {
  const doc = await loadPDF(uri);
  const pages = newOrder.map((i) => {
    const page = doc.getPage(i);
    doc.removePage(i);
    return page;
  });
  // Clear remaining and re-add in order
  while (doc.getPageCount() > 0) {
    doc.removePage(0);
  }
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