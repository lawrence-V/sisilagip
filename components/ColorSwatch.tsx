import { StyleSheet, Text, View } from 'react-native';

import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/constants/theme';

type ColorSwatchProps = {
  name: string;
  color: string;
  textColor: string;
};

export function ColorSwatch({ name, color, textColor }: ColorSwatchProps) {
  return (
    <View style={[styles.swatch, { backgroundColor: color }]}>
      <Text style={[styles.name, { color: textColor }]}>{name}</Text>
      <Text style={[styles.value, { color: textColor }]}>{color}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  swatch: {
    minWidth: 200,
    minHeight: 140,
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADII.large,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
  },
  name: {
    ...TYPOGRAPHY.headlineMedium,
  },
  value: {
    ...TYPOGRAPHY.labelLarge,
  },
});
