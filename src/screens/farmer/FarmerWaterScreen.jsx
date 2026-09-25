import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { Api } from '../../services/api';

const screenWidth = Dimensions.get('window').width;

export const FarmerWaterScreen = () => {
  const { activeBatch } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeBatch) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await Api.getBatchHealth(activeBatch._id || activeBatch.id);
      if (res && res.success) {
        setStats(res.health);
      }
    } catch (e) {
      console.warn('Error loading water stats:', e.message);
    } finally {
      setLoading(false);
    }
  }, [activeBatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const waterTrends = stats?.waterTrends || [];
  const hasWaterData = waterTrends.length > 0;

  // Prepare chart data
  const labels = waterTrends.map(w => w.displayDate);
  const dataPoints = waterTrends.map(w => w.waterUsed);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
    >
      <View style={styles.header}>
        <Text style={styles.topTag}>FLOCK CONSUMPTION</Text>
        <Text style={styles.title}>Water Tracking</Text>
        <Text style={styles.subtitle}>
          {activeBatch?.ibBatchNumber || activeBatch?.name || 'No Active Batch'}
        </Text>
      </View>

      {!activeBatch ? (
        <EmptyState
          title="No Active Batch"
          message="Start a new batch to track daily water consumption."
        />
      ) : !hasWaterData ? (
        <EmptyState
          title="No Water Records"
          message="No water consumption logs found. Log water usage in Daily Records to see trends here."
        />
      ) : (
        <>
          {/* Summary Cards */}
          <View style={styles.summaryGrid}>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>TODAY'S USAGE</Text>
              <Text style={styles.summaryVal}>
                {stats.todayWater !== null ? `${stats.todayWater} L` : '--'}
              </Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>7-DAY AVG</Text>
              <Text style={styles.summaryVal}>
                {stats.trailingWaterAvg !== null ? `${stats.trailingWaterAvg} L` : '--'}
              </Text>
            </Card>
          </View>

          {/* Chart */}
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Consumption Trend (Liters)</Text>
            <View style={styles.chartContainer}>
              <LineChart
                data={{
                  labels: labels.length > 0 ? labels : ['No Data'],
                  datasets: [
                    {
                      data: dataPoints.length > 0 ? dataPoints : [0],
                    },
                  ],
                }}
                width={screenWidth - 72} // Padding
                height={220}
                yAxisSuffix="L"
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`, // Info color (blue) for water
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: Colors.info,
                  },
                }}
                bezier
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                }}
              />
            </View>
          </Card>
          
          {/* Hint if abnormal */}
          {stats.todayWater !== null && stats.trailingWaterAvg !== null && stats.todayWater > (stats.trailingWaterAvg * 1.5) && (
            <View style={styles.abnormalHintBox}>
              <Text style={styles.hintTitle}>⚠️ Abnormal Consumption Detected</Text>
              <Text style={styles.hintDesc}>
                Today's water usage ({stats.todayWater}L) is significantly higher than the 7-day average ({stats.trailingWaterAvg}L). Please check for leaks or health issues.
              </Text>
            </View>
          )}

          {stats.todayWater !== null && stats.trailingWaterAvg !== null && stats.todayWater < (stats.trailingWaterAvg * 0.5) && (
            <View style={styles.abnormalHintBox}>
              <Text style={styles.hintTitle}>⚠️ Low Consumption Detected</Text>
              <Text style={styles.hintDesc}>
                Today's water usage ({stats.todayWater}L) is unusually low compared to the 7-day average ({stats.trailingWaterAvg}L). Ensure the water line is functioning.
              </Text>
            </View>
          )}
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
    paddingBottom: 40,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  topTag: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.info,
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMuted,
    marginTop: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryVal: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.info,
  },
  chartCard: {
    padding: 16,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  chartContainer: {
    alignItems: 'center',
    marginLeft: -10,
  },
  abnormalHintBox: {
    backgroundColor: Colors.warningLight,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    marginTop: 10,
  },
  hintTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.warningDark,
    marginBottom: 6,
  },
  hintDesc: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
});
