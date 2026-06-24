import { Pressable, StyleSheet, Text } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS, RADII, SHADOWS, SPACING, TYPOGRAPHY } from '@/constants/theme';

type PreviewActionButtonVariant = 'outline' | 'primary' | 'secondary';

type PreviewActionButtonProps = {
  icon: 'camera.fill' | 'paintpalette.fill' | 'printer.fill';
  label: string;
  onPress: () => void;
  variant: PreviewActionButtonVariant;
};

export function PreviewActionButton({
  icon,
  label,
  onPress,
  variant,
}: PreviewActionButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && styles.pressed,
      ]}>
      <IconSymbol
        name={icon}
        size={27}
        color={isPrimary ? COLORS.onPrimary : COLORS.onPrimaryContainer}
      />
      <Text style={[styles.label, isPrimary && styles.primaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADII.medium,
    borderCurve: 'continuous',
  },
  outline: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
  },
  secondary: {
    backgroundColor: COLORS.primaryContainer,
  },
  primary: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.button,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  label: {
    ...TYPOGRAPHY.buttonText,
    color: COLORS.onPrimaryContainer,
  },
  primaryLabel: {
    color: COLORS.onPrimary,
  },
});
