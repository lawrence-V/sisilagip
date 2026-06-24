import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { COLORS, RADII, SIZES, SPACING, TYPOGRAPHY } from '@/constants/theme';

type FilterChipProps = PressableProps & {
  label: string;
  selected?: boolean;
};

export function FilterChip({ label, selected = false, style, ...props }: FilterChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={(state) => [
        styles.chip,
        selected && styles.selected,
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}>
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: SIZES.chipHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.primaryFixed,
    borderWidth: 1,
    borderColor: COLORS.primaryFixedDim,
    borderRadius: RADII.full,
  },
  selected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  label: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.onPrimaryFixedVariant,
  },
  selectedLabel: {
    color: COLORS.onPrimary,
  },
});
