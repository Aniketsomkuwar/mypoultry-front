import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';

export const StatCard = ({
  label,
  value,
  unit,
  variant = 'default', // 'default' | 'danger' | 'warning' | 'success' | 'info'
  subtext,
  icon,
  style,
}) => {
  const getTheme = () => {
    switch (variant) {
      case 'danger':
        return {
          textColor: Colors.danger,
          bg: Colors.dangerLight,
          borderColor: '#FECACA',
        };
      case 'warning':
        return {
          textColor: Colors.warning,
          bg: Colors.warningLight,
          borderColor: '#FED7AA',
        };
      case 'success':
        return {
          textColor: Colors.success,
          bg: Colors.successLight,
          borderColor: '#BBF7D0',
        };
      case 'info':
        return {
          textColor: Colors.info,
          bg: Colors.infoLight,
          borderColor: '#BFDBFE',
        };
      default:
        return {
          textColor: Colors.textPrimary,
          bg: Colors.card,
          borderColor: Colors.border,
        };
    }
  };

  const theme = getTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.bg, borderColor: theme.borderColor }, style]}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        {icon ? <View>{icon}</View> : null}
      </View>

      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: theme.textColor }]}>
          {value !== null && value !== undefined ? value : '--'}
        </Text>
        {unit ? <Text style={[styles.unit, { color: theme.textColor }]}>{unit}</Text> : null}
      </View>

      {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 6,
  },
  subtext: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textMuted,
    marginTop: 4,
  },
});
