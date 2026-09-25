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
import { WeightModal } from '../../components/common/WeightModal';
import { useAuth } from '../../context/AuthContext';
import { Api } from '../../services/api';
import { EmptyState } from '../../components/common/EmptyState';

export const FarmerWeightsScreen = ({ onNavigate, selectedBatchId }) => {
  const { activeBatch } = useAuth();
  
  const [currentId, setCurrentId] = useState(
    selectedBatchId || activeBatch?.id || 'active'
  );
  
  const [batches, setBatches] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

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

  const loadSummary = useCallback(async (batchIdToLoad) => {
    setLoading(true);
    try {
      const id = batchIdToLoad || currentId || 'active';
      const res = await Api.getWeightSummary(id);
      if (res && res.success) {
        setSummary(res.summary || []);
      }
    } catch (e) {
      console.warn('Weight summary error:', e.message);
    } finally {
      setLoading(false);
    }
  }, [currentId]);

  useEffect(() => {
    loadBatches();
    loadSummary(currentId);
  }, [loadSummary, currentId]);

  const onRefresh = async () => {
    await Promise.all([loadBatches(), loadSummary(currentId)]);
  };

  // Find max weight for chart scaling
  const maxWeight = Math.max(...summary.map(w => w.averageWeight || 0), 0.1); // Avoid 0 division

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Body Weight</Text>
          <Text style={styles.subtitle}>Growth tracking and curves</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowModal(true)}
        >
          <Text style={styles.addBtnText}>+ ADD WEIGHT</Text>
        </TouchableOpacity>
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
                  loadSummary(b._id);
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

      {summary.length === 0 && !loading ? (
        <EmptyState
          title="No Weight Data"
          description="You haven't logged any body weight samples for this batch yet."
        />
      ) : summary.length > 0 ? (
        <>
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>GROWTH CURVE</Text>
            <Text style={styles.chartSub}>Average weight (KG) progression</Text>

            <View style={styles.barList}>
              {summary.map((item, idx) => {
                const heightPercent = Math.max(10, Math.round((item.averageWeight / maxWeight) * 100));
                return (
                  <View key={idx} style={styles.barCol}>
                    <Text style={styles.barTopNum}>{item.averageWeight}</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { height: `${heightPercent}%`, backgroundColor: Colors.primary },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>Day {item.batchDay}</Text>
                  </View>
                );
              })}
            </View>
          </Card>

          <View style={styles.tableSection}>
            <Text style={styles.listTitle}>Weight Logs</Text>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableColHeader, { flex: 0.8 }]}>Day</Text>
                <Text style={[styles.tableColHeader, { flex: 1.5 }]}>Date</Text>
                <Text style={[styles.tableColHeader, { flex: 1, textAlign: 'center' }]}>Sampled</Text>
                <Text style={[styles.tableColHeader, { flex: 1.2, textAlign: 'right' }]}>Weight (KG)</Text>
              </View>
              {summary.slice().reverse().map((item, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.tableCellBold, { flex: 0.8 }]}>{item.batchDay}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>
                    {new Date(item.date).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{item.sampleCount}</Text>
                  <Text style={[styles.tableCell, styles.tableCellPrimary, { flex: 1.2, textAlign: 'right' }]}>
                    {item.averageWeight.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : null}

      {/* Weight Modal */}
      <WeightModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={async () => {
          await loadSummary(currentId);
        }}
        batchId={currentId === 'active' ? activeBatch?.id : currentId}
        batchDay={1} // The API handles computeDay for us if date is provided
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
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: {
    color: Colors.primaryDark,
    fontWeight: '800',
    fontSize: 12,
  },
  batchSelectorScroll: {
    marginVertical: 12,
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
  chartCard: {
    padding: 20,
    marginTop: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  chartSub: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: 20,
  },
  barList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingTop: 10,
    gap: 8, // prevent bars from merging if many
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTopNum: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  barTrack: {
    width: '100%',
    maxWidth: 36,
    height: 100,
    backgroundColor: Colors.cardAlt,
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    marginTop: 8,
  },
  tableSection: {
    marginTop: 24,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  tableContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.cardAlt,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableColHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tableCellBold: {
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  tableCellPrimary: {
    fontWeight: '800',
    color: Colors.primaryDark,
  },
});
