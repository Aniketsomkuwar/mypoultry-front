import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { SyncBadge } from '../../components/common/SyncBadge';
import { useAuth } from '../../context/AuthContext';
import { Api } from '../../services/api';

export const WorkerHomeScreen = ({ onNavigate }) => {
  const { farm, activeBatch, syncStatus, refreshBatchData } = useAuth();
  const [stats, setStats] = useState(null);
  const [todayRecord, setTodayRecord] = useState(null);
  const [latestWeight, setLatestWeight] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [batchRes, wtRes] = await Promise.all([
        Api.getActiveBatch(),
        Api.getLatestWeight().catch(() => ({ latest: null })),
      ]);

      if (batchRes && batchRes.success) {
        setStats(batchRes.stats);
        if (batchRes.stats && batchRes.stats.todayRecord) {
          setTodayRecord(batchRes.stats.todayRecord);
        } else {
          setTodayRecord(null);
        }
      }
      if (wtRes && wtRes.success) {
        setLatestWeight(wtRes.latest);
      }
    } catch (e) {
      console.warn('Worker dashboard load error:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), refreshBatchData()]);
    setRefreshing(false);
  };

  const placementDate = activeBatch?.placementDate || activeBatch?.startDate;
  const calculateBatchDay = (pDate) => {
    if (!pDate) return 1;
    const p = new Date(pDate);
    const now = new Date();
    const d1 = Date.UTC(p.getFullYear(), p.getMonth(), p.getDate());
    const d2 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.max(1, Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
  };

  const batchDay = stats?.batchDay || calculateBatchDay(placementDate);
  const currentBirds = stats ? stats.currentBirds : (activeBatch?.initialBirdCount || 0);

  // Today's entry values (show actual values if recorded, otherwise clear placeholder)
  const deathsDisplay = todayRecord?.deaths !== undefined ? `${todayRecord.deaths}` : '--';
  const feedDisplay = todayRecord?.feedUsed !== undefined ? `${todayRecord.feedUsed} KG` : '--';
  const weightDisplay = latestWeight?.averageWeight ? `${latestWeight.averageWeight} KG` : '--';
  const hasRecordedToday = Boolean(todayRecord);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 }}>
          <Text style={{ color: Colors.textMuted }}>Loading dashboard...</Text>
        </View>
      ) : (
        <>
      {/* Top Header: Batch Name, Day & Sync */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.batchTitle}>
            {activeBatch?.ibBatchNumber || activeBatch?.name || 'Unnamed Batch'}
          </Text>
          <View style={styles.dayBadge}>
            <Text style={styles.dayBadgeText}>DAY {batchDay}</Text>
          </View>
        </View>
        <SyncBadge status={syncStatus} />
      </View>

      {/* Hero: CURRENT BIRDS */}
      <Card style={styles.currentBirdsCard} accentColor={Colors.primary}>
        <Text style={styles.currentBirdsLabel}>CURRENT BIRDS</Text>
        <Text style={styles.currentBirdsVal}>
          {currentBirds.toLocaleString()}
        </Text>
      </Card>

      {/* TODAY'S ENTRY CARD */}
      <Card style={styles.entryCard}>
        <View style={styles.entryHeaderRow}>
          <Text style={styles.entryHeaderTitle}>TODAY'S ENTRY</Text>
          <View
            style={[
              styles.statusPill,
              hasRecordedToday ? styles.statusDone : styles.statusPending,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                hasRecordedToday ? styles.statusDoneText : styles.statusPendingText,
              ]}
            >
              {hasRecordedToday ? 'CONFIRMED' : 'READY TO ENTER'}
            </Text>
          </View>
        </View>

        <View style={styles.entryRow}>
          <Text style={styles.entryFieldLabel}>Deaths</Text>
          <Text style={[styles.entryFieldVal, { color: Colors.danger }]}>
            {deathsDisplay}
          </Text>
        </View>

        <View style={styles.rowDivider} />

        <View style={styles.entryRow}>
          <Text style={styles.entryFieldLabel}>Feed</Text>
          <Text style={[styles.entryFieldVal, { color: Colors.info }]}>
            {feedDisplay}
          </Text>
        </View>

        <View style={styles.rowDivider} />

        <View style={styles.entryRow}>
          <Text style={styles.entryFieldLabel}>Weight</Text>
          <Text style={[styles.entryFieldVal, { color: Colors.primary }]}>
            {weightDisplay}
          </Text>
        </View>
      </Card>

      {/* Navigation Grid */}
      <View style={styles.navGrid}>
        {[
          { label: "Today's Entry", sub: 'Log deaths, feed & weight', screen: 'TodayEntry' },
          { label: 'History', sub: 'Past daily records', screen: 'History' },
          { label: 'Profile', sub: 'Account & sync info', screen: 'Profile' },
        ].map(({ label, sub, screen }) => (
          <TouchableOpacity
            key={screen}
            style={styles.navTile}
            onPress={() => onNavigate && onNavigate(screen)}
            activeOpacity={0.75}
          >
            <Text style={styles.navTileLabel}>{label}</Text>
            <Text style={styles.navTileSub}>{sub}</Text>
          </TouchableOpacity>
        ))}
      </View>
        </>
      )}
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
    paddingBottom: 36,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  batchTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  dayBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  dayBadgeText: {
    color: Colors.textWhite,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  currentBirdsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  currentBirdsLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  currentBirdsVal: {
    fontSize: 56,
    fontWeight: '900',
    color: Colors.primaryDark,
    letterSpacing: -1,
    marginTop: 4,
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  entryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: '#F1F5F9',
  },
  entryHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDone: {
    backgroundColor: Colors.primaryLight,
  },
  statusPending: {
    backgroundColor: '#E0F2FE',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusDoneText: {
    color: Colors.primary,
  },
  statusPendingText: {
    color: '#0369A1',
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  entryFieldLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  entryFieldVal: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  navGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 36,
  },
  navTile: {
    width: '48%',
    marginBottom: 14,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  navTileLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  navTileSub: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
});
