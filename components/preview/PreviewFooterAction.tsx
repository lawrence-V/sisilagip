import { Pressable, StyleSheet, Text } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/constants/theme';

type PreviewFooterActionProps = {
  active?: boolean;
  icon: 'arrow.clockwise' | 'checkmark.circle.fill' | 'square.and.arrow.up';
  label: string;
  onPress: () => void;
};

export function PreviewFooterAction({
  active = false,
  icon,
  label,
  onPress,
}: PreviewFooterActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        active && styles.activeAction,
        pressed && styles.pressed,
      ]}>
      <IconSymbol
        name={icon}
        size={24}
        color={active ? COLORS.onPrimary : COLORS.onSurfaceVariant}
      />
      <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    minWidth: 112,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.full,
  },
  activeAction: {
    backgroundColor: COLORS.primary,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  label: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.onSurfaceVariant,
  },
  activeLabel: {
    color: COLORS.onPrimary,
  },
});
