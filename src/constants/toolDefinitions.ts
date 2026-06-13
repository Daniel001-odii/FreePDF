import type { CategoryInfo, ToolDefinition } from '@/src/types';

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'pdf-management',
    title: 'PDF Management',
    subtitle: 'Manage and organize your PDF documents',
  },
  {
    id: 'conversion',
    title: 'Conversion',
    subtitle: 'Convert between PDF and other formats',
  },
  {
    id: 'editing',
    title: 'Editing',
    subtitle: 'Add content and modify your PDFs',
  },
  {
    id: 'scanner',
    title: 'Scanner',
    subtitle: 'Scan documents with your camera',
  },
  {
    id: 'security',
    title: 'Security',
    subtitle: 'Protect and secure your PDF files',
  },
  {
    id: 'utilities',
    title: 'Utilities',
    subtitle: 'View and analyze PDF properties',
  },
];

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // ---- PDF Management ----
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    category: 'pdf-management',
    icon: 'merge',
    route: '/tool/merge-pdf',
    description: 'Combine multiple PDF files into a single document',
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    category: 'pdf-management',
    icon: 'split',
    route: '/tool/split-pdf',
    description: 'Extract pages or split a PDF into multiple files',
  },
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    category: 'pdf-management',
    icon: 'compress',
    route: '/tool/compress-pdf',
    description: 'Reduce file size while maintaining quality',
  },
  {
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    category: 'pdf-management',
    icon: 'rotate',
    route: '/tool/rotate-pdf',
    description: 'Rotate pages in your PDF document',
  },
  {
    id: 'reorder-pages',
    name: 'Reorder Pages',
    category: 'pdf-management',
    icon: 'reorder',
    route: '/tool/reorder-pages',
    description: 'Drag and drop to rearrange PDF pages',
  },
  {
    id: 'extract-pages',
    name: 'Extract Pages',
    category: 'pdf-management',
    icon: 'extract',
    route: '/tool/extract-pages',
    description: 'Extract specific pages from a PDF',
  },

  // ---- Conversion ----
  {
    id: 'images-to-pdf',
    name: 'Images to PDF',
    category: 'conversion',
    icon: 'image-to-pdf',
    route: '/tool/images-to-pdf',
    description: 'Convert images into a PDF document',
  },
  {
    id: 'pdf-to-images',
    name: 'PDF to Images',
    category: 'conversion',
    icon: 'pdf-to-image',
    route: '/tool/pdf-to-images',
    description: 'Convert PDF pages into image files',
  },
  {
    id: 'pdf-to-text',
    name: 'PDF to Text',
    category: 'conversion',
    icon: 'pdf-to-text',
    route: '/tool/pdf-to-text',
    description: 'Extract text content from PDF documents',
  },
  {
    id: 'pdf-to-html',
    name: 'PDF to HTML',
    category: 'conversion',
    icon: 'pdf-to-html',
    route: '/tool/pdf-to-html',
    description: 'Convert PDF documents to HTML format',
  },

  // ---- Editing ----
  {
    id: 'add-watermark',
    name: 'Add Watermark',
    category: 'editing',
    icon: 'watermark',
    route: '/tool/add-watermark',
    description: 'Add text or image watermarks to your PDF',
  },
  {
    id: 'add-text',
    name: 'Add Text',
    category: 'editing',
    icon: 'add-text',
    route: '/tool/add-text',
    description: 'Insert text annotations into PDF pages',
  },
  {
    id: 'add-signature',
    name: 'Add Signature',
    category: 'editing',
    icon: 'signature',
    route: '/tool/add-signature',
    description: 'Sign PDF documents with your digital signature',
  },
  {
    id: 'add-image',
    name: 'Add Image',
    category: 'editing',
    icon: 'add-image',
    route: '/tool/add-image',
    description: 'Insert images into your PDF pages',
  },

  // ---- Scanner ----
  {
    id: 'document-scanner',
    name: 'Document Scanner',
    category: 'scanner',
    icon: 'document-scanner',
    route: '/tool/document-scanner',
    description: 'Scan multi-page documents with auto edge detection',
  },
  {
    id: 'receipt-scanner',
    name: 'Receipt Scanner',
    category: 'scanner',
    icon: 'receipt-scanner',
    route: '/tool/receipt-scanner',
    description: 'Scan and organize receipts for expense tracking',
  },
  {
    id: 'id-scanner',
    name: 'ID Scanner',
    category: 'scanner',
    icon: 'id-scanner',
    route: '/tool/id-scanner',
    description: 'Scan ID cards, passports, and driver licenses',
  },

  // ---- Security ----
  {
    id: 'password-protect',
    name: 'Password Protect PDF',
    category: 'security',
    icon: 'password-protect',
    route: '/tool/password-protect',
    description: 'Add password protection to your PDF',
  },
  {
    id: 'remove-password',
    name: 'Remove Password',
    category: 'security',
    icon: 'remove-password',
    route: '/tool/remove-password',
    description: 'Remove password protection from a PDF',
  },
  {
    id: 'encrypt-pdf',
    name: 'Encrypt PDF',
    category: 'security',
    icon: 'encrypt',
    route: '/tool/encrypt-pdf',
    description: 'Advanced encryption for sensitive documents',
  },

  // ---- Utilities ----
  {
    id: 'metadata-viewer',
    name: 'Metadata Viewer',
    category: 'utilities',
    icon: 'metadata',
    route: '/tool/metadata-viewer',
    description: 'View and edit PDF metadata properties',
  },
  {
    id: 'file-size-analyzer',
    name: 'File Size Analyzer',
    category: 'utilities',
    icon: 'file-size',
    route: '/tool/file-size-analyzer',
    description: 'Analyze PDF file size and optimization opportunities',
  },
];

export const POPULAR_TOOLS = [
  TOOL_DEFINITIONS[0],  // Merge PDF
  TOOL_DEFINITIONS[2],  // Compress PDF
  TOOL_DEFINITIONS[1],  // Split PDF
  TOOL_DEFINITIONS[6],  // Images to PDF
  TOOL_DEFINITIONS[12], // Add Signature
  TOOL_DEFINITIONS[14], // Document Scanner
];

export const QUICK_ACTIONS = [
  TOOL_DEFINITIONS[0],  // Merge PDF
  TOOL_DEFINITIONS[2],  // Compress PDF
  TOOL_DEFINITIONS[6],  // Images to PDF
  TOOL_DEFINITIONS[14], // Document Scanner
];