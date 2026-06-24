import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ColorSwatch } from '@/components/ColorSwatch';
import { COLORS, RADII, SIZES, SPACING, TYPOGRAPHY } from '@/constants/theme';

const SWATCHES = [
  { name: 'Primary', color: COLORS.primary, text: COLORS.onPrimary },
  { name: 'Secondary', color: COLORS.secondaryContainer, text: COLORS.onSecondaryContainer },
  { name: 'Tertiary', color: COLORS.tertiaryContainer, text: COLORS.onTertiaryContainer },
  { name: 'Surface', color: COLORS.surfaceContainerLowest, text: COLORS.onSurface },
] as const;

export default function DesignSystemScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <View style={styles.heading}>
          <Text style={styles.title}>Design system</Text>
          <Text style={styles.description}>
            These examples read directly from the shared tokens in constants/theme.ts.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Core colors</Text>
          <View style={styles.swatchGrid}>
            {SWATCHES.map((swatch) => (
              <ColorSwatch
                key={swatch.name}
                name={swatch.name}
                color={swatch.color}
                textColor={swatch.text}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type scale</Text>
          <View style={styles.typeCard}>
            <Text style={styles.displaySample}>Shared Joy</Text>
            <Text style={styles.headlineSample}>Friendly and clear</Text>
            <Text style={styles.bodySample}>
              Nunito Sans and generous spacing keep the experience readable at a distance.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    padding: SPACING.tabletMargin,
    backgroundColor: COLORS.background,
  },
  container: {
    width: '100%',
    maxWidth: SIZES.contentMaxWidth,
    gap: SPACING.xl,
  },
  heading: {
    gap: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.headlineLarge,
    color: COLORS.onBackground,
  },
  description: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.onSurfaceVariant,
  },
  section: {
    gap: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.headlineMedium,
    color: COLORS.onSurface,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  typeCard: {
    gap: SPACING.sm,
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADII.large,
    borderCurve: 'continuous',
  },
  displaySample: {
    ...TYPOGRAPHY.displayLarge,
    color: COLORS.primary,
  },
  headlineSample: {
    ...TYPOGRAPHY.headlineLarge,
    color: COLORS.onSurface,
  },
  bodySample: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.onSurfaceVariant,
  },
});
