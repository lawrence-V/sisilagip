import { StyleSheet, Text, View } from 'react-native';

import { COLORS, FONT_FAMILIES, TYPOGRAPHY } from '@/constants/theme';

type ReceiptDetailRowProps = {
  label: string;
  value: string;
};

export function ReceiptDetailRow({ label, value }: ReceiptDetailRowProps) {
  return (
    <View style={styles.row}>
      <Text selectable style={styles.label}>
        {label}
      </Text>
      <Text selectable style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  label: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.onSurface,
    fontFamily: FONT_FAMILIES.bold,
  },
  value: {
    ...TYPOGRAPHY.bodyMedium,
    flex: 1,
    color: COLORS.onSurfaceVariant,
    fontFamily: FONT_FAMILIES.mono,
    textAlign: 'right',
  },
});
