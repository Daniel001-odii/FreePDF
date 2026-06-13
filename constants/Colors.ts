// ============================================================
// Dark / Red design system (matches "Image to PDF" reference UI)
// ============================================================

export const Palette = {
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
};

const tintColorDark = '#FF3B30';

export default {
  light: {
    text: Palette.text,
    background: Palette.bg,
    tint: tintColorDark,
    tabIconDefault: Palette.textMuted,
    tabIconSelected: tintColorDark,
  },
  dark: {
    text: Palette.text,
    background: Palette.bg,
    tint: tintColorDark,
    tabIconDefault: Palette.textMuted,
    tabIconSelected: tintColorDark,
  },
};
