import { StyleSheet, Text, type TextProps } from 'react-native';

import { COLORS, TYPOGRAPHY } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | 'bodyLarge'
    | 'bodyMedium'
    | 'button'
    | 'default'
    | 'defaultSemiBold'
    | 'display'
    | 'headline'
    | 'link'
    | 'subtitle'
    | 'title';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return <Text selectable style={[styles[type], { color }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  bodyLarge: TYPOGRAPHY.bodyLarge,
  bodyMedium: TYPOGRAPHY.bodyMedium,
  button: TYPOGRAPHY.buttonText,
  default: TYPOGRAPHY.bodyMedium,
  defaultSemiBold: TYPOGRAPHY.labelLarge,
  display: TYPOGRAPHY.displayLarge,
  headline: TYPOGRAPHY.headlineLarge,
  link: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.secondary,
  },
  subtitle: TYPOGRAPHY.headlineMedium,
  title: TYPOGRAPHY.headlineLarge,
});
