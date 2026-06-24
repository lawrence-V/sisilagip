import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { COLORS, RADII, SIZES, SPACING, TYPOGRAPHY } from '@/constants/theme';

export default function HelpScreen() {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <Text selectable style={styles.title}>
          How to use the booth
        </Text>

        <View style={styles.instructions}>
          <Text selectable style={styles.instruction}>
            1. Tap Start on the welcome screen.
          </Text>
          <Text selectable style={styles.instruction}>
            2. Choose your preferred photo layout and filter.
          </Text>
          <Text selectable style={styles.instruction}>
            3. Follow the countdown, then strike a pose.
          </Text>
        </View>

        <Link href="/" dismissTo style={styles.homeLink}>
          <Text selectable style={styles.homeLinkText}>
            Return to welcome screen
          </Text>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  container: {
    width: '100%',
    maxWidth: SIZES.contentMaxWidth,
    gap: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADII.large,
    borderCurve: 'continuous',
  },
  title: {
    ...TYPOGRAPHY.headlineLarge,
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  instructions: {
    gap: SPACING.sm,
  },
  instruction: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.onSurfaceVariant,
  },
  homeLink: {
    alignSelf: 'center',
    padding: SPACING.sm,
  },
  homeLinkText: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.primary,
  },
});
