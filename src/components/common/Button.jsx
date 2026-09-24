import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Colors } from '../../theme/colors';

export const Button = ({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'danger' | 'warning' | 'outline' | 'secondary'
  icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return '#CBD5E1';
    switch (variant) {
      case 'primary':
        return Colors.primary;
      case 'danger':
        return Colors.danger;
      case 'warning':
        return Colors.warning;
      case 'secondary':
        return Colors.cardAlt;
      case 'outline':
        return 'transparent';
      default:
        return Colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return '#64748B';
    if (variant === 'outline') return Colors.primary;
    if (variant === 'secondary') return Colors.textPrimary;
    return Colors.textWhite;
  };

  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={StyleSheet.flatten([
        styles.button,
        { backgroundColor: getBackgroundColor() },
        isOutline && { borderWidth: 2, borderColor: disabled ? '#CBD5E1' : Colors.primary },
        style,
      ])}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
          <Text style={StyleSheet.flatten([styles.text, { color: getTextColor() }, textStyle])}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 10,
  },
  text: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
    flexShrink: 1,
  },
});
