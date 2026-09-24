import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SyncBadge } from '../../components/common/SyncBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { OfflineSync } from '../../services/offlineSync';

export const WorkerProfileScreen = () => {
  const { user, farm, activeBatch, syncStatus, logout } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const res = await OfflineSync.triggerSync();
      if (res && res.syncedCount !== undefined) {
        Alert.alert('Sync Result', `Data synchronization complete. Synced items: ${res.syncedCount}`);
      } else {
        Alert.alert('Sync Result', 'Server synchronized.');
      }
    } catch (e) {
      Alert.alert('Sync Notice', 'Network connection unavailable. Data will sync when back online.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>WORKER PROFILE</Text>
      </View>

      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>W</Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Farm Worker'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>WORKER ROLE</Text>
        </View>



        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Assigned Farm:</Text>
          <Text style={styles.infoValue}>{farm?.name || '--'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Current Batch:</Text>
          <Text style={styles.infoValue}>{activeBatch?.name || 'None'}</Text>
        </View>
      </Card>

      {/* Sync Status Card */}
      <Card style={styles.syncCard}>
        <View style={styles.syncHeader}>
          <Text style={styles.syncTitle}>OFFLINE SYNC STATUS</Text>
          <SyncBadge status={syncStatus} />
        </View>
        <Text style={styles.syncDesc}>
          When working in low-connectivity poultry sheds, daily data is safely saved on your phone and sent automatically when internet connects.
        </Text>
        <Button
          title="SYNC DATA NOW"
          variant="secondary"
          loading={syncing}
          onPress={handleManualSync}
          style={styles.syncBtn}
        />
      </Card>

      {/* Logout Button */}
      <Button
        title="LOG OUT"
        variant="danger"
        onPress={() => setShowLogoutConfirm(true)}
        style={styles.logoutBtn}
      />

      <ConfirmModal
        visible={showLogoutConfirm}
        title="Log Out"
        message="Are you sure you want to log out of your Worker account?"
        confirmText="YES, LOG OUT"
        cancelText="CANCEL"
        variant="danger"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    marginVertical: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E40AF',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  roleBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  syncCard: {
    padding: 18,
    marginVertical: 12,
  },
  syncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  syncTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  syncDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  syncBtn: {
    minHeight: 48,
  },
  logoutBtn: {
    marginTop: 20,
    minHeight: 56,
  },
});
