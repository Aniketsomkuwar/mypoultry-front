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
import { StatCard } from '../../components/common/StatCard';
import { useAuth } from '../../context/AuthContext';
import { Api } from '../../services/api';

import { BatchPerformanceScreen } from './BatchPerformanceScreen';

const PERIOD_FILTERS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Last 7 Days' },
  { id: 'month', label: 'This Month' },
  { id: 'batch', label: 'Entire Batch' },
];

export const FarmerReportsScreen = ({ onNavigate }) => {
  const { farm, activeBatch } = useAuth();
  const currency = farm?.currency || '₹';

  const [activeView, setActiveView] = useState('performance'); // 'reports' or 'performance'
  const [period, setPeriod] = useState('batch');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Api.getReports(period, activeBatch?.id);
      if (res && res.success) {
        setReport(res);
      }
    } catch (e) {
      console.warn('Report load error:', e.message);
    } finally {
      setLoading(false);
    }
  }, [period, activeBatch]);

  useEffect(() => {
    if (activeView === 'reports') {
      loadReport();
    }
  }, [loadReport, activeView]);

  if (activeView === 'performance') {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        {/* Top View Switcher */}
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity
            onPress={() => setActiveView('performance')}
            style={[styles.viewToggleBtn, styles.viewToggleBtnActive]}
          >
            <Text style={[styles.viewToggleText, styles.viewToggleTextActive]}>
              BATCH PERFORMANCE
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveView('reports')}
            style={styles.viewToggleBtn}
          >
            <Text style={styles.viewToggleText}>DAILY TRENDS</Text>
          </TouchableOpacity>
        </View>

        <BatchPerformanceScreen onNavigate={onNavigate} />
      </View>
    );
  }

  const summary = report?.summary || {};
  const trends = report?.trends || [];

  // Determine max values for relative bar chart scaling
  const maxDeaths = Math.max(...trends.map((t) => t.deaths || 0), 1);
  const maxFeed = Math.max(...trends.map((t) => t.feedUsed || 0), 1);
  const maxExpense = Math.max(...trends.map((t) => t.expense || 0), 1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadReport} />}
    >
      {/* Top View Switcher */}
      <View style={styles.viewToggleContainer}>
        <TouchableOpacity
          onPress={() => setActiveView('performance')}
          style={styles.viewToggleBtn}
        >
          <Text style={styles.viewToggleText}>BATCH PERFORMANCE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveView('reports')}
          style={[styles.viewToggleBtn, styles.viewToggleBtnActive]}
        >
          <Text style={[styles.viewToggleText, styles.viewToggleTextActive]}>
            DAILY TRENDS
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>FARM REPORTS</Text>
        <Text style={styles.subtitle}>{activeBatch?.name || 'Production Overview'}</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {PERIOD_FILTERS.map((f) => {
          const isSelected = period === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setPeriod(f.id)}
              style={[styles.filterBtn, isSelected && styles.filterBtnActive]}
            >
              <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Summary Stat Cards */}
      <View style={styles.summaryGrid}>
        <StatCard
          label="TOTAL BIRDS"
          value={summary.currentBirds?.toLocaleString() || '--'}
          variant="default"
          subtext={`Started with ${summary.initialBirds?.toLocaleString() || 0}`}
        />

        <StatCard
          label="TOTAL DEATHS"
          value={summary.totalDeaths || 0}
          variant="danger"
          subtext="Birds lost in selected period"
        />

        <StatCard
          label="OVERALL MORTALITY"
          value={summary.overallMortality !== undefined ? `${summary.overallMortality}%` : '--'}
          variant="warning"
          subtext="Mortality percentage"
        />

        <StatCard
          label="TOTAL FEED USED"
          value={summary.totalFeedUsed?.toLocaleString() || 0}
          unit="KG"
          variant="info"
          subtext="Feed consumed"
        />

        <StatCard
          label="AVERAGE FCR"
          value={summary.averageFcr ? summary.averageFcr : '--'}
          variant="default"
          subtext="Feed Conversion Ratio"
        />

        <StatCard
          label="TOTAL EXPENSES"
          value={`${currency}${summary.totalExpenses?.toLocaleString() || 0}`}
          variant="warning"
          subtext="Cost in selected period"
        />
      </View>

      {/* Simple Visual Trend: Daily Deaths */}
      {trends.length > 0 ? (
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>DEATHS TREND</Text>
          <Text style={styles.chartSub}>Daily mortality count</Text>

          <View style={styles.barList}>
            {trends.slice(-7).map((item, idx) => {
              const heightPercent = Math.max(12, Math.round((item.deaths / maxDeaths) * 100));
              return (
                <View key={idx} style={styles.barCol}>
                  <Text style={styles.barTopNum}>{item.deaths}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${heightPercent}%`, backgroundColor: Colors.danger },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{item.displayDate}</Text>
                </View>
              );
            })}
          </View>
        </Card>
      ) : null}

      {/* Simple Visual Trend: Feed Consumption */}
      {trends.length > 0 ? (
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>FEED USAGE</Text>
          <Text style={styles.chartSub}>Daily feed consumption (KG)</Text>

          <View style={styles.barList}>
            {trends.slice(-7).map((item, idx) => {
              const heightPercent = Math.max(12, Math.round((item.feedUsed / maxFeed) * 100));
              return (
                <View key={idx} style={styles.barCol}>
                  <Text style={styles.barTopNum}>{item.feedUsed}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${heightPercent}%`, backgroundColor: Colors.info },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{item.displayDate}</Text>
                </View>
              );
            })}
          </View>
        </Card>
      ) : null}

      {/* Simple Visual Trend: Expenses */}
      {trends.some((t) => t.expense > 0) ? (
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>DAILY EXPENSES</Text>
          <Text style={styles.chartSub}>Daily purchase cost in {currency}</Text>

          <View style={styles.barList}>
            {trends.slice(-7).map((item, idx) => {
              const heightPercent = item.expense > 0
                ? Math.max(12, Math.round((item.expense / maxExpense) * 100))
                : 0;
              return (
                <View key={idx} style={styles.barCol}>
                  <Text style={styles.barTopNum}>
                    {item.expense > 0 ? `${Math.round(item.expense / 1000)}k` : '0'}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${heightPercent}%`, backgroundColor: Colors.warning },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{item.displayDate}</Text>
                </View>
              );
            })}
          </View>
        </Card>
      ) : null}
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
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: Colors.cardAlt,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterBtnActive: {
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  filterTextActive: {
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  summaryGrid: {
    gap: 6,
  },
  chartCard: {
    marginTop: 18,
    padding: 18,
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
    marginBottom: 16,
  },
  barList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 10,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTopNum: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  barTrack: {
    width: 24,
    height: 90,
    backgroundColor: Colors.cardAlt,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 6,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: 14,
    padding: 4,
    marginVertical: 12,
    marginHorizontal: 16,
  },
  viewToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  viewToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  viewToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  viewToggleTextActive: {
    color: Colors.primaryDark,
    fontWeight: '900',
  },
});
