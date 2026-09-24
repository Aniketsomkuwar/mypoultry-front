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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { StatCard } from '../../components/common/StatCard';
import { useAuth } from '../../context/AuthContext';
import { Api } from '../../services/api';

const SUPPLY_CATEGORIES = [
  'All',
  'Feed',
  'Chicks',
  'Medicine',
  'Vaccines',
  'Other Inputs',
];

const FEED_TYPES = ['Pre-Starter', 'Starter', 'Finisher', 'Concentrate', 'Other'];
const UNITS = ['KG', 'Bags', 'Birds', 'Doses', 'Liters', 'Vials', 'Bottles'];

export const FarmerSuppliesScreen = ({ onNavigate }) => {
  const { activeBatch } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [feedInventory, setFeedInventory] = useState(null);
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [category, setCategory] = useState('Feed');
  const [itemName, setItemName] = useState('');
  const [feedType, setFeedType] = useState('Starter');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('KG');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, supRes] = await Promise.all([
        Api.getFeedInventory(activeBatch?.id),
        Api.getSupplies(selectedCategory, activeBatch?.id),
      ]);

      if (invRes && invRes.success) {
        setFeedInventory(invRes.feedInventory);
      }
      if (supRes && supRes.success) {
        setSupplies(supRes.supplies || []);
      }
    } catch (err) {
      console.warn('Error loading supplies data:', err.message);
    } finally {
      setLoading(false);
    }
  }, [activeBatch, selectedCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAddModal = (presetCategory = 'Feed') => {
    setCategory(presetCategory);
    setItemName(presetCategory === 'Feed' ? 'Broiler Finisher Pellets' : '');
    setFeedType(presetCategory === 'Feed' ? 'Finisher' : '');
    setQuantity('');
    setUnit(presetCategory === 'Feed' ? 'KG' : (presetCategory === 'Chicks' ? 'Birds' : 'Doses'));
    setDate(new Date().toISOString().split('T')[0]);
    setReferenceNumber('');
    setNotes('');
    setErrorMsg('');
    setShowAddModal(true);
  };

  const handleSaveSupply = async () => {
    const qty = parseFloat(quantity);
    if (!itemName.trim()) {
      setErrorMsg('Please enter an item description.');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Please enter a valid quantity greater than zero.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await Api.addSupply({
        batchId: activeBatch?.id,
        category,
        itemName: itemName.trim(),
        feedType: category === 'Feed' ? feedType : '',
        quantity: qty,
        unit,
        date,
        referenceNumber: referenceNumber.trim(),
        notes: notes.trim(),
      });

      if (res && res.success) {
        setShowAddModal(false);
        await loadData();
      } else {
        setErrorMsg(res?.message || 'Failed to save supply entry.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error recording supply.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupply = async (id) => {
    try {
      await Api.deleteSupply(id);
      await loadData();
    } catch (err) {
      Alert.alert('Error', 'Could not delete entry.');
    }
  };

  const inv = feedInventory || {
    totalReceived: 0,
    totalUsed: 0,
    remaining: 0,
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.topTag}>BATCH INPUTS & STOCK</Text>
        <Text style={styles.title}>Feed & IB Supplies</Text>
        <Text style={styles.subtitle}>
          {activeBatch?.ibBatchNumber || activeBatch?.name || 'Active Batch'}
        </Text>
      </View>

      {/* 4. FEED INVENTORY SECTION */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>FEED INVENTORY</Text>
        <TouchableOpacity
          onPress={() => handleOpenAddModal('Feed')}
          style={styles.quickAddFeedBtn}
        >
          <Text style={styles.quickAddFeedText}>+ RECEIVE FEED</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inventoryGrid}>
        <StatCard
          label="FEED RECEIVED"
          value={inv.totalReceived.toLocaleString()}
          unit="KG"
          variant="default"
          subtext="Total delivered to farm"
        />

        <StatCard
          label="FEED USED"
          value={inv.totalUsed.toLocaleString()}
          unit="KG"
          variant="warning"
          subtext="Consumed by flock"
        />

        <StatCard
          label="FEED REMAINING"
          value={inv.remaining.toLocaleString()}
          unit="KG"
          variant={inv.remaining < 500 ? 'danger' : 'info'}
          subtext="Current shed stock"
        />
      </View>

      {/* 5. IB SUPPLIES SECTION */}
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <Text style={styles.sectionHeading}>IB SUPPLIES RECEIVED</Text>
        <Button
          title="+ ADD SUPPLY"
          onPress={() => handleOpenAddModal('Medicine')}
          style={styles.addSupplyBtn}
          textStyle={{ fontSize: 13 }}
        />
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={styles.catContent}
      >
        {SUPPLY_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[styles.catTab, isSelected && styles.catTabActive]}
            >
              <Text style={[styles.catTabText, isSelected && styles.catTabTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Supply Records List */}
      {supplies.length > 0 ? (
        <View style={styles.suppliesList}>
          {supplies.map((item) => (
            <Card key={item._id} style={styles.supplyCard}>
              <View style={styles.supplyTop}>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>{item.category.toUpperCase()}</Text>
                </View>
                <Text style={styles.supplyDate}>
                  {new Date(item.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>

              <View style={styles.supplyBody}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.supplyName}>{item.itemName}</Text>
                  {item.feedType ? (
                    <Text style={styles.supplyFeedType}>Type: {item.feedType}</Text>
                  ) : null}
                  {item.referenceNumber ? (
                    <Text style={styles.supplyRef}>Ref / DC #: {item.referenceNumber}</Text>
                  ) : null}
                  {item.notes ? (
                    <Text style={styles.supplyNotes}>{item.notes}</Text>
                  ) : null}
                </View>

                <View style={styles.supplyRight}>
                  <Text style={styles.supplyQty}>
                    {item.quantity.toLocaleString()}{' '}
                    <Text style={styles.supplyUnit}>{item.unit}</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteSupply(item._id)}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No Supplies Recorded</Text>
          <Text style={styles.emptySub}>
            Tap "+ Add Supply" to record received feeds, vaccines, medicine or chicks.
          </Text>
        </Card>
      )}

      {/* Add Supply / Feed Received Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { padding: 0 }]} contentContainerStyle={{ padding: 22 }} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalPre}>INPUT ENTRY</Text>
                <Text style={styles.modalTitle}>Receive IB Supply</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>X</Text>
              </TouchableOpacity>
            </View>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Category Select Buttons */}
            <Text style={styles.fieldLabel}>Supply Category</Text>
            <View style={styles.pillRow}>
              {['Feed', 'Chicks', 'Medicine', 'Vaccines', 'Other Inputs'].map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => {
                    setCategory(c);
                    if (c === 'Feed' && !itemName) setItemName('Broiler Feed Pellets');
                    if (c === 'Chicks' && !itemName) setItemName('');
                  }}
                  style={[styles.pillBtn, category === c && styles.pillBtnActive]}
                >
                  <Text style={[styles.pillText, category === c && styles.pillTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {category === 'Feed' ? (
              <>
                <Text style={styles.fieldLabel}>Feed Type</Text>
                <View style={styles.pillRow}>
                  {FEED_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => setFeedType(t)}
                      style={[styles.pillBtn, feedType === t && styles.pillBtnActive]}
                    >
                      <Text style={[styles.pillText, feedType === t && styles.pillTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}

            <Input
              label="Item Name / Description"
              value={itemName}
              onChangeText={setItemName}
              placeholder="e.g. Broiler Finisher Pellets"
              helperText="Product name or supplier description"
            />

            <View style={styles.twoColRow}>
              <View style={{ flex: 1.4 }}>
                <Input
                  label="Quantity"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 5000"
                />
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Unit</Text>
                <View style={styles.unitSelectBox}>
                  {UNITS.slice(0, 4).map((u) => (
                    <TouchableOpacity
                      key={u}
                      onPress={() => setUnit(u)}
                      style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                    >
                      <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>
                        {u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Input
              label="Date Received"
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              helperText="Delivery date"
            />

            <Input
              label="Delivery Challan / Reference #"
              value={referenceNumber}
              onChangeText={setReferenceNumber}
              placeholder="e.g. DC-8802 / INV-104"
              helperText="Invoice or DC number on supply slip"
            />

            <Input
              label="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. 100 bags (50kg each), vehicle GJ-04-1234"
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
                title="SAVE SUPPLY"
                loading={submitting}
                onPress={handleSaveSupply}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
    padding: 18,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 10,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  quickAddFeedBtn: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  quickAddFeedText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  inventoryGrid: {
    gap: 6,
  },
  addSupplyBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  catScroll: {
    marginVertical: 8,
  },
  catContent: {
    gap: 8,
  },
  catTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.cardAlt,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  catTabActive: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.primary,
  },
  catTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  catTabTextActive: {
    color: Colors.primaryDark,
    fontWeight: '900',
  },
  suppliesList: {
    gap: 10,
    marginTop: 8,
  },
  supplyCard: {
    padding: 16,
  },
  supplyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  supplyDate: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  supplyBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  supplyName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  supplyFeedType: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 2,
  },
  supplyRef: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  supplyNotes: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  supplyRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  supplyQty: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  supplyUnit: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  deleteBtn: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.danger,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
  modalPre: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textMuted,
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  pillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.cardAlt,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pillBtnActive: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.primaryDark,
    fontWeight: '900',
  },
  twoColRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unitSelectBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  unitBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.cardAlt,
  },
  unitBtnActive: {
    backgroundColor: Colors.primary,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  unitTextActive: {
    color: Colors.textWhite,
    fontWeight: '900',
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 18,
    marginBottom: 10,
  },
});
