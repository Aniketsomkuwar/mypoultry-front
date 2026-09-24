import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../theme/colors';
import { Card } from './Card';
import { calculateIBGC, SHED_CATEGORIES, GC_POLICY_VERSION } from '../../services/ibGCPolicyService';

export const IBGCCalculationCard = ({
  batchData,
  selectedCategory,
  onCategoryChange,
  onApplyRate,
  currency = '₹',
}) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const activeShedCategory = selectedCategory || batchData?.shedCategory || 'Parivartan EC';

  const gcResult = calculateIBGC({
    ...batchData,
    shedCategory: activeShedCategory,
  });

  return (
    <Card style={styles.card} accentColor={Colors.primary}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.badgeRow}>
            <View style={styles.policyBadge}>
              <Text style={styles.policyBadgeText}>EC SHED POLICY</Text>
            </View>
            <Text style={styles.versionText}>{GC_POLICY_VERSION}</Text>
          </View>
          <Text style={styles.title}>IB GC CALCULATION</Text>
        </View>
      </View>

      {/* Shed Category Selector */}
      <Text style={styles.fieldLabel}>SHED CATEGORY</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {SHED_CATEGORIES.map((cat) => {
          const isSelected = activeShedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              accessibilityRole="button"
              accessibilityLabel={`Select shed category ${cat}`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onCategoryChange && onCategoryChange(cat)}
              style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
            >
              <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Incomplete Data Validation Guard */}
      {!gcResult.isValid ? (
        <View style={styles.incompleteBox}>
          <Text style={styles.incompleteTitle}>Incomplete Batch Data</Text>
          <Text style={styles.incompleteMessage}>
            GC calculation requires complete batch data.
          </Text>
          <Text style={styles.incompleteSub}>
            Ensure Chicks Housed, Birds Lifted, Total Lifted Weight, and Actual FCR are recorded.
          </Text>
        </View>
      ) : (
        <View>
          {/* Main Key Figures Grid */}
          <View style={styles.grid}>
            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Chicks Housed</Text>
                <Text style={styles.val}>{gcResult.chicksHoused.toLocaleString()}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Birds Lifted</Text>
                <Text style={[styles.val, { color: Colors.primaryDark }]}>
                  {gcResult.birdsLifted.toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={styles.gridDivider} />

            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Total Lifted Weight</Text>
                <Text style={styles.val}>{gcResult.totalLiftedWeight.toLocaleString()} KG</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Mortality</Text>
                <Text style={[styles.val, { color: Colors.warningDark }]}>
                  {gcResult.mortalityPercentage.toFixed(2)}%
                </Text>
              </View>
            </View>

            <View style={styles.gridDivider} />

            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>CBW</Text>
                <Text style={styles.val}>{gcResult.cbw.toFixed(2)} KG</Text>
                <Text style={styles.subNote}>
                  {gcResult.cbwMethod === 'RULE_1_MORTALITY_LE_5' ? 'Rule 1 (M% <= 5%)' : 'Rule 2 (M% > 5%)'}
                </Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>FCR</Text>
                <Text style={styles.val}>{gcResult.actualFcr.toFixed(2)}</Text>
                <Text style={styles.subNote}>Actual batch</Text>
              </View>
            </View>

            <View style={styles.gridDivider} />

            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Corrected FCR</Text>
                <Text style={[styles.val, { color: Colors.primaryDark }]}>
                  {gcResult.correctedFcr.toFixed(4)}
                </Text>
                <Text style={styles.subNote}>cFCR payout basis</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Shed Category</Text>
                <Text style={styles.val}>{gcResult.shedCategory}</Text>
                <Text style={styles.subNote}>{gcResult.slabDescription}</Text>
              </View>
            </View>
          </View>

          {/* Rate & Estimated GC Hero Banner */}
          <View style={styles.heroPayoutCard}>
            <View style={styles.heroRow}>
              <View>
                <Text style={styles.heroRateLabel}>GC RATE</Text>
                <Text style={styles.heroRateVal}>
                  {currency}{gcResult.gcRatePerKg.toFixed(2)} / KG
                </Text>
              </View>
              <View style={styles.heroDividerV} />
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.heroGcLabel}>ESTIMATED GC</Text>
                <Text style={styles.heroGcVal}>
                  {currency}{gcResult.estimatedGc.toLocaleString()}
                </Text>
              </View>
            </View>

            {onApplyRate ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Apply rate of ${currency}${gcResult.gcRatePerKg.toFixed(2)} per KG to settlement`}
                onPress={() => onApplyRate(gcResult.gcRatePerKg)}
                style={styles.applyRateBtn}
              >
                <Text style={styles.applyRateText}>
                  APPLY {currency}{gcResult.gcRatePerKg.toFixed(2)} TO SETTLEMENT
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Toggle Calculation Breakdown */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={showBreakdown ? 'Hide calculation breakdown' : 'View calculation breakdown'}
            accessibilityState={{ expanded: showBreakdown }}
            onPress={() => setShowBreakdown(!showBreakdown)}
            style={styles.toggleBreakdownBtn}
          >
            <Text style={styles.toggleBreakdownText}>
              {showBreakdown ? 'HIDE CALCULATION BREAKDOWN [-]' : 'VIEW CALCULATION BREAKDOWN [+]'}
            </Text>
          </TouchableOpacity>

          {showBreakdown && gcResult.breakdown ? (
            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownTitle}>STEP-BY-STEP CALCULATION DETAILS</Text>

              {/* Step 1: Mortality */}
              <View style={styles.stepItem}>
                <Text style={styles.stepName}>1. Mortality Percentage</Text>
                <Text style={styles.stepFormula}>Formula: Deaths ÷ Chicks Housed × 100</Text>
                <Text style={styles.stepMath}>
                  Calculation: ({gcResult.totalDeaths} ÷ {gcResult.chicksHoused}) × 100 = {gcResult.mortalityPercentage.toFixed(2)}%
                </Text>
              </View>

              {/* Step 2: CBW */}
              <View style={styles.stepItem}>
                <Text style={styles.stepName}>2. Corrected Body Weight (CBW)</Text>
                <Text style={styles.stepFormula}>
                  {gcResult.cbwMethod === 'RULE_1_MORTALITY_LE_5'
                    ? 'Rule 1 (M% <= 5%): Total Lifted Weight ÷ Lifted Birds'
                    : 'Rule 2 (M% > 5%): Total Lifted Weight ÷ (Chicks Housed × 0.95)'}
                </Text>
                <Text style={styles.stepMath}>
                  Calculation: {gcResult.totalLiftedWeight.toLocaleString()} KG ÷ {gcResult.cbwDenominator.toLocaleString()} = {gcResult.cbw.toFixed(4)} KG
                </Text>
              </View>

              {/* Step 3: cFCR */}
              <View style={styles.stepItem}>
                <Text style={styles.stepName}>3. Corrected FCR (cFCR)</Text>
                <Text style={styles.stepFormula}>Formula: (2 - CBW) × 0.25 + FCR</Text>
                <Text style={styles.stepMath}>
                  Calculation: (2 - {gcResult.cbw.toFixed(4)}) × 0.25 + {gcResult.actualFcr.toFixed(3)} = {gcResult.correctedFcr.toFixed(4)}
                </Text>
              </View>

              {/* Step 4: GC Slab Rate */}
              <View style={styles.stepItem}>
                <Text style={styles.stepName}>4. GC Slab Rate</Text>
                <Text style={styles.stepFormula}>
                  Slab: {gcResult.slabDescription} | Category: {gcResult.shedCategory}
                </Text>
                <Text style={styles.stepMath}>
                  Rate: {currency}{gcResult.gcRatePerKg.toFixed(2)} per KG
                </Text>
              </View>

              {/* Step 5: Estimated GC */}
              <View style={styles.stepItem}>
                <Text style={styles.stepName}>5. Estimated GC Payout</Text>
                <Text style={styles.stepFormula}>Formula: Total Lifted Weight × GC Rate</Text>
                <Text style={styles.stepMath}>
                  Calculation: {gcResult.totalLiftedWeight.toLocaleString()} KG × {currency}{gcResult.gcRatePerKg.toFixed(2)} = {currency}{gcResult.estimatedGc.toLocaleString()}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  policyBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  policyBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.primaryDark,
    letterSpacing: 0.6,
  },
  versionText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  categoryScroll: {
    paddingBottom: 12,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  categoryPillActive: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.primary,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  categoryTextActive: {
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  incompleteBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  incompleteTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 4,
  },
  incompleteMessage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B91C1C',
    textAlign: 'center',
    marginBottom: 4,
  },
  incompleteSub: {
    fontSize: 12,
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 16,
  },
  grid: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 10,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  gridItem: {
    flex: 1,
  },
  gridDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  val: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  subNote: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 1,
  },
  heroPayoutCard: {
    backgroundColor: Colors.successLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    marginTop: 6,
    marginBottom: 10,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroRateLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 0.5,
  },
  heroRateVal: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primaryDark,
    marginTop: 2,
  },
  heroDividerV: {
    width: 1.5,
    height: 36,
    backgroundColor: '#86EFAC',
  },
  heroGcLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 0.5,
  },
  heroGcVal: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.primaryDark,
    marginTop: 2,
  },
  applyRateBtn: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  applyRateText: {
    color: Colors.textWhite,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  toggleBreakdownBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 4,
  },
  toggleBreakdownText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 0.5,
  },
  breakdownBox: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  stepItem: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 8,
  },
  stepName: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  stepFormula: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  stepMath: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
});
