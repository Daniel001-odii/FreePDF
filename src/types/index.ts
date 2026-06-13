// ============================================================
// Core Data Types for FreePDF
// ============================================================

/** Supported theme modes */
export type ThemeMode = 'light' | 'dark' | 'system';

/** PDF file reference stored in the app */
export interface PDFFile {
  id: string;
  uri: string;
  name: string;
  size: number;          // bytes
  pageCount: number;
  createdAt: string;     // ISO 8601
  modifiedAt: string;    // ISO 8601
  isFavorite: boolean;
  thumbnail?: string;    // base64 or file URI
}

/** Tool category enumeration */
export type ToolCategory =
  | 'pdf-management'
  | 'conversion'
  | 'editing'
  | 'scanner'
  | 'security'
  | 'utilities';

/** Operation status */
export type OperationStatus =
  | 'idle'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Operation history entry */
export interface OperationHistory {
  id: string;
  toolId: string;
  toolName: string;
  inputFiles: string[];  // PDFFile ids
  outputFile?: string;   // resulting file URI
  status: OperationStatus;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

/** Tool definition for the tools screen */
export interface ToolDefinition {
  id: string;
  name: string;
  category: ToolCategory;
  icon: ToolIconName;
  route: string;
  description: string;
  isPremium?: boolean;
}

/** Icon names used in the app (HugeIcons) */
export type ToolIconName =
  | 'merge'
  | 'split'
  | 'compress'
  | 'rotate'
  | 'reorder'
  | 'extract'
  | 'image-to-pdf'
  | 'pdf-to-image'
  | 'pdf-to-text'
  | 'pdf-to-html'
  | 'watermark'
  | 'add-text'
  | 'signature'
  | 'add-image'
  | 'document-scanner'
  | 'receipt-scanner'
  | 'id-scanner'
  | 'password-protect'
  | 'remove-password'
  | 'encrypt'
  | 'metadata'
  | 'file-size'
  | 'home'
  | 'recents'
  | 'favorites'
  | 'settings'
  | 'privacy'
  | 'rate'
  | 'share'
  | 'about'
  | 'search';

/** User settings stored locally */
export interface UserSettings {
  theme: ThemeMode;
  defaultCompressionQuality: number;   // 0 - 100
  autoSaveResults: boolean;
  showPremiumBadges: boolean;
  language: string;
}

/** Drawer menu item */
export interface DrawerMenuItem {
  label: string;
  icon: ToolIconName;
  route?: string;
  action?: () => void;
  isDivider?: boolean;
}

/** Category display info */
export interface CategoryInfo {
  id: ToolCategory;
  title: string;
  subtitle: string;
}

/** App-wide state shape (for reference) */
export interface AppState {
  isDrawerOpen: boolean;
  theme: ThemeMode;
  isProcessing: boolean;
  currentOperation: string | null;
}