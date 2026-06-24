import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { PrimaryButton } from '@/components/PrimaryButton';
import { PrintCopiesControl } from '@/components/settings/PrintCopiesControl';
import { SettingsTextField } from '@/components/settings/SettingsTextField';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { APP_NAME } from '@/constants/app';
import { COLORS, FONT_FAMILIES, RADII, SHADOWS, SIZES, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { useAppSettings } from '@/hooks/useAppSettings';
import { appSettingsSchema, type AppSettings } from '@/types/AppSettings';

export default function SettingsScreen() {
  const { width } = useWindowDimensions();
  const [settings, setSettings] = useAppSettings();
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const isTablet = width >= 768;
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    reset,
    watch,
  } = useForm<AppSettings>({
    defaultValues: settings,
    resolver: zodResolver(appSettingsSchema),
  });
  const previewSettings = watch();

  useEffect(() => {
    reset(settings);
  }, [reset, settings]);

  const saveSettings = (nextSettings: AppSettings) => {
    setSettings(nextSettings);
    reset(nextSettings);
    setShowSavedMessage(true);

    setTimeout(() => {
      setShowSavedMessage(false);
    }, 1800);
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.scrollContent,
        !isTablet && styles.mobileScrollContent,
      ]}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}>
          <IconSymbol name="arrow.left" size={28} color={COLORS.primary} />
        </Pressable>
        <Text selectable style={styles.title}>
          Settings
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.formGrid, !isTablet && styles.mobileFormGrid]}>
        <View style={styles.card}>
          <Controller
            control={control}
            name="eventName"
            render={({ field: { onBlur, onChange, value } }) => (
              <SettingsTextField
                autoCapitalize="words"
                error={errors.eventName?.message}
                helperText="Appears on the welcome, camera, receipt, and printing screens."
                label="Event or Business Name"
                maxLength={40}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder={`${APP_NAME} Booth`}
                value={value}
              />
            )}
          />
        </View>

        <View style={styles.card}>
          <Controller
            control={control}
            name="receiptFooter"
            render={({ field: { onBlur, onChange, value } }) => (
              <SettingsTextField
                error={errors.receiptFooter?.message}
                helperText="Printed near the bottom of every receipt."
                label="Receipt Footer Message"
                maxLength={80}
                multiline
                numberOfLines={4}
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Keep this memory forever"
                value={value}
              />
            )}
          />
        </View>

        <View style={styles.card}>
          <Controller
            control={control}
            name="autoPrint"
            render={({ field: { onChange, value } }) => (
              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <Text selectable style={styles.cardTitle}>
                    Auto Print
                  </Text>
                  <Text selectable style={styles.cardDescription}>
                    Start the print animation immediately after confirmation.
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Auto print"
                  onValueChange={onChange}
                  trackColor={{
                    false: COLORS.surfaceContainerHighest,
                    true: COLORS.primaryContainer,
                  }}
                  thumbColor={value ? COLORS.primary : COLORS.surfaceContainerLowest}
                  value={value}
                />
              </View>
            )}
          />

          <View style={styles.cardDivider} />

          <Controller
            control={control}
            name="printCopies"
            render={({ field: { onChange, value } }) => (
              <PrintCopiesControl onChange={onChange} value={value} />
            )}
          />
        </View>

        <View style={styles.previewCard}>
          <View style={styles.receiptPreview}>
            <Text numberOfLines={2} style={styles.previewName}>
              {previewSettings.eventName || `${APP_NAME} Booth`}
            </Text>
            <View style={styles.previewPhotoGrid}>
              <View style={styles.previewPhoto} />
              <View style={styles.previewPhoto} />
              <View style={styles.previewPhoto} />
              <View style={styles.previewPhoto} />
            </View>
            <Text numberOfLines={2} style={styles.previewFooter}>
              {previewSettings.receiptFooter || 'Keep this memory forever'}
            </Text>
          </View>
          <View style={styles.previewText}>
            <Text selectable style={styles.previewTitle}>
              Live Receipt Preview
            </Text>
            <Text selectable style={styles.cardDescription}>
              Changes appear here immediately and throughout the app after saving.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.saveArea}>
        <PrimaryButton
          disabled={!isDirty}
          label="SAVE SETTINGS"
          onPress={handleSubmit(saveSettings)}
          style={styles.saveButton}
        />
        {showSavedMessage && (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)}>
            <Text selectable style={styles.savedMessage}>
              Settings saved on this device.
            </Text>
          </Animated.View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    gap: SPACING.lg,
    padding: SPACING.tabletMargin,
    backgroundColor: COLORS.background,
  },
  mobileScrollContent: {
    padding: SPACING.mobileMargin,
  },
  header: {
    width: '100%',
    maxWidth: SIZES.contentMaxWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 56,
  },
  title: {
    ...TYPOGRAPHY.headlineLarge,
    color: COLORS.primary,
  },
  formGrid: {
    width: '100%',
    maxWidth: SIZES.contentMaxWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  mobileFormGrid: {
    flexDirection: 'column',
  },
  card: {
    width: '47%',
    minWidth: 320,
    flexGrow: 1,
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADII.large,
    borderCurve: 'continuous',
    ...SHADOWS.card,
  },
  cardTitle: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.onSurface,
  },
  cardDescription: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.onSurfaceVariant,
    fontSize: 15,
    lineHeight: 21,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  switchText: {
    flex: 1,
    gap: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  previewCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: RADII.large,
    borderCurve: 'continuous',
    ...SHADOWS.card,
  },
  receiptPreview: {
    width: 132,
    minHeight: 176,
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderStyle: 'dashed',
  },
  previewName: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.onSurface,
    fontFamily: FONT_FAMILIES.mono,
    fontSize: 13,
    textAlign: 'center',
  },
  previewPhotoGrid: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  previewPhoto: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: COLORS.surfaceContainerHighest,
  },
  previewFooter: {
    color: COLORS.onSurfaceVariant,
    fontFamily: FONT_FAMILIES.mono,
    fontSize: 10,
    textAlign: 'center',
  },
  previewText: {
    flex: 1,
    gap: SPACING.xs,
  },
  previewTitle: {
    ...TYPOGRAPHY.headlineMedium,
    color: COLORS.primary,
  },
  saveArea: {
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  saveButton: {
    width: '100%',
  },
  savedMessage: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.secondary,
  },
});
