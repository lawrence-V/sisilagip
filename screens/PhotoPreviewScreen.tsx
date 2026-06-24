import { router, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { CapturedPhotoLayout } from '@/components/preview/CapturedPhotoLayout';
import { PreviewActionButton } from '@/components/preview/PreviewActionButton';
import { PreviewFooterAction } from '@/components/preview/PreviewFooterAction';
import { ReceiptBarcode } from '@/components/preview/ReceiptBarcode';
import { ReceiptDetailRow } from '@/components/preview/ReceiptDetailRow';
import { APP_BRAND_NAME, APP_NAME } from '@/constants/app';
import { getPhotoLayout } from '@/constants/photoLayouts';
import {
  COLORS,
  FONT_FAMILIES,
  RADII,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '@/constants/theme';

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
  const { layoutId, photoUri, photoUris } = useLocalSearchParams<{
    layoutId?: string | string[];
    photoUri?: string | string[];
    photoUris?: string | string[];
  }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const selectedLayoutId = Array.isArray(layoutId) ? layoutId[0] : layoutId;
  const selectedLayout = getPhotoLayout(selectedLayoutId);
  const legacyPhotoUri = Array.isArray(photoUri) ? photoUri[0] : photoUri;
  const serializedPhotoUris = Array.isArray(photoUris) ? photoUris[0] : photoUris;
  const parsedPhotoUris = parsePhotoUris(serializedPhotoUris);
  const capturedPhotoUris =
    parsedPhotoUris.length > 0 ? parsedPhotoUris : legacyPhotoUri ? [legacyPhotoUri] : [];

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
      message: `My ${APP_BRAND_NAME} photo`,
      url: capturedPhotoUris[0],
    });
  };

  const showEditNotice = () => {
    Alert.alert('Receipt details', 'Group-name editing will be added with the print settings.');
  };

  const showPrinterNotice = () => {
    Alert.alert('Printer not connected', 'Connect a thermal printer before printing this receipt.');
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
        <View style={styles.receipt}>
          <View style={styles.receiptHeader}>
            <Text selectable style={styles.receiptBrand}>
              {APP_NAME.toUpperCase()}
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
              KEEP THIS MEMORY FOREVER
            </Text>
          </View>

          <ReceiptBarcode />
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
            <PreviewActionButton
              icon="pencil"
              label="Edit Details"
              onPress={showEditNotice}
              variant="outline"
            />
            <PreviewActionButton
              icon="printer.fill"
              label="Print This!"
              onPress={showPrinterNotice}
              variant="primary"
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
            onPress={() => router.dismissTo('/')}
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
