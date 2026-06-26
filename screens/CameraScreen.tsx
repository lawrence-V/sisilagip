import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { CameraControlButton } from '@/components/camera/CameraControlButton';
import { CameraShutterButton } from '@/components/camera/CameraShutterButton';
import { getPhotoLayout } from '@/constants/photoLayouts';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { useAppSettings } from '@/hooks/useAppSettings';
import { createPhotoPrintJob } from '@/services/photoPrintJobService';

const COUNTDOWN_SECONDS = [3, 2, 1] as const;

type PendingPhoto = {
  base64: string;
  uri: string;
};

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export default function CameraScreen() {
  const { layoutId } = useLocalSearchParams<{ layoutId?: string | string[] }>();
  const [settings] = useAppSettings();
  const cameraRef = useRef<CameraView>(null);
  const hasRequestedPermission = useRef(false);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  // External booth/ring lighting should be the primary light source. Enabling
  // the phone flash at the same time clips facial highlights and removes detail.
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturedPhotoUris, setCapturedPhotoUris] = useState<string[]>([]);
  const [capturedPhotoBase64s, setCapturedPhotoBase64s] = useState<string[]>([]);
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const isTablet = width >= 768;
  const selectedLayoutId = Array.isArray(layoutId) ? layoutId[0] : layoutId;
  const selectedLayout = getPhotoLayout(selectedLayoutId);
  const nextPhotoNumber = capturedPhotoUris.length + 1;

  useEffect(() => {
    if (
      permission &&
      !permission.granted &&
      permission.canAskAgain &&
      !hasRequestedPermission.current
    ) {
      hasRequestedPermission.current = true;
      requestPermission();
    }
  }, [permission, requestPermission]);

  const toggleFacing = () => {
    setCameraReady(false);
    setFacing((currentFacing) => (currentFacing === 'front' ? 'back' : 'front'));
  };

  const toggleFlash = () => {
    setFlashEnabled((currentValue) => !currentValue);
  };

  const savePhoto = (photo: PendingPhoto) => {
    const nextPhotoUris = [...capturedPhotoUris, photo.uri];
    const nextPhotoBase64s = [...capturedPhotoBase64s, photo.base64];

    if (nextPhotoUris.length >= selectedLayout.photoCount) {
      const printJobId = createPhotoPrintJob(nextPhotoBase64s);
      router.push({
        pathname: '/preview',
        params: {
          layoutId: selectedLayout.id,
          photoUris: JSON.stringify(nextPhotoUris),
          printJobId,
        },
      });
      return;
    }

    setCapturedPhotoUris(nextPhotoUris);
    setCapturedPhotoBase64s(nextPhotoBase64s);
  };

  const acceptPendingPhoto = async () => {
    if (!pendingPhoto) {
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    savePhoto(pendingPhoto);
    setPendingPhoto(null);
  };

  const retakePendingPhoto = async () => {
    await Haptics.selectionAsync();
    setPendingPhoto(null);
  };

  const takePhoto = async () => {
    if (!cameraRef.current || !cameraReady || isCapturing || pendingPhoto) {
      return;
    }

    setIsCapturing(true);

    for (const second of COUNTDOWN_SECONDS) {
      setCountdown(second);
      await Haptics.selectionAsync();
      await wait(700);
    }

    setCountdown(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 1,
      });
      if (!photo.base64) {
        throw new Error('The camera did not return printable image data.');
      }

      const capturedPhoto = {
        base64: photo.base64,
        uri: photo.uri,
      };

      if (selectedLayout.photoCount > 1) {
        setPendingPhoto(capturedPhoto);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        savePhoto(capturedPhoto);
      }
    } finally {
      setIsCapturing(false);
    }
  };

  if (!permission) {
    return <View style={styles.loadingScreen} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionScreen, { paddingTop: insets.top + SPACING.lg }]}>
        <Text selectable style={styles.permissionTitle}>
          Camera access is needed
        </Text>
        <Text selectable style={styles.permissionMessage}>
          {settings.eventName} uses the camera only when you are taking booth photos.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={requestPermission}
          style={({ pressed }) => [
            styles.permissionButton,
            pressed && styles.permissionButtonPressed,
          ]}>
          <Text style={styles.permissionButtonLabel}>Allow Camera</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkLabel}>Return to welcome screen</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + SPACING.xs }]}>
        <CameraControlButton
          accessibilityLabel="Go back"
          compact={!isTablet}
          icon="arrow.left"
          label="Back"
          onPress={() => router.back()}
        />

        <Text
          selectable
          adjustsFontSizeToFit
          numberOfLines={1}
          style={[styles.brand, !isTablet && styles.mobileBrand]}>
          {settings.eventName}
        </Text>

        <View style={styles.topBarActions}>
          <CameraControlButton
            accessibilityLabel="Switch front or back camera"
            compact={!isTablet}
            icon="camera.rotate"
            label="Front / Back"
            onPress={toggleFacing}
          />
          <CameraControlButton
            accessibilityLabel={flashEnabled ? 'Turn flash off' : 'Turn flash on'}
            compact={!isTablet}
            icon="bolt.fill"
            label={flashEnabled ? 'Flash ON' : 'Flash OFF'}
            onPress={toggleFlash}
          />
        </View>
      </View>

      <View style={styles.previewArea}>
        <View style={[styles.cameraFrame, isTablet ? styles.tabletCamera : styles.mobileCamera]}>
          {isFocused && (
            <CameraView
              ref={cameraRef}
              animateShutter
              facing={facing}
              flash={flashEnabled ? 'on' : 'off'}
              mirror={facing === 'front'}
              mode="picture"
              onCameraReady={() => setCameraReady(true)}
              style={styles.camera}
            />
          )}

          {countdown !== null && (
            <View style={styles.countdownOverlay}>
              <Text style={styles.countdown}>{countdown}</Text>
            </View>
          )}

          {capturedPhotoUris.length > 0 && countdown === null && (
            <Animated.View
              key={capturedPhotoUris.length}
              entering={FadeInDown.duration(220)}
              exiting={FadeOutUp.duration(180)}
              style={styles.savedBadge}>
              <Text selectable style={styles.savedBadgeText}>
                Photo {capturedPhotoUris.length} saved
              </Text>
            </Animated.View>
          )}
        </View>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.sm }]}>
        <View style={styles.progressSection}>
          <Text selectable style={styles.progressLabel}>
            {selectedLayout.name}
          </Text>
          <View style={styles.dots}>
            {Array.from({ length: selectedLayout.photoCount }, (_, index) => (
              <View
                key={index}
                style={index < capturedPhotoUris.length ? styles.completedDot : styles.dot}
              />
            ))}
          </View>
        </View>

        <CameraShutterButton
          disabled={!cameraReady || isCapturing || pendingPhoto !== null}
          label={`PHOTO ${nextPhotoNumber} OF ${selectedLayout.photoCount}`}
          onPress={takePhoto}
        />

        <Text selectable style={styles.remainingLabel}>
          {selectedLayout.photoCount - capturedPhotoUris.length}{' '}
          {selectedLayout.photoCount - capturedPhotoUris.length === 1 ? 'photo' : 'photos'} left
        </Text>
      </View>

      {pendingPhoto && (
        <View style={styles.reviewOverlay}>
          <View style={[styles.reviewCard, !isTablet && styles.mobileReviewCard]}>
            <View style={styles.reviewHeading}>
              <Text selectable style={styles.reviewTitle}>
                Check photo {nextPhotoNumber}
              </Text>
              <Text selectable style={styles.reviewDescription}>
                Use this photo or retake it before continuing to the next shot.
              </Text>
            </View>

            <Image
              contentFit="contain"
              source={{ uri: pendingPhoto.uri }}
              style={styles.reviewImage}
            />

            <View style={styles.reviewActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => void retakePendingPhoto()}
                style={({ pressed }) => [
                  styles.reviewButton,
                  styles.retakeButton,
                  pressed && styles.reviewButtonPressed,
                ]}>
                <Text style={styles.retakeButtonLabel}>Retake</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void acceptPendingPhoto()}
                style={({ pressed }) => [
                  styles.reviewButton,
                  styles.usePhotoButton,
                  pressed && styles.reviewButtonPressed,
                ]}>
                <Text style={styles.usePhotoButtonLabel}>Use Photo</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.inverseSurface,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  permissionScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  permissionTitle: {
    ...TYPOGRAPHY.headlineLarge,
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  permissionMessage: {
    ...TYPOGRAPHY.bodyLarge,
    maxWidth: 560,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  permissionButton: {
    minHeight: 64,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADII.full,
  },
  permissionButtonPressed: {
    opacity: 0.78,
  },
  permissionButtonLabel: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.onPrimary,
  },
  backLink: {
    padding: SPACING.sm,
  },
  backLinkLabel: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.primary,
  },
  topBar: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.tabletMargin,
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.surfaceContainerHigh,
    zIndex: 2,
  },
  brand: {
    ...TYPOGRAPHY.headlineLarge,
    color: COLORS.primary,
    textAlign: 'center',
  },
  mobileBrand: {
    fontSize: 20,
    lineHeight: 26,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  previewArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.inverseSurface,
  },
  cameraFrame: {
    height: '100%',
    overflow: 'hidden',
    backgroundColor: COLORS.onSurface,
    borderTopLeftRadius: RADII.extraLarge,
    borderTopRightRadius: RADII.extraLarge,
    borderCurve: 'continuous',
  },
  tabletCamera: {
    width: '70%',
    maxWidth: 880,
  },
  mobileCamera: {
    width: '100%',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cameraOverlay,
  },
  countdown: {
    fontFamily: TYPOGRAPHY.displayLarge.fontFamily,
    fontSize: 220,
    lineHeight: 240,
    color: COLORS.onPrimary,
    fontVariant: ['tabular-nums'],
    textShadowColor: COLORS.countdownShadow,
    textShadowOffset: { width: 0, height: 6 },
    textShadowRadius: 16,
  },
  savedBadge: {
    position: 'absolute',
    top: SPACING.md,
    alignSelf: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: RADII.full,
  },
  savedBadgeText: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.onPrimary,
  },
  bottomBar: {
    minHeight: 220,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  progressSection: {
    minWidth: 96,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  progressLabel: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.primary,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  dot: {
    width: 8,
    height: 8,
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: RADII.full,
  },
  completedDot: {
    width: 12,
    height: 12,
    backgroundColor: COLORS.primary,
    borderRadius: RADII.full,
  },
  remainingLabel: {
    ...TYPOGRAPHY.labelLarge,
    minWidth: 120,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  reviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.cameraOverlay,
    zIndex: 10,
  },
  reviewCard: {
    width: '76%',
    maxWidth: 900,
    height: '88%',
    gap: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADII.extraLarge,
    borderCurve: 'continuous',
  },
  mobileReviewCard: {
    width: '100%',
    height: '92%',
    padding: SPACING.md,
  },
  reviewHeading: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  reviewTitle: {
    ...TYPOGRAPHY.headlineMedium,
    color: COLORS.onSurface,
    textAlign: 'center',
  },
  reviewDescription: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
  },
  reviewImage: {
    flex: 1,
    width: '100%',
    backgroundColor: COLORS.inverseSurface,
    borderRadius: RADII.large,
    borderCurve: 'continuous',
  },
  reviewActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  reviewButton: {
    minHeight: 60,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.full,
  },
  retakeButton: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderWidth: 2,
    borderColor: COLORS.outlineVariant,
  },
  usePhotoButton: {
    backgroundColor: COLORS.primary,
  },
  reviewButtonPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  retakeButtonLabel: {
    ...TYPOGRAPHY.buttonText,
    color: COLORS.onSurface,
  },
  usePhotoButtonLabel: {
    ...TYPOGRAPHY.buttonText,
    color: COLORS.onPrimary,
  },
});
