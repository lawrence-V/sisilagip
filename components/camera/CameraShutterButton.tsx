import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, RADII, SHADOWS, SPACING, TYPOGRAPHY } from '@/constants/theme';

type CameraShutterButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

export function CameraShutterButton({
  disabled = false,
  label,
  onPress,
}: CameraShutterButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <View style={styles.shutter}>
        <View style={styles.shutterCenter} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
  disabled: {
    opacity: 0.45,
  },
  shutter: {
    width: 116,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 7,
    borderColor: COLORS.primaryContainer,
    borderRadius: RADII.full,
    ...SHADOWS.cameraShutter,
  },
  shutterCenter: {
    width: 88,
    height: 88,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADII.full,
  },
  label: {
    ...TYPOGRAPHY.buttonText,
    color: COLORS.primary,
  },
});
