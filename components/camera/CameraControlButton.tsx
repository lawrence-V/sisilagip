import { Pressable, StyleSheet, Text } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS, RADII, SHADOWS, SPACING, TYPOGRAPHY } from '@/constants/theme';

type CameraControlButtonProps = {
  accessibilityLabel: string;
  compact?: boolean;
  icon: 'arrow.left' | 'bolt.fill' | 'camera.rotate';
  label: string;
  onPress: () => void;
};

export function CameraControlButton({
  accessibilityLabel,
  compact = false,
  icon,
  label,
  onPress,
}: CameraControlButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compactButton,
        pressed && styles.pressed,
      ]}>
      <IconSymbol name={icon} size={24} color={COLORS.onSurfaceVariant} />
      {!compact && <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADII.full,
    borderCurve: 'continuous',
    ...SHADOWS.cameraControl,
  },
  compactButton: {
    width: 52,
    minHeight: 52,
    paddingHorizontal: 0,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  label: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.onSurfaceVariant,
  },
});
