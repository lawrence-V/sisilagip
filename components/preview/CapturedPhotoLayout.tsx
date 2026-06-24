import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { COLORS, SPACING } from '@/constants/theme';

type CapturedPhotoLayoutProps = {
  columns: number;
  photoUris: string[];
};

export function CapturedPhotoLayout({ columns, photoUris }: CapturedPhotoLayoutProps) {
  return (
    <View style={[styles.grid, columns === 1 && styles.singleColumnGrid]}>
      {photoUris.map((photoUri, index) => (
        <Image
          key={`${photoUri}-${index}`}
          source={{ uri: photoUri }}
          contentFit="cover"
          style={[
            styles.photo,
            columns === 1 && styles.oneColumn,
            columns === 2 && styles.twoColumns,
            columns === 3 && styles.threeColumns,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'stretch',
    gap: SPACING.xs,
  },
  singleColumnGrid: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
  },
  photo: {
    minHeight: 0,
    flexGrow: 1,
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  oneColumn: {
    flex: 1,
    width: '100%',
  },
  twoColumns: {
    width: '47%',
    height: '47%',
  },
  threeColumns: {
    width: '30%',
    height: '47%',
  },
});
