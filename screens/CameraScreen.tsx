import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraControlButton } from '@/components/camera/CameraControlButton';
import { CameraShutterButton } from '@/components/camera/CameraShutterButton';
import { APP_BRAND_NAME } from '@/constants/app';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/constants/theme';

const COUNTDOWN_SECONDS = [3, 2, 1] as const;

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export default function CameraScreen() {
  const cameraRef = useRef<CameraView>(null);
  const hasRequestedPermission = useRef(false);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [flashEnabled, setFlashEnabled] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const isTablet = width >= 768;

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

  const takePhoto = async () => {
    if (!cameraRef.current || !cameraReady || isCapturing) {
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
        quality: 0.9,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: '/preview',
        params: { photoUri: photo.uri },
      });
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
          {APP_BRAND_NAME} uses the camera only when you are taking booth photos.
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

        <Text selectable style={[styles.brand, !isTablet && styles.mobileBrand]}>
          {APP_BRAND_NAME}
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
        </View>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + SPACING.sm }]}>
        <View style={styles.dots}>
          <View style={styles.activeDot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <CameraShutterButton
          disabled={!cameraReady || isCapturing}
          label="TAKE PHOTO"
          onPress={takePhoto}
        />

        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.activeDot} />
        </View>
      </View>
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
  bottomBar: {
    minHeight: 220,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  dots: {
    minWidth: 96,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  dot: {
    width: 8,
    height: 8,
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: RADII.full,
  },
  activeDot: {
    width: 8,
    height: 8,
    backgroundColor: COLORS.primaryContainer,
    borderRadius: RADII.full,
  },
});
