import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { AnimatedPrinter } from '@/components/printing/AnimatedPrinter';
import { PrintingStatusRow } from '@/components/printing/PrintingStatusRow';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS, RADII, SHADOWS, SPACING, TYPOGRAPHY } from '@/constants/theme';

const PRINTING_STEPS = [
  'Photo ready',
  'Receipt prepared',
  'Sending to printer...',
  'Almost done!',
] as const;

export default function PrintingScreen() {
  const { copies } = useLocalSearchParams<{ copies?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const [activeStep, setActiveStep] = useState(0);
  const isComplete = activeStep >= PRINTING_STEPS.length;
  const requestedCopiesValue = Array.isArray(copies) ? copies[0] : copies;
  const requestedCopies = Math.min(5, Math.max(1, Number(requestedCopiesValue) || 1));

  useEffect(() => {
    if (isComplete) {
      return;
    }

    const timer = setTimeout(() => {
      setActiveStep((currentStep) => currentStep + 1);
    }, activeStep === 2 ? 1800 : 900);

    return () => clearTimeout(timer);
  }, [activeStep, isComplete]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: insets.top + SPACING.sm,
          paddingBottom: insets.bottom + SPACING.lg,
        },
      ]}>
      <AppHeader />

      <View style={styles.content}>
        <Animated.View entering={FadeInDown.duration(260)} style={styles.heroCard}>
          <AnimatedPrinter complete={isComplete} />
          <View style={styles.heading}>
            <Text selectable style={styles.title}>
              {isComplete ? 'Print ready!' : 'Printing your photo...'}
            </Text>
            <Text selectable style={styles.subtitle}>
              {isComplete
                ? `${requestedCopies} ${
                    requestedCopies === 1 ? 'copy is' : 'copies are'
                  } ready.`
                : `Preparing ${requestedCopies} ${
                    requestedCopies === 1 ? 'copy' : 'copies'
                  } of your receipt.`}
            </Text>
          </View>
        </Animated.View>

        <Animated.View layout={LinearTransition} style={styles.statusCard}>
          {PRINTING_STEPS.map((step, index) => (
            <PrintingStatusRow
              key={step}
              label={step}
              status={
                index < activeStep ? 'complete' : index === activeStep ? 'printing' : 'pending'
              }
            />
          ))}
        </Animated.View>

        <Pressable
          accessibilityRole="button"
          onPress={() => (isComplete ? router.dismissTo('/') : router.back())}
          style={({ pressed }) => [
            styles.actionButton,
            isComplete && styles.completeButton,
            pressed && styles.pressedButton,
          ]}>
          <IconSymbol
            name={isComplete ? 'checkmark.circle.fill' : 'xmark'}
            size={26}
            color={isComplete ? COLORS.onPrimary : COLORS.onSurfaceVariant}
          />
          <Text style={[styles.actionLabel, isComplete && styles.completeLabel]}>
            {isComplete ? 'Done' : 'Cancel'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    gap: SPACING.lg,
    paddingHorizontal: SPACING.tabletMargin,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  heroCard: {
    width: '100%',
    maxWidth: 760,
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainerHigh,
    borderRadius: RADII.extraLarge,
    borderCurve: 'continuous',
    ...SHADOWS.card,
  },
  heading: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.headlineLarge,
    color: COLORS.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  statusCard: {
    width: '100%',
    maxWidth: 520,
    gap: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainerHigh,
    borderRadius: RADII.large,
    borderCurve: 'continuous',
  },
  actionButton: {
    minWidth: 180,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: RADII.full,
    ...SHADOWS.card,
  },
  completeButton: {
    backgroundColor: COLORS.primary,
  },
  pressedButton: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  actionLabel: {
    ...TYPOGRAPHY.buttonText,
    color: COLORS.onSurfaceVariant,
  },
  completeLabel: {
    color: COLORS.onPrimary,
  },
});
