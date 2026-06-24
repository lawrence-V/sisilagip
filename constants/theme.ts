import { type TextStyle, type ViewStyle } from 'react-native';

export const COLORS = {
  surface: '#F9F9F9',
  surfaceDim: '#DADADA',
  surfaceBright: '#F9F9F9',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F3F3F3',
  surfaceContainer: '#EEEEEE',
  surfaceContainerHigh: '#E8E8E8',
  surfaceContainerHighest: '#E2E2E2',
  onSurface: '#1A1C1C',
  onSurfaceVariant: '#49454F',
  inverseSurface: '#2F3131',
  inverseOnSurface: '#F1F1F1',
  outline: '#7A7580',
  outlineVariant: '#CBC4D0',
  surfaceTint: '#68548D',
  primary: '#68548D',
  onPrimary: '#FFFFFF',
  primaryContainer: '#B39DDB',
  onPrimaryContainer: '#453268',
  inversePrimary: '#D3BCFC',
  secondary: '#006685',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#84D7FD',
  onSecondaryContainer: '#005D79',
  tertiary: '#964261',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#ED89AB',
  onTertiaryContainer: '#6C2040',
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#93000A',
  primaryFixed: '#EBDCFF',
  primaryFixedDim: '#D3BCFC',
  onPrimaryFixed: '#230F45',
  onPrimaryFixedVariant: '#503D73',
  secondaryFixed: '#BEE9FF',
  secondaryFixedDim: '#7ED1F7',
  onSecondaryFixed: '#001F2A',
  onSecondaryFixedVariant: '#004D65',
  tertiaryFixed: '#FFD9E2',
  tertiaryFixedDim: '#FFB0C9',
  onTertiaryFixed: '#3E001E',
  onTertiaryFixedVariant: '#792B4A',
  background: '#F9F9F9',
  onBackground: '#1A1C1C',
  surfaceVariant: '#E2E2E2',
  cameraOverlay: 'rgba(26, 28, 28, 0.16)',
  countdownShadow: 'rgba(26, 28, 28, 0.35)',
  transparent: 'transparent',
} as const;

export const Colors = {
  light: {
    text: COLORS.onSurface,
    background: COLORS.background,
    tint: COLORS.primary,
    icon: COLORS.onSurfaceVariant,
    tabIconDefault: COLORS.outline,
    tabIconSelected: COLORS.primary,
    card: COLORS.surfaceContainerLowest,
    border: COLORS.outlineVariant,
    notification: COLORS.tertiary,
  },
  dark: {
    text: COLORS.onSurface,
    background: COLORS.background,
    tint: COLORS.primary,
    icon: COLORS.onSurfaceVariant,
    tabIconDefault: COLORS.outline,
    tabIconSelected: COLORS.primary,
    card: COLORS.surfaceContainerLowest,
    border: COLORS.outlineVariant,
    notification: COLORS.tertiary,
  },
} as const;

export const FONT_FAMILIES = {
  regular: 'NunitoSans_400Regular',
  bold: 'NunitoSans_700Bold',
  extraBold: 'NunitoSans_800ExtraBold',
} as const;

export const TYPOGRAPHY = {
  displayLarge: {
    fontFamily: FONT_FAMILIES.extraBold,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -0.96,
  },
  headlineLarge: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 32,
    lineHeight: 40,
  },
  headlineMedium: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 24,
    lineHeight: 32,
  },
  bodyLarge: {
    fontFamily: FONT_FAMILIES.regular,
    fontSize: 20,
    lineHeight: 28,
  },
  bodyMedium: {
    fontFamily: FONT_FAMILIES.regular,
    fontSize: 18,
    lineHeight: 26,
  },
  labelLarge: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  buttonText: {
    fontFamily: FONT_FAMILIES.bold,
    fontSize: 22,
    lineHeight: 24,
  },
} satisfies Record<string, TextStyle>;

export const SPACING = {
  unit: 8,
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 64,
  mobileMargin: 24,
  tabletMargin: 48,
  gutter: 24,
} as const;

export const RADII = {
  small: 4,
  default: 8,
  medium: 12,
  large: 16,
  extraLarge: 24,
  full: 9999,
} as const;

export const SIZES = {
  touchTargetMinimum: 80,
  chipHeight: 56,
  inputHeight: 64,
  contentMaxWidth: 960,
} as const;

export const SHADOWS = {
  card: {
    boxShadow: '0 8px 24px rgba(104, 84, 141, 0.12)',
  },
  button: {
    boxShadow: '0 10px 18px rgba(104, 84, 141, 0.24)',
  },
  buttonPressed: {
    boxShadow: '0 4px 10px rgba(104, 84, 141, 0.18)',
  },
  welcomePhoto: {
    boxShadow: '0 12px 32px rgba(104, 84, 141, 0.12)',
  },
  cameraControl: {
    boxShadow: '0 6px 18px rgba(26, 28, 28, 0.10)',
  },
  cameraShutter: {
    boxShadow: '0 8px 24px rgba(104, 84, 141, 0.22)',
  },
  previewPrint: {
    boxShadow: '0 16px 36px rgba(104, 84, 141, 0.12)',
  },
  layoutSelected: {
    boxShadow: '0 16px 34px rgba(150, 66, 97, 0.18)',
  },
} satisfies Record<string, ViewStyle>;

export const Fonts = {
  sans: FONT_FAMILIES.regular,
  serif: FONT_FAMILIES.regular,
  rounded: FONT_FAMILIES.regular,
  mono: 'monospace',
} as const;
