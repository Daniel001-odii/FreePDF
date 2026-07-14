// ============================================================
// Dark / Red design system (matches "Image to PDF" reference UI)
// ============================================================

export const Palette = {
  // Legacy / fallback static props (dark mode by default to avoid breaking imports)
  bg: '#0A0A0A',
  surface: '#1C1C1E',
  surfaceAlt: '#161618',
  border: '#2C2C2E',
  accent: '#FF3B30',
  accentMuted: '#3A1F1E',
  text: '#FFFFFF',
  textMuted: '#9C9CA3',
  textFaint: '#5C5C61',
  white: '#FFFFFF',

  // Theme-specific configurations
  light: {
    bg: '#F2F2F7',
    background: '#F2F2F7', // alias for components/Themed.tsx compatibility
    surface: '#FFFFFF',
    surfaceAlt: '#E5E5EA',
    border: '#E5E5EA',
    accent: '#FF3B30',
    accentMuted: '#FFEBEA',
    text: '#1C1C1E',
    textMuted: '#8E8E93',
    textFaint: '#AEAEB2',
    white: '#FFFFFF',
  },
  dark: {
    bg: '#0A0A0A',
    background: '#0A0A0A', // alias for components/Themed.tsx compatibility
    surface: '#1C1C1E',
    surfaceAlt: '#161618',
    border: '#2C2C2E',
    accent: '#FF3B30',
    accentMuted: '#3A1F1E',
    text: '#FFFFFF',
    textMuted: '#9C9CA3',
    textFaint: '#5C5C61',
    white: '#FFFFFF',
  }
};

const tintColorDark = '#FF3B30';

export default {
  light: Palette.light,
  dark: Palette.dark,
};

