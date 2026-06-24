import { StyleSheet, View } from 'react-native';

import { COLORS, RADII, SPACING } from '@/constants/theme';

type LayoutPreviewGridProps = {
  columns: number;
  photoCount: number;
  selected?: boolean;
};

export function LayoutPreviewGrid({
  columns,
  photoCount,
  selected = false,
}: LayoutPreviewGridProps) {
  return (
    <View style={[styles.grid, columns === 1 ? styles.singleColumn : styles.multiColumn]}>
      {Array.from({ length: photoCount }, (_, index) => (
        <View
          key={index}
          style={[
            styles.slot,
            columns === 1 ? styles.singleColumnSlot : styles.multiColumnSlot,
            selected && styles.selectedSlot,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: 200,
    height: 190,
    alignContent: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  singleColumn: {
    alignItems: 'center',
  },
  multiColumn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  slot: {
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: RADII.small,
  },
  singleColumnSlot: {
    width: 96,
    flex: 1,
    maxHeight: 84,
  },
  multiColumnSlot: {
    width: '29%',
    height: 72,
    flexGrow: 1,
    maxWidth: 88,
  },
  selectedSlot: {
    backgroundColor: COLORS.surfaceContainerLowest,
  },
});
