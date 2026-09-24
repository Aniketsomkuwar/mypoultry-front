import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';

export const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  suffix,
  prefix,
  error,
  helperText,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  style,
  inputStyle,
}) => {
  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.inputWrapper,
          !editable && styles.disabledWrapper,
          error ? styles.errorBorder : styles.normalBorder,
          multiline && { minHeight: 90, alignItems: 'flex-start', paddingTop: 12 },
        ]}
      >
        {prefix ? <Text style={styles.affix}>{prefix}</Text> : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType={keyboardType}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          style={[styles.input, inputStyle]}
        />

        {suffix ? <Text style={styles.affix}>{suffix}</Text> : null}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 2,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  normalBorder: {
    borderColor: Colors.border,
  },
  errorBorder: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerLight,
  },
  disabledWrapper: {
    backgroundColor: Colors.cardAlt,
    borderColor: Colors.borderDark,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    paddingVertical: 10,
  },
  affix: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.danger,
    marginTop: 6,
  },
  helperText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
