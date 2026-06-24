import { Link } from 'expo-router';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { APP_BRAND_NAME } from '@/constants/app';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';

export function AppHeader() {
  const { width } = useWindowDimensions();
  const isCompact = width < 600;

  return (
    <View style={styles.header}>
      <Text selectable style={[styles.brand, isCompact && styles.compactBrand]}>
        {APP_BRAND_NAME}
      </Text>

      <View style={styles.actions}>
        <Link href="/settings" asChild>
          <PrimaryButton
            label=""
            accessibilityLabel="Settings"
            style={[styles.iconButton, isCompact && styles.compactIconButton]}>
            <IconSymbol name="gearshape" size={29} color={COLORS.primary} />
          </PrimaryButton>
        </Link>

        <Link href="/help" asChild>
          <PrimaryButton
            label=""
            accessibilityLabel="Help"
            style={[styles.iconButton, isCompact && styles.compactIconButton]}>
            <IconSymbol name="questionmark.circle" size={28} color={COLORS.primary} />
          </PrimaryButton>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  brand: {
    ...TYPOGRAPHY.headlineLarge,
    color: COLORS.primary,
  },
  compactBrand: {
    fontSize: 20,
    lineHeight: 26,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconButton: {
    width: 56,
    minHeight: 56,
    paddingHorizontal: 0,
    backgroundColor: COLORS.transparent,
    boxShadow: 'none',
  },
  compactIconButton: {
    width: 48,
    minHeight: 48,
  },
});
