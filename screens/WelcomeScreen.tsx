import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { APP_BRAND_NAME } from '@/constants/app';
import { COLORS, RADII, SHADOWS, SIZES, SPACING, TYPOGRAPHY } from '@/constants/theme';

export default function WelcomeScreen() {
  const { height, width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.scrollContent,
        isTablet ? styles.tabletContent : styles.mobileContent,
        { minHeight: height },
      ]}>
      <View style={styles.glow} />

      <View style={styles.header}>
        <Text selectable style={styles.brand}>
          {APP_BRAND_NAME}
        </Text>

        <View style={styles.headerActions}>
          <Link href="/help" asChild>
            <PrimaryButton label="" accessibilityLabel="Help" style={styles.iconButton}>
              <IconSymbol
                name="questionmark.circle"
                size={28}
                color={COLORS.onSurfaceVariant}
              />
            </PrimaryButton>
          </Link>

          <Link href="/settings" asChild>
            <PrimaryButton label="" accessibilityLabel="Settings" style={styles.iconButton}>
              <IconSymbol name="gearshape" size={29} color={COLORS.onSurfaceVariant} />
            </PrimaryButton>
          </Link>
        </View>
      </View>

      <View style={[styles.main, isTablet ? styles.tabletMain : styles.mobileMain]}>
        <View style={styles.heading}>
          <Text selectable style={[styles.title, !isTablet && styles.mobileTitle]}>
            {APP_BRAND_NAME.toUpperCase()}
          </Text>
          <View style={styles.tagline}>
            <Text selectable style={styles.taglineText}>
              Strike a pose!
            </Text>
            <IconSymbol name="camera.fill" size={25} color={COLORS.primary} />
          </View>
        </View>

        <View style={[styles.photoCard, !isTablet && styles.mobilePhotoCard]}>
          <View style={styles.photoFrame}>
            <Image
              source={require('@/assets/images/welcome/group-preview.png')}
              contentFit="cover"
              style={styles.photo}
            />
          </View>
        </View>

        <View style={styles.callToAction}>
          <Link href="/layout-selection" asChild>
            <PrimaryButton
              label="START"
              accessibilityHint="Opens photo layout selection"
              style={styles.startButton}
            />
          </Link>
          <Text selectable style={styles.helperText}>
            Tap the button to create memories
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  tabletContent: {
    paddingHorizontal: SPACING.tabletMargin,
    paddingVertical: SPACING.md,
  },
  mobileContent: {
    paddingHorizontal: SPACING.mobileMargin,
    paddingVertical: SPACING.sm,
  },
  glow: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    width: 280,
    height: 280,
    backgroundColor: COLORS.primaryFixed,
    borderRadius: RADII.full,
    opacity: 0.16,
    transform: [{ scaleX: 1.4 }],
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  brand: {
    ...TYPOGRAPHY.headlineLarge,
    color: COLORS.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconButton: {
    width: 56,
    minHeight: 56,
    paddingHorizontal: 0,
    backgroundColor: COLORS.transparent,
    boxShadow: 'none',
  },
  main: {
    flex: 1,
    width: '100%',
    maxWidth: SIZES.contentMaxWidth,
    alignSelf: 'center',
    alignItems: 'center',
    gap: SPACING.xl,
    paddingBottom: SPACING.md,
    zIndex: 1,
  },
  tabletMain: {
    paddingTop: 240,
  },
  mobileMain: {
    paddingTop: 96,
  },
  heading: {
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
  tagline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  taglineText: {
    ...TYPOGRAPHY.headlineMedium,
    color: COLORS.onSurfaceVariant,
  },
  photoCard: {
    width: 440,
    height: 250,
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.primaryFixedDim,
    borderWidth: 8,
    borderColor: COLORS.surfaceContainerLowest,
    borderRadius: RADII.extraLarge,
    borderCurve: 'continuous',
    overflow: 'hidden',
    transform: [{ rotate: '1.5deg' }],
    ...SHADOWS.welcomePhoto,
  },
  mobilePhotoCard: {
    width: 330,
    height: 190,
    paddingHorizontal: SPACING.lg,
  },
  photoFrame: {
    width: '100%',
    height: 128,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 3,
    borderColor: COLORS.onSurface,
    borderTopLeftRadius: RADII.extraLarge,
    borderTopRightRadius: RADII.extraLarge,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  callToAction: {
    width: '100%',
    alignItems: 'center',
    gap: SPACING.md,
  },
  startButton: {
    width: '100%',
    maxWidth: 344,
    minHeight: 120,
  },
  helperText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.outline,
    textAlign: 'center',
  },
});
