import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/constants/theme';

type PrintCopiesControlProps = {
  onChange: (value: number) => void;
  value: number;
};

export function PrintCopiesControl({ onChange, value }: PrintCopiesControlProps) {
  return (
    <View style={styles.container}>
      <View>
        <Text selectable style={styles.label}>
          Number of Print Copies
        </Text>
        <Text selectable style={styles.helperText}>
          Default per session
        </Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityLabel="Decrease print copies"
          accessibilityRole="button"
          disabled={value <= 1}
          onPress={() => onChange(Math.max(1, value - 1))}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
            value <= 1 && styles.disabled,
          ]}>
          <Text style={styles.buttonText}>−</Text>
        </Pressable>
        <Text selectable style={styles.value}>
          {value}
        </Text>
        <Pressable
          accessibilityLabel="Increase print copies"
          accessibilityRole="button"
          disabled={value >= 5}
          onPress={() => onChange(Math.min(5, value + 1))}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
            value >= 5 && styles.disabled,
          ]}>
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.onSurface,
  },
  helperText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.outline,
    fontSize: 14,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.xs,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADII.medium,
  },
  button: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryContainer,
    borderRadius: RADII.medium,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.4,
  },
  buttonText: {
    ...TYPOGRAPHY.headlineMedium,
    color: COLORS.onPrimaryContainer,
  },
  value: {
    ...TYPOGRAPHY.headlineMedium,
    minWidth: 30,
    color: COLORS.primary,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
