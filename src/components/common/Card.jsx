import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';

export const Card = ({ children, style, accentColor }) => {
  return (
    <View
      style={[
        styles.card,
        accentColor && { borderWidth: 1.5, borderColor: accentColor },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 18,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
});
