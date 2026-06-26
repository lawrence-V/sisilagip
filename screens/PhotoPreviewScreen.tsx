import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { CapturedPhotoLayout } from '@/components/preview/CapturedPhotoLayout';
import { PreviewActionButton } from '@/components/preview/PreviewActionButton';
import { PreviewFooterAction } from '@/components/preview/PreviewFooterAction';
import { ReceiptBarcode } from '@/components/preview/ReceiptBarcode';
import { ReceiptDetailRow } from '@/components/preview/ReceiptDetailRow';
import { getPhotoLayout } from '@/constants/photoLayouts';
import {
  COLORS,
  FONT_FAMILIES,
  RADII,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '@/constants/theme';
import { useAppSettings } from '@/hooks/useAppSettings';
import { getPhotoPrintJob } from '@/services/photoPrintJobService';
import { generateUsbReceiptPreview } from '@/services/usbPrinterService';
import type { UsbPrinterWidth, UsbPrintTone } from '@/types/UsbPrinter';

const PRINT_TONES: ReadonlyArray<{
  value: UsbPrintTone;
  label: string;
  description: string;
}> = [
  { value: 'auto', label: 'Auto', description: 'Otsu selects darkness automatically' },
  { value: 'face', label: 'Face Clear', description: 'Lifts dark faces without changing the background' },
  { value: 'group', label: 'Group Clear', description: 'Crops and enlarges distant groups' },
  { value: 'atkinson', label: 'Atkinson', description: 'Clean faces with less grain' },
  { value: 'sierra', label: 'Sierra', description: 'Balanced grayscale detail' },
  { value: 'jarvis', label: 'Jarvis', description: 'Maximum tonal detail' },
  { value: 'contrast', label: 'Sharp', description: 'High-contrast solid black and white' },
];

function parsePhotoUris(serializedPhotoUris: string | undefined) {
  if (!serializedPhotoUris) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(serializedPhotoUris);

    if (
      Array.isArray(parsedValue) &&
      parsedValue.every((value): value is string => typeof value === 'string')
    ) {
      return parsedValue;
    }
  } catch {
    return [];
  }

  return [];
}

function formatReceiptDate() {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date())
    .toUpperCase();
}

export default function PhotoPreviewScreen() {
  const { layoutId, photoUri, photoUris, printJobId } = useLocalSearchParams<{
    layoutId?: string | string[];
    photoUri?: string | string[];
    photoUris?: string | string[];
    printJobId?: string | string[];
  }>();
  const [settings] = useAppSettings();
  const [printTone, setPrintTone] = useState<UsbPrintTone>('auto');
  const [printerWidth, setPrinterWidth] = useState<UsbPrinterWidth>(576);
  const [largePhotos, setLargePhotos] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [processedPreviewUri, setProcessedPreviewUri] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const selectedLayoutId = Array.isArray(layoutId) ? layoutId[0] : layoutId;
  const selectedLayout = getPhotoLayout(selectedLayoutId);
  const legacyPhotoUri = Array.isArray(photoUri) ? photoUri[0] : photoUri;
  const serializedPhotoUris = Array.isArray(photoUris) ? photoUris[0] : photoUris;
  const parsedPhotoUris = parsePhotoUris(serializedPhotoUris);
  const selectedPrintJobId = Array.isArray(printJobId) ? printJobId[0] : printJobId;
  const printJob = getPhotoPrintJob(selectedPrintJobId);
  const capturedPhotoUris =
    parsedPhotoUris.length > 0 ? parsedPhotoUris : legacyPhotoUri ? [legacyPhotoUri] : [];

  useEffect(() => {
    if (!showPrintPreview || !printJob || printTone === 'calibration') {
      return;
    }

    let isCurrent = true;
    setIsGeneratingPreview(true);
    setProcessedPreviewUri(null);
    setPreviewError(null);

    void generateUsbReceiptPreview({
      photoBase64s: printJob.photoBase64s,
      columns: selectedLayout.columns,
      eventName: settings.eventName,
      footer: settings.receiptFooter,
      tone: printTone,
      printerWidth,
      largePhotos,
    })
      .then((uri) => {
        if (isCurrent) {
          setProcessedPreviewUri(uri);
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setPreviewError(
            error instanceof Error ? error.message : 'Could not generate the print preview.',
          );
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsGeneratingPreview(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [
    largePhotos,
    printJob,
    printTone,
    printerWidth,
    selectedLayout.columns,
    settings.eventName,
    settings.receiptFooter,
    showPrintPreview,
  ]);

  const openCamera = () => {
    router.replace({
      pathname: '/camera',
      params: { layoutId: selectedLayout.id },
    });
  };

  const sharePhoto = async () => {
    if (capturedPhotoUris.length === 0) {
      return;
    }

    await Share.share({
      message: `My ${settings.eventName} photo`,
      url: capturedPhotoUris[0],
    });
  };

  const showEditNotice = () => {
    Alert.alert('Receipt details', 'Group-name editing will be added with the print settings.');
  };

  const startPrinting = (tone: UsbPrintTone = printTone) => {
    router.push({
      pathname: '/printing',
      params: {
        copies: String(settings.printCopies),
        layoutId: selectedLayout.id,
        photoUris: JSON.stringify(capturedPhotoUris),
        printJobId: selectedPrintJobId,
        tone,
        printerWidth: String(printerWidth),
        largePhotos: String(largePhotos),
      },
    });
  };

  const confirmPhoto = () => {
    if (settings.autoPrint) {
      startPrinting();
      return;
    }

    router.dismissTo('/');
  };

  if (capturedPhotoUris.length === 0) {
    return (
      <View style={styles.missingPhoto}>
        <Text selectable style={styles.missingPhotoTitle}>
          No photo found
        </Text>
        <Text selectable style={styles.missingPhotoMessage}>
          Return to the camera and take a new photo.
        </Text>
        <PreviewActionButton
          icon="camera.fill"
          label="Open Camera"
          onPress={openCamera}
          variant="primary"
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.scrollContent,
        !isTablet && styles.mobileScrollContent,
        {
          paddingTop: insets.top + SPACING.sm,
          paddingBottom: insets.bottom + SPACING.md,
        },
      ]}>
      <AppHeader />

      <View style={[styles.content, !isTablet && styles.mobileContent]}>
        <View style={styles.previewColumn}>
          <View style={styles.previewToggle}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: !showPrintPreview }}
              onPress={() => setShowPrintPreview(false)}
              style={[
                styles.previewToggleOption,
                !showPrintPreview && styles.previewToggleOptionSelected,
              ]}>
              <Text style={styles.previewToggleLabel}>Original</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: showPrintPreview }}
              onPress={() => setShowPrintPreview(true)}
              style={[
                styles.previewToggleOption,
                showPrintPreview && styles.previewToggleOptionSelected,
              ]}>
              <Text style={styles.previewToggleLabel}>Print Preview</Text>
            </Pressable>
          </View>

          {showPrintPreview ? (
            <View style={[styles.receipt, styles.processedReceipt]}>
              {isGeneratingPreview ? (
                <View style={styles.previewLoading}>
                  <ActivityIndicator color={COLORS.primary} size="large" />
                  <Text selectable style={styles.previewStatusText}>
                    Generating exact thermal preview…
                  </Text>
                </View>
              ) : processedPreviewUri ? (
                <Image
                  contentFit="contain"
                  source={{ uri: processedPreviewUri }}
                  style={styles.processedReceiptImage}
                />
              ) : (
                <View style={styles.previewLoading}>
                  <Text selectable style={styles.previewErrorText}>
                    {previewError ?? 'Print preview is unavailable.'}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.receipt}>
          <View style={styles.receiptHeader}>
            <Text
              selectable
              adjustsFontSizeToFit
              numberOfLines={2}
              style={styles.receiptBrand}>
              {settings.eventName.toUpperCase()}
            </Text>
            <View style={styles.shortDivider} />
            <Text selectable style={styles.receiptTagline}>
              MEMORIES IN A SNAP
            </Text>
          </View>

          <View style={styles.photoArea}>
            <View style={styles.photoPrint}>
              <CapturedPhotoLayout
                columns={selectedLayout.columns}
                photoUris={capturedPhotoUris}
              />
            </View>
          </View>

          <View style={styles.dashedDivider} />

          <View style={styles.receiptDetails}>
            <ReceiptDetailRow label="GROUP:" value="FRIENDS & FAMILY" />
            <ReceiptDetailRow label="DATE:" value={formatReceiptDate()} />
            <ReceiptDetailRow label="LAYOUT:" value={selectedLayout.name.toUpperCase()} />
            <ReceiptDetailRow label="PHOTOS:" value={String(capturedPhotoUris.length).padStart(2, '0')} />
          </View>

          <View style={styles.thankYou}>
            <Text selectable style={styles.thankYouTitle}>
              THANK YOU!
            </Text>
            <Text selectable style={styles.thankYouMessage}>
              {settings.receiptFooter.toUpperCase()}
            </Text>
          </View>

          <ReceiptBarcode />
            </View>
          )}
        </View>

        <View style={styles.actionColumn}>
          <View style={styles.intro}>
            <Text selectable style={styles.title}>
              Looking good!
            </Text>
            <Text selectable style={styles.description}>
              Review your black-and-white receipt before printing. You can still retake the photos
              or change the layout.
            </Text>
          </View>

          <View style={styles.actions}>
            <View style={styles.toneSection}>
              <Text selectable style={styles.toneTitle}>
                Photo print tone
              </Text>
              <View style={styles.toneOptions}>
                {PRINT_TONES.map((option) => {
                  const isSelected = option.value === printTone;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      key={option.value}
                      onPress={() => setPrintTone(option.value)}
                      style={({ pressed }) => [
                        styles.toneOption,
                        isSelected && styles.toneOptionSelected,
                        pressed && styles.toneOptionPressed,
                      ]}>
                      <Text
                        style={[
                          styles.toneOptionLabel,
                          isSelected && styles.toneOptionLabelSelected,
                        ]}>
                        {option.label}
                      </Text>
                      <Text style={styles.toneOptionDescription}>{option.description}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text selectable style={styles.toneTitle}>
                Printer width
              </Text>
              <View style={styles.widthOptions}>
                {([576, 512] as const).map((option) => {
                  const isSelected = option === printerWidth;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      key={option}
                      onPress={() => setPrinterWidth(option)}
                      style={[
                        styles.widthOption,
                        isSelected && styles.toneOptionSelected,
                      ]}>
                      <Text style={styles.toneOptionLabel}>{option} px</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: largePhotos }}
                onPress={() => setLargePhotos((current) => !current)}
                style={[
                  styles.largePhotoOption,
                  largePhotos && styles.toneOptionSelected,
                ]}>
                <Text style={styles.toneOptionLabel}>Large photos: {largePhotos ? 'ON' : 'OFF'}</Text>
                <Text style={styles.toneOptionDescription}>
                  Prints one photo per row for clearer faces.
                </Text>
              </Pressable>
            </View>
            <PreviewActionButton
              icon="pencil"
              label="Edit Details"
              onPress={showEditNotice}
              variant="outline"
            />
            <PreviewActionButton
              icon="printer.fill"
              label="Print This!"
              onPress={startPrinting}
              variant="primary"
            />
            <PreviewActionButton
              icon="paintpalette.fill"
              label="Print Calibration"
              onPress={() => startPrinting('calibration')}
              variant="outline"
            />
          </View>

          <View style={styles.infoCard}>
            <Text selectable style={styles.infoIcon}>
              ⓘ
            </Text>
            <Text selectable style={styles.infoText}>
              The receipt preview uses a thermal-style black-and-white finish.
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.footer, !isTablet && styles.mobileFooter]}>
        <View style={styles.footerActions}>
          <PreviewFooterAction
            icon="arrow.clockwise"
            label="Retake"
            onPress={openCamera}
          />
          <PreviewFooterAction
            active
            icon="checkmark.circle.fill"
            label="Confirm"
            onPress={confirmPhoto}
          />
          <PreviewFooterAction
            icon="square.and.arrow.up"
            label="Share"
            onPress={sharePhoto}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    gap: SPACING.xl,
    paddingHorizontal: SPACING.tabletMargin,
    backgroundColor: COLORS.background,
  },
  mobileScrollContent: {
    gap: SPACING.lg,
    paddingHorizontal: SPACING.mobileMargin,
  },
  content: {
    width: '100%',
    maxWidth: 1040,
    flex: 1,
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xxl,
  },
  mobileContent: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  previewColumn: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  previewToggle: {
    width: 390,
    flexDirection: 'row',
    gap: SPACING.xs,
    padding: SPACING.xs,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADII.full,
  },
  previewToggleOption: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADII.full,
  },
  previewToggleOptionSelected: {
    backgroundColor: COLORS.primaryFixed,
  },
  previewToggleLabel: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.onSurface,
  },
  receipt: {
    width: 390,
    minHeight: 720,
    gap: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainerHigh,
    ...SHADOWS.receipt,
  },
  processedReceipt: {
    padding: SPACING.sm,
  },
  processedReceiptImage: {
    width: '100%',
    height: 700,
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  previewLoading: {
    minHeight: 680,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.lg,
  },
  previewStatusText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  previewErrorText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.error,
    textAlign: 'center',
  },
  receiptHeader: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  receiptBrand: {
    ...TYPOGRAPHY.headlineMedium,
    color: COLORS.onSurface,
    fontFamily: FONT_FAMILIES.mono,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  shortDivider: {
    width: 140,
    height: 1,
    backgroundColor: COLORS.surfaceContainerHighest,
  },
  receiptTagline: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.onSurfaceVariant,
    fontFamily: FONT_FAMILIES.mono,
    fontSize: 13,
    letterSpacing: 1,
  },
  photoArea: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainerLow,
  },
  photoPrint: {
    width: '82%',
    height: 300,
    padding: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLowest,
    transform: [{ rotate: '-3deg' }],
    ...SHADOWS.previewPrint,
  },
  dashedDivider: {
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.outlineVariant,
  },
  receiptDetails: {
    gap: SPACING.xs,
  },
  thankYou: {
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  thankYouTitle: {
    ...TYPOGRAPHY.headlineMedium,
    color: COLORS.onSurface,
    fontFamily: FONT_FAMILIES.mono,
    letterSpacing: 3,
  },
  thankYouMessage: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.outline,
    fontFamily: FONT_FAMILIES.mono,
    fontSize: 12,
  },
  actionColumn: {
    width: '100%',
    maxWidth: 410,
    gap: SPACING.xl,
  },
  intro: {
    gap: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.headlineLarge,
    color: COLORS.primary,
  },
  description: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.onSurfaceVariant,
  },
  actions: {
    gap: SPACING.sm,
  },
  toneSection: {
    gap: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADII.large,
    borderCurve: 'continuous',
  },
  toneTitle: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.onSurface,
  },
  toneOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  toneOption: {
    width: '48%',
    minHeight: 78,
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: SPACING.xs,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: COLORS.transparent,
    borderRadius: RADII.medium,
    borderCurve: 'continuous',
  },
  toneOptionSelected: {
    backgroundColor: COLORS.primaryFixed,
    borderColor: COLORS.primary,
  },
  toneOptionPressed: {
    opacity: 0.72,
  },
  toneOptionLabel: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  toneOptionLabelSelected: {
    color: COLORS.onPrimaryContainer,
  },
  toneOptionDescription: {
    color: COLORS.onSurfaceVariant,
    fontFamily: FONT_FAMILIES.regular,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  widthOptions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  widthOption: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: COLORS.transparent,
    borderRadius: RADII.medium,
    borderCurve: 'continuous',
  },
  largePhotoOption: {
    minHeight: 66,
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: COLORS.transparent,
    borderRadius: RADII.medium,
    borderCurve: 'continuous',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.secondaryFixed,
    borderWidth: 1,
    borderColor: COLORS.secondaryFixedDim,
    borderRadius: RADII.medium,
    borderCurve: 'continuous',
  },
  infoIcon: {
    ...TYPOGRAPHY.headlineMedium,
    color: COLORS.secondary,
  },
  infoText: {
    ...TYPOGRAPHY.bodyMedium,
    flex: 1,
    color: COLORS.onSecondaryFixedVariant,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  mobileFooter: {
    paddingBottom: SPACING.md,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.xs,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADII.full,
    ...SHADOWS.card,
  },
  missingPhoto: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  missingPhotoTitle: {
    ...TYPOGRAPHY.headlineLarge,
    color: COLORS.onSurface,
  },
  missingPhotoMessage: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
});
