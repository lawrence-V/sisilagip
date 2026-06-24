import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { COLORS, RADII, SPACING, TYPOGRAPHY } from '@/constants/theme';

type SettingsTextFieldProps = TextInputProps & {
  error?: string;
  helperText: string;
  label: string;
};

export function SettingsTextField({
  error,
  helperText,
  label,
  style,
  ...props
}: SettingsTextFieldProps) {
  return (
    <View style={styles.field}>
      <Text selectable style={styles.label}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={COLORS.outline}
        style={[styles.input, props.multiline && styles.multilineInput, error && styles.errorInput, style]}
        {...props}
      />
      <Text selectable style={[styles.helperText, error && styles.errorText]}>
        {error ?? helperText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: SPACING.xs,
  },
  label: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.onSurface,
  },
  input: {
    minHeight: 64,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    borderRadius: RADII.default,
    color: COLORS.onSurface,
    fontFamily: TYPOGRAPHY.bodyLarge.fontFamily,
    fontSize: TYPOGRAPHY.bodyLarge.fontSize,
  },
  multilineInput: {
    minHeight: 112,
    paddingTop: SPACING.sm,
    textAlignVertical: 'top',
  },
  errorInput: {
    borderColor: COLORS.error,
  },
  helperText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.outline,
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: COLORS.error,
  },
});
