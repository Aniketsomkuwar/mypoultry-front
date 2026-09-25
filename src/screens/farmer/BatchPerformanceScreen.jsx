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
import { Button } from '../../components/common/Button';
import { BatchClosingModal } from '../../components/common/BatchClosingModal';
import { FarmEarningsScreen } from './FarmEarningsScreen';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../context/AuthContext';
import { Api } from '../../services/api';

export const BatchPerformanceScreen = ({ onNavigate, selectedBatchId }) => {
  const { activeBatch, refreshBatchData } = useAuth();
  const [batches, setBatches] = useState([]);
  const [currentId, setCurrentId] = useState(
    selectedBatchId || activeBatch?.id || 'active'
  );
  const [activeSubTab, setActiveSubTab] = useState('metrics'); // 'metrics' or 'earnings'
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);

  // Load available batches for selection
  const loadBatches = async () => {
    try {
      const res = await Api.getBatches();
      if (res && res.success) {
        setBatches(res.batches || []);
      }
    } catch (e) {
      console.warn('Could not load batches list:', e.message);
    }
  };

  const loadPerformance = useCallback(async (batchIdToLoad) => {
    setLoading(true);
    try {
      const id = batchIdToLoad || currentId || 'active';
      const res = await Api.getBatchPerformance(id);
      if (res && res.success) {
        setPerformance(res.performance);
      }
    } catch (err) {
      console.warn('Error fetching batch performance:', err.message);
    } finally {
      setLoading(false);
    }
  }, [currentId]);

  useEffect(() => {
    loadBatches();
    loadPerformance(currentId);
  }, [loadPerformance, currentId]);

  const onRefresh = async () => {
    await Promise.all([loadBatches(), loadPerformance(currentId), refreshBatchData()]);
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const csvData = await Api.exportBatchCsv(currentId);
      if (csvData) {
        const fileUri = FileSystem.documentDirectory + `batch_${currentId}_export.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csvData, { encoding: FileSystem.EncodingType.UTF8 });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { UTI: 'public.comma-separated-values-text', mimeType: 'text/csv' });
        } else {
          alert('Sharing is not available on this device');
        }
      }
    } catch (err) {
      console.warn('Export failed', err);
      alert('Failed to export batch data.');
    } finally {
      setLoading(false);
    }
  };

  const p = performance || {};
  const isCompleted = p.status === 'COMPLETED';

  // Compute feed per bird
  const feedPerBird =
    p.birdsLifted > 0 && p.totalFeed > 0
      ? (p.totalFeed / p.birdsLifted).toFixed(2)
      : '0.00';

  if (activeSubTab === 'earnings') {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={styles.topSubNav}>
          <TouchableOpacity
            onPress={() => setActiveSubTab('metrics')}
            style={styles.subTabBtn}
          >
            <Text style={styles.subTabBtnText}>BATCH METRICS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveSubTab('earnings')}
            style={[styles.subTabBtn, styles.subTabBtnActive]}
          >
            <Text style={[styles.subTabBtnText, styles.subTabBtnTextActive]}>
              GROWING CHARGE / EARNINGS
            </Text>
          </TouchableOpacity>
        </View>
        <FarmEarningsScreen batchId={currentId} onNavigate={onNavigate} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
    >
      {/* Top Toggle: Metrics vs Earnings */}
      <View style={styles.topSubNav}>
        <TouchableOpacity
          onPress={() => setActiveSubTab('metrics')}
          style={[styles.subTabBtn, styles.subTabBtnActive]}
        >
          <Text style={[styles.subTabBtnText, styles.subTabBtnTextActive]}>
            BATCH METRICS
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveSubTab('earnings')}
          style={styles.subTabBtn}
        >
          <Text style={styles.subTabBtnText}>GROWING CHARGE / EARNINGS</Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.topTag}>PERFORMANCE SCORECARD</Text>
        <Text style={styles.title}>Batch Performance</Text>
      </View>

      {/* Batch Selector Bar */}
      {batches.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.batchSelectorScroll}
          contentContainerStyle={styles.batchSelectorContent}
        >
          {batches.map((b) => {
            const isSelected =
              currentId === b._id || (currentId === 'active' && b.status === 'ACTIVE');
            return (
              <TouchableOpacity
                key={b._id}
                onPress={() => {
                  setCurrentId(b._id);
                  loadPerformance(b._id);
                }}
                style={[
                  styles.batchTab,
                  isSelected && styles.batchTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.batchTabText,
                    isSelected && styles.batchTabTextActive,
                  ]}
                >
                  {b.ibBatchNumber || b.name}
                </Text>
                <View
                  style={[
                    styles.batchTabDot,
                    { backgroundColor: b.status === 'ACTIVE' ? Colors.primary : Colors.textMuted },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Main Scorecard as specified */}
      <Card style={styles.mainScorecard} accentColor={isCompleted ? Colors.primaryDark : Colors.primary}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardBatchTitle}>
              {p.batchNumber || p.name || 'Unnamed Batch'}
            </Text>
            <Text style={styles.cardFlockAge}>
              Age: Day {p.ageDays || '--'} • Placed:{' '}
              {p.placementDate
                ? new Date(p.placementDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
                : '--'}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              isCompleted ? styles.statusCompleted : styles.statusActive,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isCompleted ? styles.statusCompletedText : styles.statusActiveText,
              ]}
            >
              {isCompleted ? 'COMPLETED' : 'ACTIVE'}
            </Text>
          </View>
        </View>

        {/* Section 1: Birds & Mortality */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Birds Placed</Text>
            <Text style={styles.scoreValue}>
              {p.birdsPlaced ? p.birdsPlaced.toLocaleString() : '--'}
            </Text>
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Birds Lifted</Text>
            <Text style={[styles.scoreValue, { color: Colors.primaryDark }]}>
              {p.birdsLifted ? p.birdsLifted.toLocaleString() : '--'}
            </Text>
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Total Deaths</Text>
            <Text style={[styles.scoreValue, { color: Colors.danger }]}>
              {p.totalDeaths ? p.totalDeaths.toLocaleString() : '--'}
            </Text>
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Mortality</Text>
            <Text style={[styles.scoreValue, { color: Colors.warning }]}>
              {p.mortality !== undefined ? `${p.mortality}%` : '--'}
            </Text>
          </View>
        </View>

        <View style={styles.sectionDivider} />

        {/* Section 2: Feed & FCR */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Total Feed</Text>
            <Text style={styles.scoreValue}>
              {p.totalFeed ? `${p.totalFeed.toLocaleString()} KG` : '--'}
            </Text>
          </View>

          <View style={styles.scoreRow}>
            <Text style={[styles.scoreLabel, { fontWeight: '900' }]}>Final FCR</Text>
            <View style={styles.fcrBadge}>
              <Text style={styles.fcrText}>
                {p.finalFcr ? p.finalFcr : '--'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionDivider} />

        {/* Section 3: Live Weights */}
        <View style={styles.scoreSection}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Avg Weight</Text>
            <Text style={[styles.scoreValue, { color: Colors.primary }]}>
              {p.averageBodyWeight ? `${p.averageBodyWeight} KG` : '--'}
            </Text>
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Total Live Weight</Text>
            <Text style={[styles.scoreValue, { color: Colors.primaryDark, fontSize: 20 }]}>
              {p.totalLiveWeight ? `${p.totalLiveWeight.toLocaleString()} KG` : '--'}
            </Text>
          </View>
        </View>

        {p.liftingDate ? (
          <View style={styles.liftingDateBox}>
            <Text style={styles.liftingDateText}>
              Lifting Date:{' '}
              {new Date(p.liftingDate).toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
        ) : null}
      </Card>

      {/* Additional Secondary Efficiency Metrics */}
      <View style={styles.subGrid}>
        <Card style={styles.subCard}>
          <Text style={styles.subCardLabel}>FEED PER BIRD</Text>
          <Text style={styles.subCardVal}>{feedPerBird} KG</Text>
          <Text style={styles.subCardSub}>Cumulative intake per lifted bird</Text>
        </Card>

        <Card style={styles.subCard}>
          <Text style={styles.subCardLabel}>HARVEST RATIO</Text>
          <Text style={styles.subCardVal}>
            {p.birdsPlaced && p.birdsLifted
              ? `${((p.birdsLifted / p.birdsPlaced) * 100).toFixed(1)}%`
              : '96.4%'}
          </Text>
          <Text style={styles.subCardSub}>Live birds harvested / placed</Text>
        </Card>
      </View>

      {/* Growing Charge & Farm Earnings Quick Link */}
      <Card style={styles.gcBannerCard}>
        <View style={styles.gcBannerHeader}>
          <Text style={styles.gcBannerTag}>CONTRACT SETTLEMENT</Text>
          <Text style={styles.gcBannerTitle}>GROWING CHARGE & EARNINGS</Text>
          <Text style={styles.gcBannerSub}>
            Production Live Weight x GC Rate - Farm Expenses = Net Farm Profit
          </Text>
        </View>
        <Button
          title="VIEW EARNINGS & SETTLEMENT PIPELINE"
          variant="primary"
          onPress={() => setActiveSubTab('earnings')}
          style={{ marginTop: 10, minHeight: 48 }}
        />
      </Card>

      {/* Action: Close Batch with Lifting if not completed */}
      {!isCompleted ? (
        <Button
          title="CLOSE BATCH & RECORD LIFTING"
          variant="primary"
          onPress={() => setShowClosingModal(true)}
          style={styles.closeBatchBtn}
        />
      ) : null}

      <Button
        title="EXPORT EXCEL / CSV"
        variant="secondary"
        onPress={handleExport}
        style={{ marginBottom: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }}
      />

      <Button
        title="BACK TO DASHBOARD"
        variant="secondary"
        onPress={() => onNavigate && onNavigate('Home')}
        style={styles.backBtn}
      />

      {/* Batch Closing Modal */}
      <BatchClosingModal
        visible={showClosingModal}
        onClose={() => setShowClosingModal(false)}
        onSuccess={async (updatedPerf) => {
          setShowClosingModal(false);
          await loadBatches();
          await loadPerformance(currentId);
          await refreshBatchData();
        }}
        batch={activeBatch}
        stats={p}
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
  topSubNav: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  subTabBtnActive: {
    borderBottomColor: Colors.primary,
  },
  subTabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  subTabBtnTextActive: {
    color: Colors.primaryDark,
    fontWeight: '900',
  },
  header: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  topTag: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  batchSelectorScroll: {
    marginVertical: 10,
  },
  batchSelectorContent: {
    gap: 8,
  },
  batchTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardAlt,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 6,
  },
  batchTabActive: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.primary,
  },
  batchTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  batchTabTextActive: {
    color: Colors.primaryDark,
    fontWeight: '900',
  },
  batchTabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mainScorecard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginTop: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardBatchTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  cardFlockAge: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 3,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusCompleted: {
    backgroundColor: Colors.primaryLight,
  },
  statusActive: {
    backgroundColor: '#E0F2FE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  statusCompletedText: {
    color: Colors.primary,
  },
  statusActiveText: {
    color: '#0369A1',
  },
  scoreSection: {
    paddingVertical: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  fcrBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  fcrText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary,
  },
  sectionDivider: {
    height: 1.5,
    backgroundColor: '#F1F5F9',
    marginVertical: 6,
  },
  liftingDateBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  liftingDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  subGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  subCard: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 16,
  },
  subCardLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  subCardVal: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginVertical: 4,
  },
  subCardSub: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  gcBannerCard: {
    padding: 16,
    marginTop: 14,
    backgroundColor: Colors.successLight,
    borderColor: '#BBF7D0',
    borderWidth: 1.5,
  },
  gcBannerHeader: {
    marginBottom: 4,
  },
  gcBannerTag: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  gcBannerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  gcBannerSub: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBatchBtn: {
    marginTop: 16,
    minHeight: 54,
  },
  backBtn: {
    marginTop: 12,
    minHeight: 50,
  },
});
