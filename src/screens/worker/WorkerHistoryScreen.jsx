import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { Api } from '../../services/api';

export const WorkerHistoryScreen = ({ onNavigate }) => {
  const { activeBatch } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Api.getDailyRecords(activeBatch?.id);
      if (res && res.success) {
        setRecords(res.records || []);
      }
    } catch (e) {
      console.warn('Could not load worker history:', e.message);
    } finally {
      setLoading(false);
    }
  }, [activeBatch]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableCol, styles.colDate]}>Date</Text>
      <Text style={[styles.tableCol, styles.colNum]}>Birds</Text>
      <Text style={[styles.tableCol, styles.colNum]}>Dead</Text>
      <Text style={[styles.tableCol, styles.colNum]}>Feed</Text>
      <Text style={[styles.tableCol, styles.colNum]}>Mort.</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const formattedDate = new Date(item.date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });

    return (
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, styles.colDate]}>{formattedDate}</Text>
        <Text style={[styles.tableCell, styles.colNum]}>{item.birdCount}</Text>
        <Text style={[styles.tableCell, styles.colNum, { color: Colors.danger }]}>{item.deaths}</Text>
        <Text style={[styles.tableCell, styles.colNum, { color: Colors.info }]}>{item.feedUsed}</Text>
        <Text style={[styles.tableCell, styles.colNum, { color: Colors.warningDark }]}>{item.mortality}%</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>RECORD HISTORY</Text>
        <Text style={styles.subtitle}>{activeBatch?.name || 'Current Batch'}</Text>
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item._id || item.date}
        renderItem={renderItem}
        ListHeaderComponent={records.length > 0 ? renderTableHeader : null}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadHistory} />}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              title="No records yet"
              message="No daily logs have been submitted for this batch yet."
              actionTitle="Add Today's Data"
              onAction={() => onNavigate('TodayEntry')}
            />
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: Colors.card,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableCol: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
  },
  tableCell: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  colDate: {
    flex: 1.5,
  },
  colNum: {
    flex: 1,
    textAlign: 'right',
  },
});
