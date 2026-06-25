import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { AnimatedPrinter } from '@/components/printing/AnimatedPrinter';
import { PrintingStatusRow } from '@/components/printing/PrintingStatusRow';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getPhotoLayout } from '@/constants/photoLayouts';
import { COLORS, RADII, SHADOWS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { useAppSettings } from '@/hooks/useAppSettings';
import { getPhotoPrintJob } from '@/services/photoPrintJobService';
import {
  getUsbPrinterDevices,
  printUsbReceipt,
} from '@/services/usbPrinterService';
import type {
  UsbPrinterDevice,
  UsbPrinterWidth,
  UsbPrintTone,
} from '@/types/UsbPrinter';

const PRINTING_STEPS = [
  'Looking for a USB printer',
  'Requesting permission and connecting',
  'Sending photo receipt',
] as const;

type PrintPhase = 'complete' | 'detecting' | 'error' | 'sending';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'The printer could not complete the test print.';
}

function getPrintTone(value: string | string[] | undefined): UsbPrintTone {
  const selectedValue = Array.isArray(value) ? value[0] : value;

  if (
    selectedValue === 'atkinson' ||
    selectedValue === 'auto' ||
    selectedValue === 'calibration' ||
    selectedValue === 'contrast' ||
    selectedValue === 'face' ||
    selectedValue === 'group' ||
    selectedValue === 'jarvis' ||
    selectedValue === 'sierra'
  ) {
    return selectedValue;
  }

  return 'auto';
}

export default function PrintingScreen() {
  const { copies, largePhotos, layoutId, printerWidth, printJobId, tone } =
    useLocalSearchParams<{
    copies?: string | string[];
    largePhotos?: string | string[];
    layoutId?: string | string[];
    printerWidth?: string | string[];
    printJobId?: string | string[];
    tone?: string | string[];
  }>();
  const [settings] = useAppSettings();
  const insets = useSafeAreaInsets();
  const didStartAutomatically = useRef(false);
  const [phase, setPhase] = useState<PrintPhase>('detecting');
  const [selectedPrinter, setSelectedPrinter] = useState<UsbPrinterDevice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isComplete = phase === 'complete';
  const isBusy = phase === 'detecting' || phase === 'sending';
  const requestedCopiesValue = Array.isArray(copies) ? copies[0] : copies;
  const requestedCopies = Math.min(5, Math.max(1, Number(requestedCopiesValue) || 1));
  const selectedLayoutId = Array.isArray(layoutId) ? layoutId[0] : layoutId;
  const selectedLayout = getPhotoLayout(selectedLayoutId);
  const selectedPrintJobId = Array.isArray(printJobId) ? printJobId[0] : printJobId;
  const selectedTone = getPrintTone(tone);
  const selectedPrinterWidthValue = Array.isArray(printerWidth)
    ? printerWidth[0]
    : printerWidth;
  const selectedPrinterWidth: UsbPrinterWidth =
    selectedPrinterWidthValue === '512' ? 512 : 576;
  const largePhotosValue = Array.isArray(largePhotos) ? largePhotos[0] : largePhotos;
  const useLargePhotos = largePhotosValue === 'true';
  const printJob = getPhotoPrintJob(selectedPrintJobId);

  const startTestPrint = useCallback(async () => {
    setErrorMessage(null);
    setSelectedPrinter(null);
    setPhase('detecting');

    try {
      if (!printJob || printJob.photoBase64s.length === 0) {
        throw new Error('The photo print job expired. Return to the camera and take new photos.');
      }

      const devices = await getUsbPrinterDevices();
      if (devices.length === 0) {
        throw new Error(
          'No USB device was found. Connect the printer to the Android device with a USB OTG adapter, then retry.',
        );
      }

      const printer = devices.find((device) => device.isLikelyPrinter) ?? devices[0];
      setSelectedPrinter(printer);
      setPhase('sending');

      await printUsbReceipt(printer.deviceId, {
        photoBase64s: printJob.photoBase64s,
        columns: selectedLayout.columns,
        eventName: settings.eventName,
        footer: settings.receiptFooter,
        copies: requestedCopies,
        tone: selectedTone,
        printerWidth: selectedPrinterWidth,
        largePhotos: useLargePhotos,
      });
      setPhase('complete');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setPhase('error');
    }
  }, [
    printJob,
    requestedCopies,
    selectedLayout.columns,
    settings.eventName,
    settings.receiptFooter,
    selectedTone,
    selectedPrinterWidth,
    useLargePhotos,
  ]);

  useEffect(() => {
    if (didStartAutomatically.current) {
      return;
    }

    didStartAutomatically.current = true;
    void startTestPrint();
  }, [startTestPrint]);

  const activeStep = phase === 'detecting' ? 0 : phase === 'sending' ? 1 : PRINTING_STEPS.length;

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
              {isComplete
                ? 'Photo receipt sent!'
                : phase === 'error'
                  ? 'Printer not ready'
                  : 'Testing USB printer...'}
            </Text>
            <Text selectable style={styles.subtitle}>
              {isComplete
                ? `${requestedCopies} ${
                    requestedCopies === 1 ? 'copy is' : 'copies are'
                  } sent to ${selectedPrinter?.productName ?? 'the USB printer'}.`
                : phase === 'error'
                  ? 'Check the printer connection and try again.'
                  : `Preparing ${requestedCopies} photo ${
                      requestedCopies === 1 ? 'receipt' : 'receipts'
                    }.`}
            </Text>
          </View>
        </Animated.View>

        <Animated.View layout={LinearTransition} style={styles.statusCard}>
          {PRINTING_STEPS.map((step, index) => (
            <PrintingStatusRow
              key={step}
              label={step}
              status={
                isComplete || index < activeStep
                  ? 'complete'
                  : index === activeStep && phase !== 'error'
                    ? 'printing'
                    : 'pending'
              }
            />
          ))}
        </Animated.View>

        {selectedPrinter && (
          <View style={styles.deviceCard}>
            <Text selectable style={styles.deviceName}>
              {selectedPrinter.productName ??
                selectedPrinter.manufacturerName ??
                `USB device ${selectedPrinter.deviceId}`}
            </Text>
            <Text selectable style={styles.deviceDetails}>
              USB {selectedPrinter.vendorId}:{selectedPrinter.productId}
            </Text>
          </View>
        )}

        {errorMessage && (
          <View style={styles.errorCard}>
            <IconSymbol name="exclamationmark.triangle.fill" size={24} color={COLORS.error} />
            <Text selectable style={styles.errorText}>
              {errorMessage}
            </Text>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={() => {
            if (phase === 'error') {
              void startTestPrint();
              return;
            }

            router.dismissTo('/');
          }}
          style={({ pressed }) => [
            styles.actionButton,
            isComplete && styles.completeButton,
            isBusy && styles.disabledButton,
            pressed && styles.pressedButton,
          ]}>
          <IconSymbol
            name={
              isComplete
                ? 'checkmark.circle.fill'
                : phase === 'error'
                  ? 'arrow.clockwise'
                  : 'printer.fill'
            }
            size={26}
            color={isComplete ? COLORS.onPrimary : COLORS.onSurfaceVariant}
          />
          <Text style={[styles.actionLabel, isComplete && styles.completeLabel]}>
            {isComplete ? 'Done' : phase === 'error' ? 'Retry' : 'Printing...'}
          </Text>
        </Pressable>

        {phase === 'error' && (
          <Pressable accessibilityRole="button" onPress={() => router.back()}>
            <Text style={styles.backLabel}>Back to preview</Text>
          </Pressable>
        )}
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
  deviceCard: {
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADII.medium,
    borderCurve: 'continuous',
  },
  deviceName: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  deviceDetails: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  errorCard: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.errorContainer,
    borderRadius: RADII.medium,
    borderCurve: 'continuous',
  },
  errorText: {
    ...TYPOGRAPHY.bodyMedium,
    flex: 1,
    color: COLORS.onErrorContainer,
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
  disabledButton: {
    opacity: 0.62,
  },
  actionLabel: {
    ...TYPOGRAPHY.buttonText,
    color: COLORS.onSurfaceVariant,
  },
  completeLabel: {
    color: COLORS.onPrimary,
  },
  backLabel: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.primary,
  },
});
