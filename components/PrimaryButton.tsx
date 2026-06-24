import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { COLORS, RADII, SHADOWS, SIZES, SPACING, TYPOGRAPHY } from '@/constants/theme';

type PrimaryButtonProps = PressableProps & {
  label: string;
};

export function PrimaryButton({
  children,
  label,
  disabled,
  style,
  ...props
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.button,
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}>
      {children ?? <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: SIZES.touchTargetMinimum,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADII.full,
    borderCurve: 'continuous',
    ...SHADOWS.button,
  },
  pressed: {
    transform: [{ scale: 0.98 }, { translateY: 5 }],
    ...SHADOWS.buttonPressed,
  },
  disabled: {
    backgroundColor: COLORS.surfaceDim,
    boxShadow: 'none',
  },
  label: {
    ...TYPOGRAPHY.buttonText,
    color: COLORS.onPrimary,
    textAlign: 'center',
  },
});
