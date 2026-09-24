import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Button } from './Button';
import { Input } from './Input';
import { Api } from '../../services/api';
import { calculateIBGC, SHED_CATEGORIES } from '../../services/ibGCPolicyService';

export const BatchClosingModal = ({
  visible,
  onClose,
  onSuccess,
  batch,
  stats,
}) => {
  const birdsPlaced = batch?.chicksReceived || batch?.initialBirdCount || 0;
  const initialDeaths = stats?.totalDeaths || 0;
  const initialFeed = stats?.totalFeedUsed || 0;

  const [birdsLifted, setBirdsLifted] = useState(
    String(Math.max(0, birdsPlaced - initialDeaths))
  );
  const [averageBodyWeight, setAverageBodyWeight] = useState('2.35');
  const [totalLiveWeight, setTotalLiveWeight] = useState('');
  const [totalFeedConsumed, setTotalFeedConsumed] = useState(String(initialFeed));
  const [shedCategory, setShedCategory] = useState(
    batch?.shedCategory || 'Parivartan EC'
  );
  const [liftingDate, setLiftingDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [completionNotes, setCompletionNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Keep state updated when modal opens with fresh stats
  useEffect(() => {
    if (visible) {
      const remaining = Math.max(0, birdsPlaced - (stats?.totalDeaths || 0));
      setBirdsLifted(String(remaining));
      if (stats?.totalFeedUsed) {
        setTotalFeedConsumed(String(stats.totalFeedUsed));
      }
      if (batch?.shedCategory) {
        setShedCategory(batch.shedCategory);
      }
    }
  }, [visible, birdsPlaced, stats, batch]);

  // Dynamic calculations
  const liftedNum = parseInt(birdsLifted, 10) || 0;
  const totalDeathsNum = Math.max(0, birdsPlaced - liftedNum);
  const finalMortalityNum =
    birdsPlaced > 0 ? ((totalDeathsNum / birdsPlaced) * 100).toFixed(2) : '0.00';

  const avgWeightNum = parseFloat(averageBodyWeight) || 0;
  const liveWeightComputed =
    liftedNum > 0 && avgWeightNum > 0 ? (liftedNum * avgWeightNum).toFixed(1) : '0';
  const effectiveLiveWeight = totalLiveWeight
    ? parseFloat(totalLiveWeight) || 0
    : parseFloat(liveWeightComputed) || 0;

  const feedNum = parseFloat(totalFeedConsumed) || initialFeed || 0;
  const finalFcrComputed =
    effectiveLiveWeight > 0 ? (feedNum / effectiveLiveWeight).toFixed(2) : '0.00';

  const gcPreview = calculateIBGC({
    chicksHoused: birdsPlaced,
    totalDeaths: totalDeathsNum,
    birdsLifted: liftedNum,
    totalLiftedWeight: effectiveLiveWeight,
    actualFcr: parseFloat(finalFcrComputed) || 0,
    shedCategory,
  });

  const handleCloseBatch = async () => {
    if (liftedNum <= 0) {
      setErrorMsg('Please enter a valid count of birds lifted/sold.');
      return;
    }
    if (avgWeightNum <= 0 && (!totalLiveWeight || parseFloat(totalLiveWeight) <= 0)) {
      setErrorMsg('Average body weight or total live weight is required.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await Api.closeBatchWithLifting(batch.id || batch._id, {
        birdsLifted: liftedNum,
        averageBodyWeight: avgWeightNum,
        totalLiveWeight: effectiveLiveWeight,
        liftingDate,
        completionNotes: completionNotes.trim(),
        shedCategory,
      });

      if (res && res.success) {
        if (onSuccess) onSuccess(res.performance || res.batch);
        onClose();
      } else {
        setErrorMsg(res?.message || 'Failed to complete batch.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error processing batch closing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <ScrollView style={[styles.modalContent, { padding: 0 }]} contentContainerStyle={{ padding: 22 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.badgeText}>FINAL FLOCK LIFTING</Text>
              <Text style={styles.modalTitle}>Batch Closing</Text>
              <Text style={styles.batchSub}>
                {batch?.ibBatchNumber || batch?.name || 'IB BATCH'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>

          {/* Flow Indicator: ACTIVE -> BATCH COMPLETED */}
          <View style={styles.transitionBox}>
            <View style={styles.stepActive}>
              <Text style={styles.stepActiveText}>ACTIVE</Text>
            </View>
            <Text style={styles.arrowIcon}>TO</Text>
            <View style={styles.stepComplete}>
              <Text style={styles.stepCompleteText}>BATCH COMPLETED</Text>
            </View>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Key Calculated Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Birds Placed:</Text>
              <Text style={styles.sumVal}>{birdsPlaced.toLocaleString()} Birds</Text>
            </View>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Total Deaths:</Text>
              <Text style={[styles.sumVal, { color: Colors.danger }]}>
                {totalDeathsNum.toLocaleString()}
              </Text>
            </View>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Final Mortality:</Text>
              <Text style={[styles.sumVal, { color: Colors.warning }]}>
                {finalMortalityNum}%
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Total Live Weight:</Text>
              <Text style={[styles.sumVal, { color: Colors.primary }]}>
                {effectiveLiveWeight.toLocaleString()} KG
              </Text>
            </View>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Final FCR:</Text>
              <Text style={[styles.sumVal, { color: Colors.primaryDark, fontWeight: '900' }]}>
                {finalFcrComputed}
              </Text>
            </View>
            {gcPreview.isValid && (
              <>
                <View style={styles.divider} />
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>IB GC Rate ({shedCategory}):</Text>
                  <Text style={[styles.sumVal, { color: Colors.primaryDark, fontWeight: '900' }]}>
                    INR {gcPreview.gcRatePerKg.toFixed(2)} / KG
                  </Text>
                </View>
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>Estimated GC Payout:</Text>
                  <Text style={[styles.sumVal, { color: Colors.success, fontWeight: '900' }]}>
                    INR {Math.round(gcPreview.estimatedGc).toLocaleString('en-IN')}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Shed Category Selector */}
          <View style={styles.shedSection}>
            <Text style={styles.shedSectionLabel}>IB EC SHED CATEGORY</Text>
            <View style={styles.shedPillRow}>
              {SHED_CATEGORIES.map((cat) => {
                const isSelected = shedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    accessibilityRole="button"
                    accessibilityLabel={`Select shed category ${cat}`}
                    accessibilityState={{ selected: isSelected }}
                    style={[styles.shedPill, isSelected && styles.shedPillSelected]}
                    onPress={() => setShedCategory(cat)}
                  >
                    <Text style={[styles.shedPillText, isSelected && styles.shedPillTextSelected]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Form Inputs */}
          <Input
            label="Birds Lifted (Sold / Harvested)"
            value={birdsLifted}
            onChangeText={setBirdsLifted}
            keyboardType="numeric"
            helperText="Number of live birds loaded into buyer transport"
          />

          <Input
            label="Average Body Weight (KG)"
            value={averageBodyWeight}
            onChangeText={setAverageBodyWeight}
            keyboardType="decimal-pad"
            placeholder="e.g. 2.35"
            helperText="Average weight per bird at lifting"
          />

          <Input
            label="Total Live Weight (Optional Override - KG)"
            value={totalLiveWeight}
            onChangeText={setTotalLiveWeight}
            keyboardType="decimal-pad"
            placeholder={`Calculated: ${liveWeightComputed} KG`}
            helperText="Total scale weight from buyer receipt (leave blank to auto-compute)"
          />

          <Input
            label="Total Feed Consumed (KG)"
            value={totalFeedConsumed}
            onChangeText={setTotalFeedConsumed}
            keyboardType="decimal-pad"
            helperText="Total cumulative feed used during the batch"
          />

          <Input
            label="Lifting Date"
            value={liftingDate}
            onChangeText={setLiftingDate}
            placeholder="YYYY-MM-DD"
            helperText="Date of final flock lifting"
          />

          <Input
            label="Completion Notes (Optional)"
            value={completionNotes}
            onChangeText={setCompletionNotes}
            placeholder="e.g. Buyer company, vehicle numbers, settlement notes"
            multiline
            numberOfLines={2}
          />

          <View style={styles.btnRow}>
            <Button
              title="CANCEL"
              variant="secondary"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <View style={{ width: 10 }} />
            <Button
              title="CLOSE & COMPLETE"
              loading={loading}
              onPress={handleCloseBatch}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: 22,
    maxHeight: '94%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  batchSub: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textMuted,
  },
  transitionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  stepActive: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stepActiveText: {
    color: '#0369A1',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  arrowIcon: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.textMuted,
  },
  stepComplete: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stepCompleteText: {
    color: Colors.primary,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  errorBox: {
    backgroundColor: Colors.dangerLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sumLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  sumVal: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 6,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 18,
    marginBottom: 10,
  },
  shedSection: {
    marginBottom: 14,
  },
  shedSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  shedPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  shedPill: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  shedPillSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: Colors.primary,
  },
  shedPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  shedPillTextSelected: {
    color: Colors.primaryDark,
    fontWeight: '900',
  },
});
