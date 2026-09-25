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
import { useAuth } from '../../context/AuthContext';
import { Api } from '../../services/api';

export const FarmerTimelineScreen = ({ onNavigate }) => {
  const { farm, activeBatch } = useAuth();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeBatch) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await Api.getBatchTimeline(activeBatch._id || activeBatch.id);
      if (res && res.success) {
        setTimeline(res.timeline || []);
      }
    } catch (e) {
      console.warn('Error loading timeline:', e.message);
    } finally {
      setLoading(false);
    }
  }, [activeBatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderIcon = (type) => {
    switch (type) {
      case 'START': return 'IN';
      case 'DAILY': return 'DR';
      case 'WEIGHT': return 'WT';
      case 'SUPPLY': return 'SP';
      case 'EXPENSE': return 'EX';
      case 'END': return 'OUT';
      default: return 'EV';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
    >
      <View style={styles.header}>
        <Text style={styles.topTag}>LIFECYCLE EVENTS</Text>
        <Text style={styles.title}>Batch Timeline</Text>
        <Text style={styles.subtitle}>
          {activeBatch?.ibBatchNumber || activeBatch?.name || 'No Active Batch'}
        </Text>
      </View>

      {!activeBatch ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Start a batch to view its timeline.</Text>
        </View>
      ) : timeline.length === 0 && !loading ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No events recorded yet.</Text>
        </View>
      ) : (
        <View style={styles.timelineContainer}>
          {timeline.map((item, index) => {
            const isLast = index === timeline.length - 1;
            
            const displayDate = new Date(item.date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <View key={`${item.date}-${item.type}-${index}`} style={styles.eventRow}>
                {/* Left Column: Date & Time */}
                <View style={styles.leftCol}>
                  <Text style={styles.dateText}>{displayDate}</Text>
                </View>

                {/* Middle Column: Line and Dot */}
                <View style={styles.midCol}>
                  <View style={styles.dotWrap}>
                    <Text style={styles.iconText}>{renderIcon(item.type)}</Text>
                  </View>
                  {!isLast && <View style={styles.line} />}
                </View>

                {/* Right Column: Content */}
                <View style={styles.rightCol}>
                  <View style={styles.eventCard}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <Text style={styles.eventDetail}>{item.detail}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
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
    color: Colors.primary,
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
  emptyWrap: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardAlt,
    borderRadius: 12,
  },
  emptyText: {
    color: Colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  timelineContainer: {
    marginTop: 10,
    paddingLeft: 4,
  },
  eventRow: {
    flexDirection: 'row',
  },
  leftCol: {
    width: 80,
    alignItems: 'flex-end',
    paddingRight: 12,
    paddingTop: 6,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  midCol: {
    width: 32,
    alignItems: 'center',
  },
  dotWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.cardAlt,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  iconText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.textSecondary,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginTop: -4,
    marginBottom: -4,
    zIndex: 1,
  },
  rightCol: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 24,
  },
  eventCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  eventDetail: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
