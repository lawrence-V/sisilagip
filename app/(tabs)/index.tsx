import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ActionCard } from '@/components/ActionCard';
import { FilterChip } from '@/components/FilterChip';
import { PrimaryButton } from '@/components/PrimaryButton';
import { COLORS, RADII, SIZES, SPACING, TYPOGRAPHY } from '@/constants/theme';

const FILTERS = ['Natural', 'Black & White', 'Vintage'] as const;

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const [selectedFilter, setSelectedFilter] = useState<(typeof FILTERS)[number]>('Natural');
  const isTablet = width >= 768;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.scrollContent,
        isTablet ? styles.tabletContent : styles.mobileContent,
      ]}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>SISILAGIP PHOTO BOOTH</Text>
          <Text style={styles.title}>Capture shared joy.</Text>
          <Text style={styles.description}>
            A soft, welcoming interface designed to be clear and comfortable for every generation.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose your layout</Text>
          <View style={styles.cardGrid}>
            <ActionCard
              title="Classic Strip"
              description="Four moments in a timeless photo booth layout."
              selected
            />
            <ActionCard
              title="Celebration Grid"
              description="A spacious layout for groups and special occasions."
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pick a filter</Text>
          <View style={styles.chipRow}>
            {FILTERS.map((filter) => (
              <FilterChip
                key={filter}
                label={filter}
                selected={selectedFilter === filter}
                onPress={() => setSelectedFilter(filter)}
              />
            ))}
          </View>
        </View>

        <PrimaryButton label="Tap to Start" onPress={() => undefined} />

        <View style={styles.note}>
          <Text style={styles.noteText}>
            Change the project palette, spacing, type, and shapes from constants/theme.ts.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  mobileContent: {
    padding: SPACING.mobileMargin,
  },
  tabletContent: {
    padding: SPACING.tabletMargin,
  },
  container: {
    width: '100%',
    maxWidth: SIZES.contentMaxWidth,
    gap: SPACING.xl,
  },
  hero: {
    gap: SPACING.sm,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  eyebrow: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.secondary,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  title: {
    ...TYPOGRAPHY.displayLarge,
    color: COLORS.onBackground,
    textAlign: 'center',
  },
  description: {
    ...TYPOGRAPHY.bodyLarge,
    maxWidth: 680,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  section: {
    gap: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.headlineMedium,
    color: COLORS.onSurface,
  },
  cardGrid: {
    gap: SPACING.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  note: {
    padding: SPACING.sm,
    backgroundColor: COLORS.secondaryFixed,
    borderRadius: RADII.medium,
    borderCurve: 'continuous',
  },
  noteText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.onSecondaryFixedVariant,
    textAlign: 'center',
  },
});
