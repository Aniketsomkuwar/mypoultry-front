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
import { WeightModal } from '../../components/common/WeightModal';
import { useAuth } from '../../context/AuthContext';
import { Api } from '../../services/api';

export const FarmerHomeScreen = ({ onNavigate }) => {
  const { farm, activeBatch, syncStatus, refreshBatchData } = useAuth();
  const [stats, setStats] = useState(null);
  const [latestWeight, setLatestWeight] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showWeightModal, setShowWeightModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [batchRes, wtRes] = await Promise.all([
        Api.getActiveBatch(),
        Api.getLatestWeight().catch(() => ({ latest: null })),
      ]);

      if (batchRes && batchRes.success) {
        setStats(batchRes.stats);
      }
      if (wtRes && wtRes.success) {
        setLatestWeight(wtRes.latest);
      }
    } catch (e) {
      console.warn('Farmer dashboard error:', e.message);
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

  const todayRecord = stats?.todayRecord;
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
  const initialBirds = activeBatch?.chicksReceived || activeBatch?.initialBirdCount || 0;
  const currentBirds = stats ? stats.currentBirds : initialBirds;

  // Today's values (defaults to latest known record if today pending)
  const todayDeaths = todayRecord ? todayRecord.deaths : 0;
  const todayFeed = todayRecord ? todayRecord.feedUsed : 0;
  const todayMortality = initialBirds > 0
    ? ((todayDeaths / initialBirds) * 100).toFixed(2)
    : '0.00';
  const displayFcr = todayRecord?.fcr || stats?.latestFcr || '--';
  const displayAvgWeight = latestWeight?.averageWeight
    ? `${latestWeight.averageWeight} KG`
    : '--';

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
          {/* Top Header: Farm Name + Sync */}
          <View style={styles.topBar}>
        <View>
          <Text style={styles.farmTitle}>
            {farm?.name ? farm.name.toUpperCase() : 'MYPOULTRY'}
          </Text>
          <Text style={styles.dateSub}>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        <SyncBadge status={syncStatus} />
      </View>

      {/* IB BATCH & DAY Header */}
      <View style={styles.batchInfoCard}>
        <View style={styles.batchRow}>
          <View>
            <View style={styles.activeBatchIndicatorRow}>
              <View style={styles.activeDot} />
              <Text style={styles.activeBatchBadgeText}>ACTIVE BATCH</Text>
            </View>
            <Text style={styles.batchName}>
              {activeBatch?.ibBatchNumber || activeBatch?.name || 'Unnamed Batch'}
            </Text>
          </View>
          <View style={styles.batchRightCol}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeText}>DAY {batchDay}</Text>
            </View>

          </View>
        </View>
      </View>

      {/* Hero: CURRENT BIRDS */}
      <Card style={styles.currentBirdsCard} accentColor={Colors.primary}>
        <Text style={styles.currentBirdsLabel}>CURRENT BIRDS</Text>
        <Text style={styles.currentBirdsVal}>
          {currentBirds.toLocaleString()}
        </Text>
        <Text style={styles.currentBirdsSub}>
          From {initialBirds.toLocaleString()} placed chicks
        </Text>
      </Card>

      {/* TODAY Metric Box */}
      <Card style={styles.todayCard}>
        <View style={styles.todayHeader}>
          <Text style={styles.todayTitle}>TODAY</Text>
          <TouchableOpacity
            onPress={() => setShowWeightModal(true)}
            style={styles.weighQuickBtn}
          >
            <Text style={styles.weighQuickText}>+ WEIGH BIRDS</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Deaths</Text>
          <Text style={[styles.metricVal, { color: Colors.danger }]}>
            {todayDeaths}
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Mortality</Text>
          <Text style={[styles.metricVal, { color: Colors.warning }]}>
            {todayMortality}%
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Feed</Text>
          <Text style={[styles.metricVal, { color: Colors.info }]}>
            {todayFeed} KG
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>FCR</Text>
          <Text style={[styles.metricVal, { color: Colors.primaryDark }]}>
            {displayFcr}
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Avg Weight</Text>
          <Text style={[styles.metricVal, { color: Colors.primary }]}>
            {displayAvgWeight}
          </Text>
        </View>
      </Card>

      {/* Navigation Grid */}
      <View style={styles.navGrid}>
        {[
          { label: 'Daily Records', sub: "Today's data entry", screen: 'DailyRecords' },
          { label: 'Expenses', sub: 'Farm costs & purchases', screen: 'Expenses' },
          { label: 'Batch Details', sub: 'Performance & FCR', screen: 'Performance' },
          { label: 'Batch Mgmt', sub: 'Active & past batches', screen: 'Batches' },
          { label: 'Supplies', sub: 'Feed & medicine logs', screen: 'Supplies' },
          { label: 'Reports', sub: 'Trends & analysis', screen: 'Reports' },
          { label: 'Profile', sub: 'Farm & account info', screen: 'Profile' },
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

      {/* Weight Modal */}
      <WeightModal
        visible={showWeightModal}
        onClose={() => setShowWeightModal(false)}
        onSuccess={async (newWt) => {
          setLatestWeight(newWt);
          await loadData();
        }}
        batchId={activeBatch?.id}
        batchDay={batchDay}
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
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginBottom: 14,
  },
  farmTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  dateSub: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  batchInfoCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  batchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeBatchIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  activeBatchBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.primaryDark,
    letterSpacing: 0.6,
  },
  batchName: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  batchRightCol: {
    alignItems: 'flex-end',
  },
  allBatchesLink: {
    marginTop: 4,
    paddingVertical: 2,
  },
  allBatchesLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 0.4,
  },
  dayBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dayBadgeText: {
    color: Colors.textWhite,
    fontSize: 14,
    fontWeight: '900',
    
  },
  currentBirdsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  currentBirdsLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1.2,
  },
  currentBirdsVal: {
    fontSize: 52,
    fontWeight: '900',
    color: Colors.primaryDark,
    letterSpacing: -1,
    marginVertical: 4,
  },
  currentBirdsSub: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  todayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
  },
  todayTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  weighQuickBtn: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  weighQuickText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  metricLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  metricDivider: {
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
