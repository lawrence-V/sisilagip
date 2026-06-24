import { StyleSheet, View } from 'react-native';

import { COLORS } from '@/constants/theme';

const BAR_WIDTHS = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1];

export function ReceiptBarcode() {
  return (
    <View accessibilityLabel="Receipt barcode decoration" style={styles.barcode}>
      {BAR_WIDTHS.map((width, index) => (
        <View key={`${width}-${index}`} style={[styles.bar, { width }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  barcode: {
    height: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: COLORS.onSurface,
  },
});
