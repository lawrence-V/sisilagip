import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { PhotoLayoutCard } from '@/components/layout/PhotoLayoutCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { COLORS, SIZES, SPACING, TYPOGRAPHY } from '@/constants/theme';
import {
  DEFAULT_PHOTO_LAYOUT_ID,
  PHOTO_LAYOUTS,
  getPhotoLayout,
} from '@/constants/photoLayouts';
import { type PhotoLayoutId } from '@/types/PhotoLayout';

export default function LayoutSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [selectedLayoutId, setSelectedLayoutId] =
    useState<PhotoLayoutId>(DEFAULT_PHOTO_LAYOUT_ID);
  const isTablet = width >= 768;
  const selectedLayout = getPhotoLayout(selectedLayoutId);

  const selectLayout = async (layoutId: PhotoLayoutId) => {
    setSelectedLayoutId(layoutId);
    await Haptics.selectionAsync();
  };

  const confirmLayout = () => {
    router.push({
      pathname: '/camera',
      params: {
        layoutId: selectedLayout.id,
      },
    });
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.scrollContent,
        !isTablet && styles.mobileScrollContent,
        {
          paddingTop: insets.top + SPACING.sm,
          paddingBottom: insets.bottom + SPACING.xxl,
        },
      ]}>
      <AppHeader />

      <Animated.View entering={FadeInDown.duration(260)} style={styles.heading}>
        <Text selectable style={[styles.title, !isTablet && styles.mobileTitle]}>
          Choose Your Layout
        </Text>
        <Text selectable style={styles.subtitle}>
          Select how many photos you want to take for your print.
        </Text>
      </Animated.View>

      <View accessibilityRole="radiogroup" style={styles.layoutGrid}>
        {PHOTO_LAYOUTS.map((layout, index) => (
          <PhotoLayoutCard
            key={layout.id}
            index={index}
            layout={layout}
            selected={selectedLayoutId === layout.id}
            onPress={() => selectLayout(layout.id)}
          />
        ))}
      </View>

      <Animated.View entering={FadeIn.delay(280).duration(220)} style={styles.confirmArea}>
        <Text selectable style={styles.selectionSummary}>
          {selectedLayout.name} requires {selectedLayout.photoCount}{' '}
          {selectedLayout.photoCount === 1 ? 'photo' : 'photos'}.
        </Text>
        <PrimaryButton
          label={`CONFIRM ${selectedLayout.photoCount} ${
            selectedLayout.photoCount === 1 ? 'PHOTO' : 'PHOTOS'
          }`}
          onPress={confirmLayout}
          style={styles.confirmButton}
        />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    gap: SPACING.xl,
    paddingHorizontal: SPACING.tabletMargin,
    backgroundColor: COLORS.background,
  },
  mobileScrollContent: {
    gap: SPACING.lg,
    paddingHorizontal: SPACING.mobileMargin,
  },
  heading: {
    width: '100%',
    maxWidth: SIZES.contentMaxWidth,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.displayLarge,
    color: COLORS.onBackground,
    textAlign: 'center',
  },
  mobileTitle: {
    fontSize: 36,
    lineHeight: 44,
  },
  subtitle: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  layoutGrid: {
    width: '100%',
    maxWidth: 1200,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  confirmArea: {
    width: '100%',
    maxWidth: 600,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  selectionSummary: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  confirmButton: {
    width: '100%',
  },
});
