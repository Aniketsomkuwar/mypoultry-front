import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { BatchClosingModal } from '../../components/common/BatchClosingModal';
import { useAuth } from '../../context/AuthContext';
import { Api } from '../../services/api';

export const FarmerBatchesScreen = ({ onNavigate, onSelectBatch }) => {
  const { farm, activeBatch, refreshBatchData } = useAuth();
  const currency = farm?.currency || '₹';

  const [batches, setBatches] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'ACTIVE', 'COMPLETED'
  const [loading, setLoading] = useState(false);
  const [activeBatchStats, setActiveBatchStats] = useState(null);

  // New Batch Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [ibBatchNumber, setIbBatchNumber] = useState('');
  const [chicksReceived, setChicksReceived] = useState('');
  const [placementDateInput, setPlacementDateInput] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [receiptDateInput, setReceiptDateInput] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [breed, setBreed] = useState('');
  const [notes, setNotes] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Closing Modal & Confirmation
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [targetBatchToActivate, setTargetBatchToActivate] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [batchesRes, activeRes] = await Promise.all([
        Api.getBatches(),
        Api.getActiveBatch(),
      ]);

      if (batchesRes && batchesRes.success) {
        setBatches(batchesRes.batches || []);
      }
      if (activeRes && activeRes.success) {
        setActiveBatchStats(activeRes.stats);
      }
    } catch (e) {
      console.warn('Error loading batches:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    await Promise.all([loadData(), refreshBatchData()]);
  };

  const handleOpenNewBatch = () => {
    const nextNum = (batches.length || 0) + 1;
    setIbBatchNumber(`IB BATCH #${nextNum}`);
    setChicksReceived('');
    setPlacementDateInput(new Date().toISOString().split('T')[0]);
    setReceiptDateInput(new Date().toISOString().split('T')[0]);
    setBreed('');
    setNotes('');
    setModalError('');
    setShowNewModal(true);
  };

  const handleCreateBatch = async () => {
    if (!ibBatchNumber.trim()) {
      setModalError('Please enter an IB Batch / Lot Number.');
      return;
    }
    if (!chicksReceived || isNaN(chicksReceived) || Number(chicksReceived) <= 0) {
      setModalError('Chicks received must be a positive number.');
      return;
    }

    setSaveLoading(true);
    setModalError('');
    try {
      const res = await Api.createBatch({
        name: ibBatchNumber.trim(),
        ibBatchNumber: ibBatchNumber.trim(),
        chicksReceived: Number(chicksReceived),
        initialBirdCount: Number(chicksReceived),
        placementDate: placementDateInput,
        chickReceiptDate: receiptDateInput,
        startDate: placementDateInput,
        breed: breed.trim(),
        notes: notes.trim(),
      });

      if (res && res.success) {
        setShowNewModal(false);
        await refreshBatchData();
        await loadData();
        Alert.alert('Batch Created', `Batch "${ibBatchNumber}" is now set as active.`);
      }
    } catch (err) {
      setModalError(err.message || 'Failed to create new batch.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSetActiveBatch = async () => {
    if (!targetBatchToActivate) return;
    try {
      const res = await Api.setActiveBatch(targetBatchToActivate._id);
      if (res && res.success) {
        setTargetBatchToActivate(null);
        await refreshBatchData();
        await loadData();
        Alert.alert('Active Batch Updated', `"${targetBatchToActivate.name}" is now the active batch.`);
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not set active batch.');
    }
  };

  const calculateBatchDay = (pDate) => {
    if (!pDate) return 1;
    const p = new Date(pDate);
    const now = new Date();
    const d1 = Date.UTC(p.getFullYear(), p.getMonth(), p.getDate());
    const d2 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.max(1, Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
  };

  // Segregate batches
  const activeBatchesList = batches.filter((b) => b.status === 'ACTIVE');
  const completedBatchesList = batches.filter((b) => b.status === 'COMPLETED');

  // Helper to open scorecard or earnings
  const handleOpenPerformance = (batchId) => {
    if (onSelectBatch) onSelectBatch(batchId);
    if (onNavigate) onNavigate('Performance');
  };

  const handleOpenSettlement = (batchId) => {
    if (onSelectBatch) onSelectBatch(batchId);
    if (onNavigate) onNavigate('Earnings');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTag}>MULTI-BATCH MANAGEMENT</Text>
          <Text style={styles.title}>Farm Batches</Text>
          <Text style={styles.subTitle}>Active & Historical Flocks</Text>
        </View>
        <Button
          title="+ NEW BATCH"
          variant="primary"
          onPress={handleOpenNewBatch}
          style={styles.newBatchBtn}
          textStyle={{ fontSize: 13 }}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('ALL')}
          style={[styles.tabItem, activeTab === 'ALL' && styles.tabItemActive]}
        >
          <Text style={[styles.tabText, activeTab === 'ALL' && styles.tabTextActive]}>
            ALL ({batches.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('ACTIVE')}
          style={[styles.tabItem, activeTab === 'ACTIVE' && styles.tabItemActive]}
        >
          <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>
            ACTIVE ({activeBatchesList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('COMPLETED')}
          style={[styles.tabItem, activeTab === 'COMPLETED' && styles.tabItemActive]}
        >
          <Text style={[styles.tabText, activeTab === 'COMPLETED' && styles.tabTextActive]}>
            PREVIOUS ({completedBatchesList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* SECTION 1: ACTIVE BATCH */}
      {(activeTab === 'ALL' || activeTab === 'ACTIVE') && (
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.statusIndicatorActive} />
            <Text style={styles.sectionHeading}>ACTIVE BATCH (CURRENT FLOCK)</Text>
          </View>

          {activeBatchesList.length > 0 ? (
            activeBatchesList.map((batch) => {
              const pDate = batch.placementDate || batch.startDate;
              const bDay = activeBatchStats?.batchDay || calculateBatchDay(pDate);
              const placed = batch.chicksReceived || batch.initialBirdCount || 0;
              const live = activeBatchStats ? activeBatchStats.currentBirds : placed;
              const deaths = activeBatchStats ? activeBatchStats.totalDeaths : 0;
              const mortality = placed > 0 ? ((deaths / placed) * 100).toFixed(2) : '0.00';
              const feed = activeBatchStats ? activeBatchStats.totalFeedUsed : 0;
              const fcr = activeBatchStats?.latestFcr || '--';

              return (
                <Card
                  key={batch._id}
                  style={styles.activeCard}
                  accentColor={Colors.primary}
                >
                  <View style={styles.activeTopRow}>
                    <View>
                      <View style={styles.badgeRow}>
                        <View style={styles.activeStatusPill}>
                          <Text style={styles.activeStatusPillText}>IN PRODUCTION</Text>
                        </View>
                        <View style={styles.dayPill}>
                          <Text style={styles.dayPillText}>DAY {bDay}</Text>
                        </View>
                      </View>
                      <Text style={styles.batchTitle}>
                        {batch.ibBatchNumber || batch.name}
                      </Text>
                    </View>
                  </View>

                  {/* Bird counts summary */}
                  <View style={styles.metricGrid}>
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>PLACED BIRDS</Text>
                      <Text style={styles.metricVal}>{placed.toLocaleString()}</Text>
                    </View>
                    <View style={styles.metricDividerV} />
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>CURRENT LIVE</Text>
                      <Text style={[styles.metricVal, { color: Colors.primaryDark }]}>
                        {live.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.metricDividerV} />
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>MORTALITY</Text>
                      <Text style={[styles.metricVal, { color: Colors.warning }]}>
                        {mortality}%
                      </Text>
                    </View>
                  </View>

                  {/* Secondary info */}
                  <View style={styles.infoTable}>
                    <View style={styles.infoTableRow}>
                      <Text style={styles.infoTableLabel}>Placement Date:</Text>
                      <Text style={styles.infoTableVal}>
                        {new Date(pDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <View style={styles.infoTableRow}>
                      <Text style={styles.infoTableLabel}>Feed Consumed:</Text>
                      <Text style={styles.infoTableVal}>{feed.toLocaleString()} KG</Text>
                    </View>
                    <View style={styles.infoTableRow}>
                      <Text style={styles.infoTableLabel}>Current FCR:</Text>
                      <Text style={styles.infoTableVal}>{fcr}</Text>
                    </View>
                    <View style={styles.infoTableRow}>
                      <Text style={styles.infoTableLabel}>Breed:</Text>
                      <Text style={styles.infoTableVal}>{batch.breed || 'Broiler'}</Text>
                    </View>
                  </View>

                  {/* Actions for Active Batch */}
                  <View style={styles.actionBtnStack}>
                    <Button
                      title="VIEW PERFORMANCE SCORECARD"
                      variant="primary"
                      onPress={() => handleOpenPerformance(batch._id)}
                      style={styles.actionBtnPrimary}
                    />
                    <View style={styles.actionBtnRow}>
                      <Button
                        title="ESTIMATED SETTLEMENT"
                        variant="secondary"
                        onPress={() => handleOpenSettlement(batch._id)}
                        style={{ flex: 1 }}
                        textStyle={{ fontSize: 12 }}
                      />
                      <View style={{ width: 8 }} />
                      <Button
                        title="CLOSE & LIFT BATCH"
                        variant="secondary"
                        onPress={() => setShowClosingModal(true)}
                        style={{ flex: 1 }}
                        textStyle={{ fontSize: 12, color: Colors.danger }}
                      />
                    </View>
                  </View>
                </Card>
              );
            })
          ) : (
            <Card style={styles.emptyBatchCard}>
              <Text style={styles.emptyBatchTitle}>No Active Flock</Text>
              <Text style={styles.emptyBatchSub}>
                There is currently no active batch running on this farm. Start a new IB Batch below.
              </Text>
              <Button
                title="+ START NEW IB BATCH"
                variant="primary"
                onPress={handleOpenNewBatch}
                style={{ marginTop: 12 }}
              />
            </Card>
          )}
        </View>
      )}

      {/* SECTION 2: PREVIOUS & COMPLETED BATCHES */}
      {(activeTab === 'ALL' || activeTab === 'COMPLETED') && (
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.statusIndicatorCompleted} />
            <Text style={styles.sectionHeading}>
              PREVIOUS BATCHES (COMPLETED) ({completedBatchesList.length})
            </Text>
          </View>

          {completedBatchesList.length > 0 ? (
            completedBatchesList.map((batch) => {
              const placed = batch.chicksReceived || batch.initialBirdCount || 0;
              const lifted = batch.birdsLifted || 0;
              const liveWeight = batch.totalLiveWeight || 0;
              const fcr = batch.finalFcr ? batch.finalFcr.toFixed(2) : '--';
              const mortality = batch.finalMortality
                ? batch.finalMortality.toFixed(2)
                : placed > 0
                ? (((placed - lifted) / placed) * 100).toFixed(2)
                : '0.00';
              const avgWeight = batch.averageBodyWeight
                ? `${batch.averageBodyWeight.toFixed(2)} KG`
                : '--';
              const cFcr = batch.ibGcDetails?.correctedFcr
                ? batch.ibGcDetails.correctedFcr.toFixed(4)
                : '--';
              const gcAmount = batch.ibGcDetails?.estimatedGc
                ? `${currency} ${batch.ibGcDetails.estimatedGc.toLocaleString()}`
                : '--';

              const liftingFormatted = batch.liftingDate
                ? new Date(batch.liftingDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Completed';

              return (
                <Card key={batch._id} style={styles.completedCard}>
                  <View style={styles.completedHeaderRow}>
                    <View>
                      <View style={styles.badgeRow}>
                        <View style={styles.completedBadge}>
                          <Text style={styles.completedBadgeText}>COMPLETED / CLOSED</Text>
                        </View>
                        <Text style={styles.liftingDateText}>Lifted: {liftingFormatted}</Text>
                      </View>
                      <Text style={styles.completedBatchTitle}>
                        {batch.ibBatchNumber || batch.name}
                      </Text>
                    </View>
                  </View>

                  {/* Completed metrics grid */}
                  <View style={styles.completedGrid}>
                    <View style={styles.completedGridCol}>
                      <Text style={styles.compLabel}>BIRDS PLACED</Text>
                      <Text style={styles.compVal}>{placed.toLocaleString()}</Text>
                    </View>
                    <View style={styles.completedGridCol}>
                      <Text style={styles.compLabel}>BIRDS LIFTED</Text>
                      <Text style={[styles.compVal, { color: Colors.primaryDark }]}>
                        {lifted.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.completedGridCol}>
                      <Text style={styles.compLabel}>MORTALITY</Text>
                      <Text style={[styles.compVal, { color: Colors.warningDark }]}>
                        {mortality}%
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.completedGrid, { marginTop: 8 }]}>
                    <View style={styles.completedGridCol}>
                      <Text style={styles.compLabel}>TOTAL LIVE WT</Text>
                      <Text style={styles.compVal}>
                        {liveWeight > 0 ? `${liveWeight.toLocaleString()} KG` : '--'}
                      </Text>
                    </View>
                    <View style={styles.completedGridCol}>
                      <Text style={styles.compLabel}>FINAL FCR</Text>
                      <Text style={styles.compVal}>{fcr}</Text>
                    </View>
                    <View style={styles.completedGridCol}>
                      <Text style={styles.compLabel}>CORRECTED FCR</Text>
                      <Text style={[styles.compVal, { color: Colors.info }]}>{cFcr}</Text>
                    </View>
                  </View>

                  <View style={[styles.completedGrid, { marginTop: 8 }]}>
                    <View style={styles.completedGridCol}>
                      <Text style={styles.compLabel}>AVG BODY WT</Text>
                      <Text style={styles.compVal}>{avgWeight}</Text>
                    </View>
                    <View style={[styles.completedGridCol, { flex: 2 }]}>
                      <Text style={styles.compLabel}>EST. GROWING CHARGE</Text>
                      <Text style={[styles.compVal, { color: Colors.success, fontSize: 18 }]}>
                        {gcAmount}
                      </Text>
                    </View>
                  </View>

                  {/* Actions for completed batch */}
                  <View style={styles.completedActionRow}>
                    <Button
                      title="VIEW SCORECARD"
                      variant="primary"
                      onPress={() => handleOpenPerformance(batch._id)}
                      style={{ flex: 1, minHeight: 44 }}
                      textStyle={{ fontSize: 12 }}
                    />
                    <View style={{ width: 8 }} />
                    <Button
                      title="VIEW SETTLEMENT"
                      variant="secondary"
                      onPress={() => handleOpenSettlement(batch._id)}
                      style={{ flex: 1, minHeight: 44 }}
                      textStyle={{ fontSize: 12 }}
                    />
                    <View style={{ width: 8 }} />
                    <TouchableOpacity
                      onPress={() => setTargetBatchToActivate(batch)}
                      style={styles.reopenBtn}
                    >
                      <Text style={styles.reopenBtnText}>SET ACTIVE</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })
          ) : (
            <Card style={styles.emptyBatchCard}>
              <Text style={styles.emptyBatchTitle}>No Previous Batches</Text>
              <Text style={styles.emptyBatchSub}>
                Completed batches and their lifting records will appear here for historical reference.
              </Text>
            </Card>
          )}
        </View>
      )}

      {/* Confirmation Modal to Set Active */}
      <ConfirmModal
        visible={Boolean(targetBatchToActivate)}
        title="Set as Active Batch?"
        message={`Are you sure you want to set "${targetBatchToActivate?.name}" as the current active batch for this farm?`}
        confirmText="YES, SET ACTIVE"
        cancelText="CANCEL"
        variant="primary"
        onConfirm={handleSetActiveBatch}
        onCancel={() => setTargetBatchToActivate(null)}
      />

      {/* Batch Closing Modal */}
      <BatchClosingModal
        visible={showClosingModal}
        batch={activeBatch}
        onClose={() => setShowClosingModal(false)}
        onSuccess={async () => {
          await refreshBatchData();
          await loadData();
        }}
      />

      {/* New Batch Creation Modal */}
      <Modal visible={showNewModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { padding: 0 }]} contentContainerStyle={{ padding: 22 }} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New IB Batch</Text>
              <TouchableOpacity onPress={() => setShowNewModal(false)}>
                <Text style={styles.closeIcon}>X</Text>
              </TouchableOpacity>
            </View>

            {modalError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{modalError}</Text>
              </View>
            ) : null}

            <Input
              label="IB Batch / Lot Number"
              placeholder="e.g. IB BATCH #1025"
              value={ibBatchNumber}
              onChangeText={setIbBatchNumber}
              helperText="Official company batch or flock identifier"
            />

            <Input
              label="Chicks Received"
              placeholder="e.g. 5000"
              value={chicksReceived}
              onChangeText={setChicksReceived}
              keyboardType="numeric"
              helperText="Total number of chicks placed in shed"
            />

            <Input
              label="Placement Date"
              value={placementDateInput}
              onChangeText={setPlacementDateInput}
              placeholder="YYYY-MM-DD"
              helperText="Date chicks were placed in shed"
            />

            <Input
              label="Chick Receipt Date"
              value={receiptDateInput}
              onChangeText={setReceiptDateInput}
              placeholder="YYYY-MM-DD"
              helperText="Date of arrival from hatchery"
            />

            <Input
              label="Breed"
              value={breed}
              onChangeText={setBreed}
              placeholder="e.g. Broiler (Cobb 500)"
            />

            <Input
              label="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Hatchery, truck details, weather notes"
              multiline
              numberOfLines={2}
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="CANCEL"
                variant="secondary"
                onPress={() => setShowNewModal(false)}
                style={{ flex: 1 }}
              />
              <View style={{ width: 10 }} />
              <Button
                title="CREATE BATCH"
                variant="primary"
                loading={saveLoading}
                onPress={handleCreateBatch}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  topTag: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  subTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  newBatchBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.cardAlt,
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primaryDark,
    fontWeight: '900',
  },
  sectionWrap: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  statusIndicatorActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  statusIndicatorCompleted: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#64748B',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.6,
  },
  activeCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#86EFAC',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  activeTopRow: {
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  activeStatusPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeStatusPillText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.primaryDark,
    letterSpacing: 0.5,
  },
  dayPill: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.textWhite,
  },
  batchTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  metricGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricDividerV: {
    width: 1,
    backgroundColor: Colors.border,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  metricVal: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  infoTable: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  infoTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoTableLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  infoTableVal: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  actionBtnStack: {
    gap: 8,
  },
  actionBtnPrimary: {
    minHeight: 46,
  },
  actionBtnRow: {
    flexDirection: 'row',
  },
  completedCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 12,
    backgroundColor: Colors.card,
  },
  completedHeaderRow: {
    marginBottom: 12,
  },
  completedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  liftingDateText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  completedBatchTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  completedGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 10,
  },
  completedGridCol: {
    flex: 1,
    alignItems: 'center',
  },
  compLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    marginBottom: 2,
  },
  compVal: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  completedActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  reopenBtn: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reopenBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primaryDark,
  },
  emptyBatchCard: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 16,
  },
  emptyBatchTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptyBatchSub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 22,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  closeIcon: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textMuted,
    padding: 4,
  },
  errorBox: {
    backgroundColor: Colors.dangerLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 18,
  },
});
