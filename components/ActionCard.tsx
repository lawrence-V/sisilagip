import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';

import { COLORS, RADII, SHADOWS, SIZES, SPACING, TYPOGRAPHY } from '@/constants/theme';

type ActionCardProps = PressableProps & {
  title: string;
  description: string;
  selected?: boolean;
};

export function ActionCard({
  title,
  description,
  selected = false,
  style,
  ...props
}: ActionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={(state) => [
        styles.card,
        selected && styles.selected,
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: SIZES.touchTargetMinimum,
    justifyContent: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: COLORS.transparent,
    borderRadius: RADII.large,
    borderCurve: 'continuous',
    ...SHADOWS.card,
  },
  selected: {
    borderColor: COLORS.tertiaryContainer,
    backgroundColor: COLORS.tertiaryFixed,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  content: {
    gap: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.headlineMedium,
    color: COLORS.onSurface,
  },
  description: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.onSurfaceVariant,
  },
});
