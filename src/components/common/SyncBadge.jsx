import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '../../theme/colors';
import { OfflineSync } from '../../services/offlineSync';

export const SyncBadge = ({ status = 'SYNCED' }) => {
  const handlePress = () => {
    OfflineSync.triggerSync();
  };

  const getBadgeConfig = () => {
    switch (status) {
      case 'SYNCING':
        return {
          label: 'Syncing...',
          bg: '#FEF3C7',
          text: '#92400E',
          dot: '#D97706',
          loading: true,
        };
      case 'SAVED':
        return {
          label: 'Saved (Offline)',
          bg: '#DBEAFE',
          text: '#1E40AF',
          dot: '#2563EB',
          loading: false,
        };
      case 'SYNCED':
      default:
        return {
          label: 'Synced',
          bg: Colors.primaryLight,
          text: Colors.primary,
          dot: '#16A34A',
          loading: false,
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={[styles.badge, { backgroundColor: config.bg }]}
    >
      {config.loading ? (
        <ActivityIndicator size="small" color={config.text} style={styles.indicator} />
      ) : (
        <View style={[styles.dot, { backgroundColor: config.dot }]} />
      )}
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  indicator: {
    marginRight: 6,
    transform: [{ scale: 0.7 }],
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
