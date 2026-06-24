import { StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/constants/theme';

type PrintingStatus = 'complete' | 'pending' | 'printing';

type PrintingStatusRowProps = {
  label: string;
  status: PrintingStatus;
};

export function PrintingStatusRow({ label, status }: PrintingStatusRowProps) {
  const isComplete = status === 'complete';
  const isPrinting = status === 'printing';

  return (
    <View
      style={[
        styles.row,
        isComplete && styles.completeRow,
        isPrinting && styles.printingRow,
      ]}>
      {isComplete ? (
        <IconSymbol name="checkmark.circle.fill" size={23} color={COLORS.primary} />
      ) : isPrinting ? (
        <IconSymbol name="printer.fill" size={23} color={COLORS.primary} />
      ) : (
        <View style={styles.pendingIcon} />
      )}
      <Text
        selectable
        style={[
          styles.label,
          status === 'pending' && styles.pendingLabel,
          isPrinting && styles.printingLabel,
        ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainerHigh,
    borderRadius: RADII.medium,
    borderCurve: 'continuous',
  },
  completeRow: {
    borderColor: COLORS.primaryFixedDim,
  },
  printingRow: {
    backgroundColor: COLORS.primaryFixed,
    borderColor: COLORS.primaryContainer,
  },
  pendingIcon: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: RADII.full,
  },
  label: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.onSurface,
  },
  printingLabel: {
    color: COLORS.primary,
  },
  pendingLabel: {
    color: COLORS.outline,
  },
});
