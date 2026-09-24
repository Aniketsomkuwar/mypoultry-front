import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { BatchClosingModal } from '../../components/common/BatchClosingModal';
import { useAuth } from '../../context/AuthContext';
import { Api } from '../../services/api';

export const FarmerProfileScreen = ({ onNavigate, onSelectBatch }) => {
  const { user, farm, activeBatch, logout, refreshBatchData } = useAuth();

  const [batches, setBatches] = useState([]);
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClosingModal, setShowClosingModal] = useState(false);

  // New IB Batch Form state
  const [ibBatchNumber, setIbBatchNumber] = useState('');
  const [chicksReceived, setChicksReceived] = useState('');
  const [placementDateInput, setPlacementDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [receiptDateInput, setReceiptDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [breed, setBreed] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadAllBatches = async () => {
    try {
      const res = await Api.getBatches();
      if (res && res.success) {
        setBatches(res.batches || []);
      }
    } catch (e) {
      console.warn('Error loading batches:', e.message);
    }
  };

  useEffect(() => {
    loadAllBatches();
  }, []);

  const handleOpenNewBatch = () => {
    const nextNum = (batches.length || 0) + 1;
    setIbBatchNumber(`IB BATCH #${nextNum}`);
    setChicksReceived('');
    setPlacementDateInput(new Date().toISOString().split('T')[0]);
    setReceiptDateInput(new Date().toISOString().split('T')[0]);
    setBreed('');
    setNotes('');
    setErrorMsg('');
    setShowNewBatchModal(true);
  };

  const handleCreateBatch = async () => {
    if (!ibBatchNumber.trim()) {
      setErrorMsg('Please enter an IB Batch / Lot Number.');
      return;
    }
    if (!chicksReceived || isNaN(chicksReceived) || Number(chicksReceived) <= 0) {
      setErrorMsg('Number of chicks received must be a positive number.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
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
        setShowNewBatchModal(false);
        await refreshBatchData();
        await loadAllBatches();
        Alert.alert('Batch Created', `Batch "${ibBatchNumber}" is now active.`);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create new batch.');
    } finally {
      setLoading(false);
    }
  };

  const placementDate = activeBatch?.placementDate || activeBatch?.startDate;
  const calculateBatchDay = (pDate) => {
    if (!pDate) return 1;
    const p = new Date(pDate);
    const now = new Date();
    const d1 = Date.UTC(p.getFullYear(), p.getMonth(), p.getDate());
    const d2 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.max(1, Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
  };
  const batchDay = activeBatch?.batchDay || calculateBatchDay(placementDate);
  const placedBirds = activeBatch?.chicksReceived || activeBatch?.initialBirdCount || 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>FARMER PROFILE</Text>
      </View>

      {/* Owner Info Card */}
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>F</Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Farm Owner'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>FARMER (OWNER)</Text>
        </View>



        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Farm Name:</Text>
          <Text style={styles.infoValue}>{farm?.name || '--'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Currency:</Text>
          <Text style={styles.infoValue}>{farm?.currency || '₹'}</Text>
        </View>
      </Card>

      {/* Batch Management Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>IB BATCH MANAGEMENT</Text>
        <Button
          title="+ NEW IB BATCH"
          onPress={handleOpenNewBatch}
          style={styles.newBatchBtn}
          textStyle={{ fontSize: 13 }}
        />
      </View>

      {activeBatch ? (
        <Card style={styles.activeBatchCard} accentColor={Colors.primary}>
          <View style={styles.batchTopRow}>
            <Text style={styles.activeTag}>CURRENT ACTIVE BATCH</Text>
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeText}>DAY {batchDay}</Text>
            </View>
          </View>

          <Text style={styles.activeName}>
            {activeBatch.ibBatchNumber || activeBatch.name || 'Unnamed Batch'}
          </Text>

          <View style={styles.activeDetailRow}>
            <Text style={styles.activeDetailLabel}>Placed Chicks:</Text>
            <Text style={styles.activeDetailVal}>{placedBirds.toLocaleString()} Birds</Text>
          </View>

          <View style={styles.activeDetailRow}>
            <Text style={styles.activeDetailLabel}>Placement Date:</Text>
            <Text style={styles.activeDetailVal}>
              {new Date(placementDate || Date.now()).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>

          <View style={styles.activeDetailRow}>
            <Text style={styles.activeDetailLabel}>Receipt Date:</Text>
            <Text style={styles.activeDetailVal}>
              {new Date(activeBatch.chickReceiptDate || placementDate || Date.now()).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>

          <View style={styles.activeDetailRow}>
            <Text style={styles.activeDetailLabel}>Breed:</Text>
            <Text style={styles.activeDetailVal}>{activeBatch.breed || 'Broiler'}</Text>
          </View>

          {activeBatch.notes ? (
            <Text style={[styles.activeDetail, { marginTop: 6 }]}>Notes: {activeBatch.notes}</Text>
          ) : null}

          {/* Quick link to Batch Performance */}
          <Button
            title="VIEW BATCH PERFORMANCE SCORECARD"
            variant="primary"
            onPress={() => onNavigate && onNavigate('Performance')}
            style={{ marginTop: 14, minHeight: 48 }}
          />

          <Button
            title="CLOSE BATCH & RECORD LIFTING"
            variant="secondary"
            onPress={() => setShowClosingModal(true)}
            style={{ marginTop: 8, minHeight: 46 }}
          />
        </Card>
      ) : (
        <Card style={{ padding: 18, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.textMuted }}>
            No batch is currently active.
          </Text>
        </Card>
      )}

      {/* Batch History List */}
      {batches.length > 0 ? (
        <Card style={styles.batchListCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.historyHeading}>All Farm Batches ({batches.length})</Text>
            <TouchableOpacity onPress={() => onNavigate && onNavigate('Batches')}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: Colors.primaryDark }}>MANAGE</Text>
            </TouchableOpacity>
          </View>
          {batches.map((b) => (
            <TouchableOpacity
              key={b._id}
              activeOpacity={0.7}
              onPress={() => {
                if (onSelectBatch) onSelectBatch(b._id);
                if (onNavigate) onNavigate('Batches');
              }}
              style={styles.batchItemRow}
            >
              <View>
                <Text style={styles.batchItemName}>{b.name}</Text>
                <Text style={styles.batchItemSub}>
                  {b.initialBirdCount?.toLocaleString()} birds • {b.breed}
                </Text>
              </View>
              <View
                style={[
                  styles.statusTag,
                  { backgroundColor: b.status === 'ACTIVE' ? Colors.primaryLight : Colors.cardAlt },
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    { color: b.status === 'ACTIVE' ? Colors.primaryDark : Colors.textMuted },
                  ]}
                >
                  {b.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          <Button
            title="OPEN MULTI-BATCH MANAGEMENT SCREEN"
            variant="secondary"
            onPress={() => onNavigate && onNavigate('Batches')}
            style={{ marginTop: 12, minHeight: 44 }}
            textStyle={{ fontSize: 12 }}
          />
        </Card>
      ) : null}

      {/* Batch Closing Modal */}
      <BatchClosingModal
        visible={showClosingModal}
        onClose={() => setShowClosingModal(false)}
        onSuccess={async () => {
          setShowClosingModal(false);
          await refreshBatchData();
          await loadAllBatches();
          if (onNavigate) onNavigate('Performance');
        }}
        batch={activeBatch}
      />

      {/* Logout Button */}
      <Button
        title="LOG OUT"
        variant="danger"
        onPress={() => setShowLogoutConfirm(true)}
        style={styles.logoutBtn}
      />

      {/* Create Batch Modal */}
      <Modal visible={showNewBatchModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { padding: 0 }]} contentContainerStyle={{ padding: 22 }} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Batch</Text>
              <TouchableOpacity onPress={() => setShowNewBatchModal(false)}>
                <Text style={styles.closeIcon}>X</Text>
              </TouchableOpacity>
            </View>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <Input
              label="IB Batch / Lot Number"
              placeholder="e.g. IB BATCH #1025"
              value={ibBatchNumber}
              onChangeText={setIbBatchNumber}
              helperText="Official batch or lot identifier"
            />

            <Input
              label="Number of Chicks Received (Placed)"
              placeholder="e.g. 5000"
              value={chicksReceived}
              onChangeText={setChicksReceived}
              keyboardType="numeric"
              helperText="Total day-old chicks placed in the shed"
            />

            <Input
              label="Chick Placement Date"
              value={placementDateInput}
              onChangeText={setPlacementDateInput}
              placeholder="YYYY-MM-DD"
              helperText="Date chicks were placed (sets Day 1)"
            />

            <Input
              label="Chick Receipt Date"
              value={receiptDateInput}
              onChangeText={setReceiptDateInput}
              placeholder="YYYY-MM-DD"
            />

            <Input
              label="Breed (Optional)"
              placeholder="e.g. Cobb 500 Broiler"
              value={breed}
              onChangeText={setBreed}
            />

            <Input
              label="Notes (Optional)"
              placeholder="e.g. IB contract farming batch"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
            />

            <View style={styles.modalBtnRow}>
              <Button
                title="CANCEL"
                variant="secondary"
                onPress={() => setShowNewBatchModal(false)}
                style={{ flex: 1 }}
              />
              <View style={{ width: 10 }} />
              <Button
                title="CREATE BATCH"
                loading={loading}
                onPress={handleCreateBatch}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Confirmation Modals */}
      <ConfirmModal
        visible={showLogoutConfirm}
        title="Log Out"
        message="Are you sure you want to log out of your Farmer account?"
        confirmText="YES, LOG OUT"
        cancelText="CANCEL"
        variant="danger"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    marginVertical: 10,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.primary,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  roleBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  newBatchBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  activeBatchCard: {
    padding: 18,
    backgroundColor: Colors.successLight,
    borderColor: '#BBF7D0',
  },
  batchTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dayBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dayBadgeText: {
    color: Colors.textWhite,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  activeTag: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
  },
  activeName: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  activeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryLight,
  },
  activeDetailLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  activeDetailVal: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  activeDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  batchListCard: {
    padding: 16,
    marginTop: 14,
  },
  historyHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  batchItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  batchItemName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  batchItemSub: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: '800',
  },
  logoutBtn: {
    marginTop: 24,
    minHeight: 56,
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
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  closeIcon: {
    fontSize: 24,
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
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
});
