import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { Api } from '../../services/api';

export const FarmerDailyRecordsScreen = () => {
  const { activeBatch, refreshBatchData } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Modal to add or edit daily record
  const [showAddModal, setShowAddModal] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deaths, setDeaths] = useState('');
  const [feedUsed, setFeedUsed] = useState('');
  const [fcr, setFcr] = useState('');
  const [notes, setNotes] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await Api.getDailyRecords(activeBatch?.id);
      if (res && res.success) {
        setRecords(res.records || []);
      }
    } catch (e) {
      console.warn('Could not load records:', e.message);
    } finally {
      setLoading(false);
    }
  }, [activeBatch]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleOpenAdd = (rec = null) => {
    if (rec) {
      setEntryDate(rec.date);
      setDeaths(String(rec.deaths || 0));
      setFeedUsed(String(rec.feedUsed || 0));
      setFcr(rec.fcr ? String(rec.fcr) : '');
      setNotes(rec.notes || '');
    } else {
      setEntryDate(new Date().toISOString().split('T')[0]);
      setDeaths('');
      setFeedUsed('');
      setFcr('');
      setNotes('');
    }
    setModalError('');
    setShowAddModal(true);
  };

  const handleSaveRecord = async () => {
    if (deaths === '' || isNaN(deaths) || Number(deaths) < 0) {
      setModalError('Please enter a valid death count (0 or more).');
      return;
    }
    if (feedUsed === '' || isNaN(feedUsed) || Number(feedUsed) < 0) {
      setModalError('Please enter valid feed in KG.');
      return;
    }

    setSaveLoading(true);
    setModalError('');
    try {
      await Api.saveDailyRecord({
        batchId: activeBatch?.id,
        date: entryDate,
        deaths: Number(deaths),
        feedUsed: Number(feedUsed),
        fcr: fcr ? Number(fcr) : null,
        notes: notes.trim(),
      });
      setShowAddModal(false);
      setSelectedRecord(null);
      await loadRecords();
      await refreshBatchData();
    } catch (err) {
      setModalError(err.message || 'Error saving daily record.');
    } finally {
      setSaveLoading(false);
    }
  };

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableCol, styles.colDate]}>Date</Text>
      <Text style={[styles.tableCol, styles.colNum]}>Dead</Text>
      <Text style={[styles.tableCol, styles.colNum]}>Feed</Text>
      <Text style={[styles.tableCol, styles.colNum]}>Mort.</Text>
      <Text style={[styles.tableCol, styles.colNum]}>FCR</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const formatted = new Date(item.date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setSelectedRecord(item)}
      >
        <View style={styles.tableRow}>
          <View style={styles.colDate}>
            <Text style={styles.tableCell}>{formatted}</Text>
            <Text style={styles.tableCellSub}>{item.birdCount?.toLocaleString()} Birds</Text>
          </View>
          <Text style={[styles.tableCell, styles.colNum, { color: Colors.danger }]}>{item.deaths}</Text>
          <Text style={[styles.tableCell, styles.colNum, { color: Colors.info }]}>{item.feedUsed}</Text>
          <Text style={[styles.tableCell, styles.colNum, { color: Colors.warningDark }]}>{item.mortality}%</Text>
          <Text style={[styles.tableCell, styles.colNum]}>{item.fcr ? item.fcr : '--'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with Add Button */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>DAILY RECORDS</Text>
          <Text style={styles.subtitle}>{activeBatch?.name || 'All Flock Entries'}</Text>
        </View>
        <Button
          title="+ NEW ENTRY"
          onPress={() => handleOpenAdd()}
          style={styles.addBtn}
          textStyle={{ fontSize: 14 }}
        />
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item._id || item.date}
        renderItem={renderItem}
        ListHeaderComponent={records.length > 0 ? renderTableHeader : null}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRecords} />}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              title="No Daily Records"
              message="No daily logs have been submitted for this batch yet."
              actionTitle="Add First Record"
              onAction={() => handleOpenAdd()}
            />
          )
        }
      />

      {/* Record Details Modal */}
      {selectedRecord ? (
        <Modal visible={true} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Log: {new Date(selectedRecord.date).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                <TouchableOpacity onPress={() => setSelectedRecord(null)}>
                  <Text style={styles.closeIcon}>X</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Flock Remaining:</Text>
                <Text style={styles.detailValue}>
                  {selectedRecord.birdCount?.toLocaleString()} Birds
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Deaths Today:</Text>
                <Text style={[styles.detailValue, { color: Colors.danger }]}>
                  {selectedRecord.deaths}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Feed Used:</Text>
                <Text style={[styles.detailValue, { color: Colors.info }]}>
                  {selectedRecord.feedUsed} KG
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Mortality Rate:</Text>
                <Text style={[styles.detailValue, { color: Colors.warning }]}>
                  {selectedRecord.mortality}%
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Feed Conversion (FCR):</Text>
                <Text style={styles.detailValue}>
                  {selectedRecord.fcr ? selectedRecord.fcr : 'Not logged'}
                </Text>
              </View>

              {selectedRecord.notes ? (
                <View style={styles.modalNotesBox}>
                  <Text style={styles.modalNotesTitle}>Notes:</Text>
                  <Text style={styles.modalNotesContent}>{selectedRecord.notes}</Text>
                </View>
              ) : null}

              <View style={styles.modalBtnRow}>
                <Button
                  title="EDIT RECORD"
                  variant="secondary"
                  onPress={() => {
                    const rec = selectedRecord;
                    setSelectedRecord(null);
                    handleOpenAdd(rec);
                  }}
                  style={{ flex: 1 }}
                />
                <View style={{ width: 10 }} />
                <Button
                  title="CLOSE"
                  variant="secondary"
                  onPress={() => setSelectedRecord(null)}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Add / Edit Daily Record Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { padding: 0 }]} contentContainerStyle={{ padding: 22 }} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Daily Farm Record</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.closeIcon}>X</Text>
              </TouchableOpacity>
            </View>

            {modalError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{modalError}</Text>
              </View>
            ) : null}

            <Input
              label="Date"
              value={entryDate}
              onChangeText={setEntryDate}
              placeholder="YYYY-MM-DD"
              helperText="Date for this farm record"
            />

            <Input
              label="Deaths Today"
              value={deaths}
              onChangeText={setDeaths}
              placeholder="0"
              keyboardType="numeric"
              helperText="Number of bird deaths"
            />

            <Input
              label="Feed Used (KG)"
              value={feedUsed}
              onChangeText={setFeedUsed}
              placeholder="e.g. 245"
              keyboardType="numeric"
              suffix="KG"
            />

            <Input
              label="FCR (Optional)"
              value={fcr}
              onChangeText={setFcr}
              placeholder="e.g. 1.62"
              keyboardType="numeric"
            />

            <Input
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes..."
              multiline
              numberOfLines={2}
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="CANCEL"
                variant="secondary"
                onPress={() => setShowAddModal(false)}
                style={{ flex: 1 }}
              />
              <View style={{ width: 10 }} />
              <Button
                title="SAVE RECORD"
                loading={saveLoading}
                onPress={handleSaveRecord}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
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
  addBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    alignItems: 'center',
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
  tableCellSub: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  colDate: {
    flex: 1.5,
  },
  colNum: {
    flex: 1,
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 18,
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 22,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  closeIcon: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textMuted,
    padding: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalNotesBox: {
    backgroundColor: Colors.cardAlt,
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  modalNotesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  modalNotesContent: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
  errorBanner: {
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
});
