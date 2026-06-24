import { Pressable, StyleSheet, Text } from 'react-native';
import { useEffect } from 'react';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { LayoutPreviewGrid } from '@/components/layout/LayoutPreviewGrid';
import { COLORS, RADII, SHADOWS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { type PhotoLayout } from '@/types/PhotoLayout';

type PhotoLayoutCardProps = {
  index: number;
  layout: PhotoLayout;
  onPress: () => void;
  selected: boolean;
};

export function PhotoLayoutCard({
  index,
  layout,
  onPress,
  selected,
}: PhotoLayoutCardProps) {
  const pressedScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressedScale.value }],
  }));

  useEffect(() => {
    pressedScale.value = withSpring(selected ? 1.025 : 1, {
      damping: 14,
      stiffness: 220,
    });
  }, [pressedScale, selected]);

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 60).duration(240)}
      style={[styles.animatedCard, animatedStyle]}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        onPress={onPress}
        onPressIn={() => {
          pressedScale.value = withSpring(0.97, { damping: 16, stiffness: 240 });
        }}
        onPressOut={() => {
          pressedScale.value = withSpring(selected ? 1.025 : 1, {
            damping: 14,
            stiffness: 220,
          });
        }}
        style={[styles.card, selected && styles.selectedCard]}>
        <LayoutPreviewGrid
          columns={layout.columns}
          photoCount={layout.photoCount}
          selected={selected}
        />
        <Text selectable style={styles.name}>
          {layout.name}
        </Text>
        <Text selectable style={styles.description}>
          {layout.description}
        </Text>
        <Text selectable style={[styles.photoCount, selected && styles.selectedPhotoCount]}>
          {layout.photoCount} {layout.photoCount === 1 ? 'photo' : 'photos'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedCard: {
    width: '30%',
    minWidth: 260,
    maxWidth: 380,
    flexGrow: 1,
  },
  card: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 4,
    borderColor: COLORS.transparent,
    borderRadius: RADII.extraLarge,
    borderCurve: 'continuous',
    ...SHADOWS.card,
  },
  selectedCard: {
    backgroundColor: COLORS.primaryFixed,
    borderColor: COLORS.tertiaryContainer,
    ...SHADOWS.layoutSelected,
  },
  name: {
    ...TYPOGRAPHY.headlineMedium,
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  description: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  photoCount: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.secondary,
    textAlign: 'center',
  },
  selectedPhotoCount: {
    color: COLORS.primary,
  },
});
