import { router, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { CapturedPhotoLayout } from '@/components/preview/CapturedPhotoLayout';
import { PreviewActionButton } from '@/components/preview/PreviewActionButton';
import { PreviewFooterAction } from '@/components/preview/PreviewFooterAction';
import { APP_BRAND_NAME, APP_NAME } from '@/constants/app';
import { getPhotoLayout } from '@/constants/photoLayouts';
import { COLORS, RADII, SHADOWS, SPACING, TYPOGRAPHY } from '@/constants/theme';

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

  const sharePhoto = async () => {
    if (capturedPhotoUris.length === 0) {
      return;
    }

    await Share.share({
      message: `My ${APP_BRAND_NAME} photo`,
      url: capturedPhotoUris[0],
    });
  };

  const showTemplateNotice = () => {
    Alert.alert('Templates', 'Template selection will be added in the next screen.');
  };

  const showPrinterNotice = () => {
    Alert.alert('Printer not connected', 'Connect a printer before printing this photo.');
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
          onPress={() =>
            router.replace({
              pathname: '/camera',
              params: { layoutId: selectedLayout.id },
            })
          }
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
          <View style={[styles.printCard, !isTablet && styles.mobilePrintCard]}>
            <CapturedPhotoLayout
              columns={selectedLayout.columns}
              photoUris={capturedPhotoUris}
            />
            <View style={styles.printLabel}>
              <Text selectable style={styles.printLabelText}>
                {APP_NAME.toUpperCase()} MOMENTS
              </Text>
            </View>
          </View>
          <Text selectable style={styles.caption}>
            &quot;This is how your print will look&quot;
          </Text>
        </View>

        <View style={styles.actionColumn}>
          <View style={styles.actions}>
            <PreviewActionButton
              icon="camera.fill"
              label="Retake"
              onPress={() =>
                router.replace({
                  pathname: '/camera',
                  params: { layoutId: selectedLayout.id },
                })
              }
              variant="outline"
            />
            <PreviewActionButton
              icon="paintpalette.fill"
              label="Choose Template"
              onPress={showTemplateNotice}
              variant="secondary"
            />
            <PreviewActionButton
              icon="printer.fill"
              label="Print Now"
              onPress={showPrinterNotice}
              variant="primary"
            />
          </View>

          <View style={styles.queueCard}>
            <Text selectable style={styles.queueTitle}>
              Queue Status
            </Text>
            <View style={styles.queueStatus}>
              <View style={styles.statusDot} />
              <Text selectable style={styles.queueMessage}>
                Waiting for a printer connection...
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.footer, !isTablet && styles.mobileFooter]}>
        <View style={styles.footerActions}>
          <PreviewFooterAction
            icon="arrow.clockwise"
            label="Retake"
            onPress={() =>
              router.replace({
                pathname: '/camera',
                params: { layoutId: selectedLayout.id },
              })
            }
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

        <Text selectable style={[styles.photoDetails, !isTablet && styles.mobilePhotoDetails]}>
          Photo #0001 · {APP_BRAND_NAME}
        </Text>
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
    flex: 1,
    alignItems: 'center',
    gap: SPACING.md,
  },
  printCard: {
    width: 460,
    height: 620,
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLowest,
    transform: [{ rotate: '-1deg' }],
    ...SHADOWS.previewPrint,
  },
  mobilePrintCard: {
    width: 320,
    height: 430,
  },
  printLabel: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  printLabelText: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.outline,
    fontStyle: 'italic',
    letterSpacing: 1.5,
  },
  caption: {
    ...TYPOGRAPHY.headlineMedium,
    color: COLORS.onSurfaceVariant,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  actionColumn: {
    width: '100%',
    maxWidth: 400,
    gap: SPACING.xxl,
  },
  actions: {
    gap: SPACING.sm,
  },
  queueCard: {
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainerHigh,
    borderRadius: RADII.large,
    borderCurve: 'continuous',
    ...SHADOWS.card,
  },
  queueTitle: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.primary,
  },
  queueStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusDot: {
    width: 12,
    height: 12,
    backgroundColor: COLORS.secondary,
    borderRadius: RADII.full,
  },
  queueMessage: {
    ...TYPOGRAPHY.bodyMedium,
    flex: 1,
    color: COLORS.onSurfaceVariant,
  },
  footer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: SPACING.lg,
  },
  mobileFooter: {
    alignItems: 'center',
    flexDirection: 'column',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    padding: SPACING.xs,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADII.full,
    ...SHADOWS.card,
  },
  photoDetails: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.outline,
  },
  mobilePhotoDetails: {
    textAlign: 'center',
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
