// ============================================================
// HugeIcon – Typed icon wrapper for @hugeicons/react-native
// Maps ToolIconName → actual icon imports
// ============================================================

import {
  Clock01Icon,
  Copy01Icon,
  CreditCardIcon,
  DocumentAttachmentIcon,
  DocumentValidationIcon,
  DropperIcon,
  EncryptIcon,
  ExpanderIcon,
  FileFavouriteIcon,
  Home01Icon,
  ImageAdd01Icon,
  ImageFlipHorizontalIcon,
  InformationSquareIcon,
  InsertBottomImageIcon,
  LockKeyIcon,
  PackageIcon,
  PassportIcon,
  Pen01Icon,
  RotateClockwiseIcon,
  Settings01Icon,
  Share01Icon,
  Shield01Icon,
  SortingAZ01Icon,
  StarIcon,
  TextIcon,
  TextWrapIcon,
  WebDesign01Icon
} from '@hugeicons/core-free-icons';
import type { HugeiconsProps } from '@hugeicons/react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';

import type { ToolIconName } from '@/src/types';

// Map tool icon names → actual hugeicon assets
const ICON_MAP: Record<ToolIconName, unknown> = {
  home: Home01Icon,
  recents: Clock01Icon,
  favorites: FileFavouriteIcon,
  settings: Settings01Icon,
  about: InformationSquareIcon,
  search: InsertBottomImageIcon,
  merge: DocumentAttachmentIcon,
  split: InsertBottomImageIcon,
  compress: ExpanderIcon,
  rotate: RotateClockwiseIcon,
  reorder: SortingAZ01Icon,
  extract: Copy01Icon,
  'image-to-pdf': ImageAdd01Icon,
  'pdf-to-image': ImageFlipHorizontalIcon,
  'pdf-to-text': TextWrapIcon,
  'pdf-to-html': WebDesign01Icon,
  watermark: DropperIcon,
  'add-text': TextIcon,
  signature: Pen01Icon,
  'add-image': ImageAdd01Icon,
  'document-scanner': DocumentValidationIcon,
  'receipt-scanner': CreditCardIcon,
  'id-scanner': PassportIcon,
  'password-protect': LockKeyIcon,
  'remove-password': LockKeyIcon,
  encrypt: EncryptIcon,
  metadata: InformationSquareIcon,
  'file-size': PackageIcon,
  privacy: Shield01Icon,
  rate: StarIcon,
  share: Share01Icon,
};

const FALLBACK_ICON = Home01Icon;

interface Props extends Omit<HugeiconsProps, 'icon'> {
  name: ToolIconName;
}

export function HugeIcon({ name, ...rest }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icon = (ICON_MAP[name] ?? FALLBACK_ICON) as any;
  return <HugeiconsIcon icon={icon} {...rest} />;
}