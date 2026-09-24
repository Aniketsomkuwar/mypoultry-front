import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { IBGCCalculationCard } from '../../components/common/IBGCCalculationCard';
import { useAuth } from '../../context/AuthContext';
import { Api } from '../../services/api';

const PRESET_RATES = [7.5, 8.0, 8.5, 9.0, 10.0, 11.0, 12.0, 13.0, 14.75];

export const FarmEarningsScreen = ({ onNavigate, batchId }) => {
  const { farm, activeBatch } = useAuth();
  const currency = farm?.currency || '₹';

  const [batches, setBatches] = useState([]);
  const [currentId, setCurrentId] = useState(batchId || activeBatch?.id || 'active');
  const [settlement, setSettlement] = useState(null);
  const [shedCategory, setShedCategory] = useState('Parivartan EC');
  const [gcRate, setGcRate] = useState('');
  const [incentiveRate, setIncentiveRate] = useState('0.00');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadBatches = async () => {
    try {
      const res = await Api.getBatches();
      if (res && res.success) {
        setBatches(res.batches || []);
      }
    } catch (e) {
      console.warn('Could not load batches in earnings:', e.message);
    }
  };

  const loadSettlement = useCallback(async (idToLoad, customShedCat) => {
    setLoading(true);
    try {
      const target = idToLoad || currentId || 'active';
      const catToUse = customShedCat || shedCategory;
      const res = await Api.getBatchSettlement(target, {
        gcRate: gcRate !== '' ? parseFloat(gcRate) : undefined,
        incentiveRate: parseFloat(incentiveRate) || 0,
        shedCategory: catToUse,
      });

      if (res && res.success) {
        setSettlement(res.settlement);
        if (res.settlement?.shedCategory) {
          setShedCategory(res.settlement.shedCategory);
        }
        if (res.settlement?.rate?.growingChargeRate && !gcRate) {
          setGcRate(String(res.settlement.rate.growingChargeRate.toFixed(2)));
        }
      }
    } catch (err) {
      console.warn('Error loading farm earnings:', err.message);
    } finally {
      setLoading(false);
    }
  }, [currentId, gcRate, incentiveRate, shedCategory]);

  useEffect(() => {
    loadBatches();
    loadSettlement(currentId);
  }, [loadSettlement, currentId]);

  const handleSaveSettlement = async () => {
    setSaving(true);
    try {
      const res = await Api.saveBatchSettlement(currentId, {
        growingChargeRate: parseFloat(gcRate) || 8.5,
        incentiveRate: parseFloat(incentiveRate) || 0,
        shedCategory,
        settlementNotes: 'Contract settlement finalized with IB GC Policy',
      });
      if (res && res.success) {
        Alert.alert('Settlement Saved', 'Growing charge and net farm result updated.');
        await loadSettlement(currentId);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save settlement.');
    } finally {
      setSaving(false);
    }
  };

  const s = settlement || {};
  const perf = s.performance || {};
  const prod = s.production || {};
  const earn = s.earnings || {};
  const exp = s.expenses || {};
  const net = s.netResult || {};

  const isProfitable = net.netFarmResult >= 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSettlement} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.topTag}>CONTRACT FARMING SETTLEMENT</Text>
        <Text style={styles.title}>Growing Charge & Earnings</Text>
        <Text style={styles.batchSub}>
          {s.batchNumber || activeBatch?.ibBatchNumber || 'IB BATCH'}
        </Text>
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
                  loadSettlement(b._id);
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
                    { backgroundColor: b.status === 'ACTIVE' ? Colors.primary : '#64748B' },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Hero Net Result Card */}
      <Card
        style={[
          styles.heroNetCard,
          { borderColor: isProfitable ? '#86EFAC' : '#FCA5A5' },
        ]}
        accentColor={isProfitable ? Colors.primaryDark : Colors.danger}
      >
        <Text style={styles.heroNetPre}>NET FARM RESULT (PROFIT)</Text>
        <Text
          style={[
            styles.heroNetVal,
            { color: isProfitable ? Colors.primaryDark : Colors.danger },
          ]}
        >
          {isProfitable ? '+' : ''}
          {currency}
          {net.netFarmResult ? net.netFarmResult.toLocaleString() : '0'}
        </Text>

        <View style={styles.heroSubGrid}>
          <View style={styles.heroSubCol}>
            <Text style={styles.heroSubLabel}>Profit / Bird</Text>
            <Text style={styles.heroSubVal}>
              {currency}
              {net.profitPerBird ? net.profitPerBird.toFixed(2) : '0.00'}
            </Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroSubCol}>
            <Text style={styles.heroSubLabel}>Profit / KG</Text>
            <Text style={styles.heroSubVal}>
              {currency}
              {net.profitPerKg ? net.profitPerKg.toFixed(2) : '0.00'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Step-by-Step Flow Pipeline as requested */}
      <Text style={styles.pipelineTitle}>SETTLEMENT PIPELINE</Text>

      {/* 1. Batch Performance */}
      <Card style={styles.pipeCard}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumBadge}>
            <Text style={styles.stepNumText}>1</Text>
          </View>
          <Text style={styles.stepTitle}>BATCH PERFORMANCE</Text>
        </View>
        <View style={styles.stepBodyGrid}>
          <View style={styles.gridItem}>
            <Text style={styles.itemLabel}>Birds Placed</Text>
            <Text style={styles.itemVal}>
              {perf.birdsPlaced ? perf.birdsPlaced.toLocaleString() : '5,000'}
            </Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.itemLabel}>Birds Lifted</Text>
            <Text style={[styles.itemVal, { color: Colors.primary }]}>
              {perf.birdsLifted ? perf.birdsLifted.toLocaleString() : '4,820'}
            </Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.itemLabel}>Mortality</Text>
            <Text style={[styles.itemVal, { color: Colors.warning }]}>
              {perf.mortality !== undefined ? `${perf.mortality}%` : '3.60%'}
            </Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.itemLabel}>Final FCR</Text>
            <Text style={[styles.itemVal, { color: Colors.primaryDark }]}>
              {perf.finalFcr ? perf.finalFcr : '1.34'}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.flowArrow}>
        <Text style={styles.flowArrowText}>|</Text>
      </View>

      {/* 2. Production */}
      <Card style={styles.pipeCard}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumBadge}>
            <Text style={styles.stepNumText}>2</Text>
          </View>
          <Text style={styles.stepTitle}>PRODUCTION (LIVE WEIGHT)</Text>
        </View>
        <View style={styles.prodRow}>
          <View>
            <Text style={styles.prodBigNum}>
              {prod.totalLiveWeight ? prod.totalLiveWeight.toLocaleString() : '11,337'} KG
            </Text>
            <Text style={styles.prodSub}>
              {perf.birdsLifted ? perf.birdsLifted.toLocaleString() : '4,820'} birds @{' '}
              {perf.averageBodyWeight || 2.35} KG avg body weight
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.flowArrow}>
        <Text style={styles.flowArrowText}>|</Text>
      </View>

      {/* IB Group GC Policy Calculation Card */}
      <IBGCCalculationCard
        batchData={{
          chicksHoused: perf.birdsPlaced,
          totalDeaths: perf.totalDeaths,
          birdsLifted: perf.birdsLifted,
          totalLiftedWeight: prod.totalLiveWeight,
          actualFcr: perf.finalFcr,
          shedCategory: shedCategory,
        }}
        selectedCategory={shedCategory}
        onCategoryChange={(newCat) => {
          setShedCategory(newCat);
          loadSettlement(currentId, newCat);
        }}
        onApplyRate={(newRate) => {
          setGcRate(newRate.toFixed(2));
        }}
        currency={currency}
      />

      <View style={styles.flowArrow}>
        <Text style={styles.flowArrowText}>|</Text>
      </View>

      {/* 3. Growing Charge / Rate */}
      <Card style={styles.pipeCard}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumBadge}>
            <Text style={styles.stepNumText}>3</Text>
          </View>
          <Text style={styles.stepTitle}>GROWING CHARGE / RATE</Text>
        </View>

        {/* Rate Presets */}
        <Text style={styles.rateSub}>Quick Select Rate ({currency}/KG):</Text>
        <View style={styles.presetRow}>
          {PRESET_RATES.map((r) => {
            const isSelected = parseFloat(gcRate) === r;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => setGcRate(r.toFixed(2))}
                style={[styles.presetBtn, isSelected && styles.presetBtnActive]}
              >
                <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>
                  {currency}
                  {r.toFixed(2)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.customRateRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputMiniLabel}>Base GC Rate ({currency}/KG)</Text>
            <TextInput
              style={styles.rateInput}
              value={gcRate}
              onChangeText={setGcRate}
              keyboardType="decimal-pad"
              placeholder="8.50"
            />
          </View>
          <View style={{ width: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.inputMiniLabel}>Incentive / Bonus ({currency}/KG)</Text>
            <TextInput
              style={styles.rateInput}
              value={incentiveRate}
              onChangeText={setIncentiveRate}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>
        </View>

        <View style={styles.effectiveRateBanner}>
          <Text style={styles.effectiveRateLabel}>Effective Contractor Rate:</Text>
          <Text style={styles.effectiveRateVal}>
            {currency}
            {(parseFloat(gcRate || 0) + parseFloat(incentiveRate || 0)).toFixed(2)} / KG
          </Text>
        </View>
      </Card>

      <View style={styles.flowArrow}>
        <Text style={styles.flowArrowText}>|</Text>
      </View>

      {/* 4. Estimated Earnings */}
      <Card style={styles.pipeCard}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumBadge}>
            <Text style={styles.stepNumText}>4</Text>
          </View>
          <Text style={styles.stepTitle}>ESTIMATED GROSS EARNINGS</Text>
        </View>

        <View style={styles.earnBox}>
          <Text style={styles.earnBigVal}>
            {currency}
            {earn.grossEarnings ? earn.grossEarnings.toLocaleString() : '96,364.50'}
          </Text>
          <Text style={styles.earnFormula}>
            {prod.totalLiveWeight ? prod.totalLiveWeight.toLocaleString() : '11,337'} KG x{' '}
            {currency}
            {(parseFloat(gcRate || 0) + parseFloat(incentiveRate || 0)).toFixed(2)} / KG
          </Text>
        </View>
      </Card>

      <View style={styles.flowArrow}>
        <Text style={styles.flowArrowText}>-</Text>
      </View>

      {/* 5. Expenses */}
      <Card style={styles.pipeCard}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepNumBadge, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.stepNumText, { color: Colors.danger }]}>5</Text>
          </View>
          <Text style={styles.stepTitle}>FARM PRODUCTION EXPENSES</Text>
        </View>

        <View style={styles.expBox}>
          <Text style={[styles.earnBigVal, { color: Colors.danger }]}>
            {currency}
            {exp.totalExpenses ? exp.totalExpenses.toLocaleString() : '34,000'}
          </Text>
          <Text style={styles.expSub}>Actual operational costs logged for this batch</Text>

          {exp.breakdown && Object.keys(exp.breakdown).length > 0 ? (
            <View style={styles.expBreakdownList}>
              {Object.entries(exp.breakdown).map(([cat, amt]) => (
                <View key={cat} style={styles.expRow}>
                  <Text style={styles.expCat}>{cat}</Text>
                  <Text style={styles.expAmt}>
                    {currency}
                    {amt.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Card>

      <View style={styles.flowArrow}>
        <Text style={styles.flowArrowText}>=</Text>
      </View>

      {/* 6. Net Farm Result */}
      <Card
        style={[
          styles.pipeCard,
          { backgroundColor: isProfitable ? Colors.successLight : '#FEF2F2' },
        ]}
      >
        <View style={styles.stepHeader}>
          <View
            style={[
              styles.stepNumBadge,
              { backgroundColor: isProfitable ? Colors.primaryLight : '#FEE2E2' },
            ]}
          >
            <Text
              style={[
                styles.stepNumText,
                { color: isProfitable ? Colors.primary : Colors.danger },
              ]}
            >
              6
            </Text>
          </View>
          <Text style={styles.stepTitle}>NET FARM RESULT</Text>
        </View>

        <View style={styles.netSummaryBox}>
          <Text
            style={[
              styles.netSummaryBig,
              { color: isProfitable ? Colors.primary : Colors.danger },
            ]}
          >
            {isProfitable ? '+' : ''}
            {currency}
            {net.netFarmResult ? net.netFarmResult.toLocaleString() : '62,364.50'}
          </Text>
          <Text style={styles.netSummarySub}>
            Gross Earnings ({currency}
            {earn.grossEarnings?.toLocaleString() || 0}) - Expenses ({currency}
            {exp.totalExpenses?.toLocaleString() || 0})
          </Text>
        </View>
      </Card>

      {/* Action Buttons */}
      <Button
        title="SAVE SETTLEMENT FIGURES"
        variant="primary"
        loading={saving}
        onPress={handleSaveSettlement}
        style={styles.saveBtn}
      />

      <Button
        title="VIEW BATCH PERFORMANCE"
        variant="secondary"
        onPress={() => onNavigate && onNavigate('Performance')}
        style={styles.navBtn}
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
    paddingTop: 12,
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
  },
  batchSub: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMuted,
    marginTop: 2,
  },
  heroNetCard: {
    padding: 20,
    marginVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  heroNetPre: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  heroNetVal: {
    fontSize: 38,
    fontWeight: '900',
    marginVertical: 6,
  },
  heroSubGrid: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    width: '100%',
  },
  heroSubCol: {
    flex: 1,
    alignItems: 'center',
  },
  heroDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  heroSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  heroSubVal: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  pipelineTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 8,
  },
  pipeCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  stepNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.primary,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  stepBodyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 10,
  },
  gridItem: {
    width: '50%',
    paddingVertical: 6,
  },
  itemLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  itemVal: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  flowArrow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  flowArrowText: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textMuted,
  },
  prodRow: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  prodBigNum: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  prodSub: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  rateSub: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.cardAlt,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetBtnActive: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.primary,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  presetTextActive: {
    color: Colors.primaryDark,
    fontWeight: '900',
  },
  customRateRow: {
    flexDirection: 'row',
  },
  inputMiniLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  rateInput: {
    backgroundColor: Colors.cardAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  effectiveRateBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.successLight,
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  effectiveRateLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  effectiveRateVal: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.primaryDark,
  },
  earnBox: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  earnBigVal: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.primaryDark,
  },
  earnFormula: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 4,
  },
  expBox: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  expSub: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 8,
  },
  expBreakdownList: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
  },
  expRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  expCat: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  expAmt: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  netSummaryBox: {
    padding: 14,
    alignItems: 'center',
  },
  netSummaryBig: {
    fontSize: 32,
    fontWeight: '900',
  },
  netSummarySub: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  batchSelectorScroll: {
    marginBottom: 12,
  },
  batchSelectorContent: {
    paddingVertical: 4,
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
  saveBtn: {
    marginTop: 20,
    minHeight: 52,
  },
  navBtn: {
    marginTop: 10,
    minHeight: 48,
  },
});
