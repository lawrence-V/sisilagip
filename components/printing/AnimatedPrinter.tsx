import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS, RADII, SHADOWS, SPACING } from '@/constants/theme';

type AnimatedPrinterProps = {
  complete: boolean;
};

export function AnimatedPrinter({ complete }: AnimatedPrinterProps) {
  const receiptPosition = useSharedValue(-54);
  const printerScale = useSharedValue(1);

  useEffect(() => {
    if (complete) {
      cancelAnimation(receiptPosition);
      cancelAnimation(printerScale);
      receiptPosition.value = withTiming(58, { duration: 260 });
      printerScale.value = withTiming(1, { duration: 180 });
      return;
    }

    receiptPosition.value = withRepeat(
      withSequence(
        withTiming(58, { duration: 1100 }),
        withTiming(-54, { duration: 0 }),
      ),
      -1,
    );
    printerScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 380 }),
        withTiming(1, { duration: 380 }),
      ),
      -1,
      true,
    );

    return () => {
      cancelAnimation(receiptPosition);
      cancelAnimation(printerScale);
    };
  }, [complete, printerScale, receiptPosition]);

  const receiptStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: receiptPosition.value }],
  }));

  const printerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: printerScale.value }],
  }));

  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.receipt, receiptStyle]}>
        <View style={styles.receiptLine} />
        <View style={styles.receiptLineShort} />
        <View style={styles.receiptPhoto}>
          <IconSymbol name="camera.fill" size={28} color={COLORS.outline} />
        </View>
        <View style={styles.receiptLine} />
        <View style={styles.receiptLineShort} />
      </Animated.View>

      <Animated.View style={[styles.printer, printerStyle]}>
        <IconSymbol name="printer.fill" size={150} color={COLORS.onSurfaceVariant} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: 320,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  printer: {
    zIndex: 2,
    padding: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADII.extraLarge,
    ...SHADOWS.card,
  },
  receipt: {
    position: 'absolute',
    bottom: 24,
    width: 118,
    height: 154,
    gap: SPACING.xs,
    padding: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainerHigh,
    ...SHADOWS.receipt,
  },
  receiptLine: {
    height: 4,
    backgroundColor: COLORS.surfaceContainerHighest,
  },
  receiptLineShort: {
    width: '60%',
    height: 4,
    backgroundColor: COLORS.surfaceContainerHighest,
  },
  receiptPhoto: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
  },
});
