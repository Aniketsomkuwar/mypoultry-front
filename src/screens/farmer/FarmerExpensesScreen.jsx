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
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { Api } from '../../services/api';

const CATEGORIES = ['All', 'Feed', 'Medicine', 'Electricity', 'Labor', 'Transportation', 'Diesel', 'Other'];
const FORM_CATEGORIES = ['Feed', 'Medicine', 'Electricity', 'Labor', 'Transportation', 'Diesel', 'Other'];

export const FarmerExpensesScreen = () => {
  const { farm } = useAuth();
  const currency = farm?.currency || '₹';

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ today: 0, thisWeek: 0, thisMonth: 0, total: 0 });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // Add Expense Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Feed');
  const [detail, setDetail] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadExpensesData = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, sumRes] = await Promise.all([
        Api.getExpenses(selectedCategory),
        Api.getExpenseSummary(),
      ]);

      if (expRes && expRes.success) {
        setExpenses(expRes.expenses || []);
      }
      if (sumRes && sumRes.success) {
        setSummary(sumRes.summary);
      }
    } catch (e) {
      console.warn('Expenses load error:', e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadExpensesData();
  }, [loadExpensesData]);

  const handleOpenAdd = () => {
    setAmount('');
    setCategory('Feed');
    setDetail('');
    setDate(new Date().toISOString().split('T')[0]);
    setNote('');
    setModalError('');
    setShowAddModal(true);
  };

  const handleSaveExpense = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setModalError('Please enter a valid expense amount greater than 0.');
      return;
    }

    setSaveLoading(true);
    setModalError('');
    try {
      await Api.addExpense({
        amount: Number(amount),
        category,
        detail: detail.trim(),
        date,
        note: note.trim(),
      });
      setShowAddModal(false);
      await loadExpensesData();
    } catch (err) {
      setModalError(err.message || 'Error saving expense.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteTarget) return;
    try {
      await Api.deleteExpense(deleteTarget._id);
      setDeleteTarget(null);
      await loadExpensesData();
    } catch (e) {
      console.warn('Error deleting expense:', e.message);
    }
  };

  const renderExpenseItem = ({ item }) => {
    const formatted = new Date(item.date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });

    const getCategoryBadgeColor = (cat) => {
      switch (cat) {
        case 'Feed':
          return { bg: '#FEF3C7', text: '#92400E' };
        case 'Medicine':
          return { bg: '#FEE2E2', text: '#991B1B' };
        case 'Electricity':
          return { bg: '#E0E7FF', text: '#3730A3' };
        case 'Labor':
          return { bg: '#ECFDF5', text: '#065F46' };
        case 'Transportation':
          return { bg: '#F3E8FF', text: '#6B21A8' };
        case 'Diesel':
          return { bg: '#FFEDD5', text: '#C2410C' };
        default:
          return { bg: '#F1F5F9', text: '#334155' };
      }
    };

    const badgeStyle = getCategoryBadgeColor(item.category);

    return (
      <Card style={styles.expenseCard}>
        <View style={styles.expenseLeft}>
          <View style={styles.catRow}>
            <View style={[styles.catBadge, { backgroundColor: badgeStyle.bg }]}>
              <Text style={[styles.catText, { color: badgeStyle.text }]}>
                {item.category}
              </Text>
            </View>
            <Text style={styles.expenseDate}>{formatted}</Text>
          </View>
          {item.detail ? (
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Detail: </Text>
              <Text style={styles.expenseDetail}>{item.detail}</Text>
            </View>
          ) : null}
          {item.note ? <Text style={styles.expenseNote}>{item.note}</Text> : null}
        </View>

        <View style={styles.expenseRight}>
          <Text style={styles.expenseAmount}>
            {currency}{item.amount?.toLocaleString()}
          </Text>
          <TouchableOpacity
            onPress={() => setDeleteTarget(item)}
            style={styles.deleteTouch}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with Hero Add Button */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>EXPENSES</Text>
          <Text style={styles.subtitle}>Farm Costs & Purchases</Text>
        </View>
        <Button
          title="+ ADD EXPENSE"
          variant="warning"
          onPress={handleOpenAdd}
          style={styles.addBtn}
          textStyle={{ fontSize: 15 }}
        />
      </View>

      {/* Summary Cards Grid */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={styles.sumLabel}>TODAY</Text>
          <Text style={styles.sumVal}>{currency}{summary.today?.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.sumLabel}>THIS WEEK</Text>
          <Text style={styles.sumVal}>{currency}{summary.thisWeek?.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.sumLabel}>THIS MONTH</Text>
          <Text style={styles.sumVal}>{currency}{summary.thisMonth?.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.sumLabel}>TOTAL</Text>
          <Text style={[styles.sumVal, { color: Colors.warning }]}>
            {currency}{summary.total?.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Category Dropdown Trigger */}
      <View style={styles.dropdownBar}>
        <Text style={styles.dropdownLabel}>Filter by Category:</Text>
        <TouchableOpacity
          style={styles.dropdownTrigger}
          onPress={() => setShowCategoryDropdown(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.dropdownTriggerText}>{selectedCategory}</Text>
          <Text style={styles.dropdownIcon}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Expense List */}
      <FlatList
        data={expenses}
        keyExtractor={(item) => item._id}
        renderItem={renderExpenseItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadExpensesData} />}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              title="No expenses found"
              message={`No recorded expenses in "${selectedCategory}".`}
              actionTitle="+ ADD FIRST EXPENSE"
              onAction={handleOpenAdd}
            />
          )
        }
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={Boolean(deleteTarget)}
        title="Delete Expense"
        message={`Are you sure you want to delete this expense of ${currency}${deleteTarget?.amount?.toLocaleString()} (${deleteTarget?.category})?`}
        confirmText="YES, DELETE"
        cancelText="CANCEL"
        variant="danger"
        onConfirm={handleDeleteExpense}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Category Filter Dropdown Modal */}
      <Modal
        visible={showCategoryDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryDropdown(false)}
        >
          <View style={[styles.modalContent, { width: '85%', alignSelf: 'center', padding: 16 }]}>
            <Text style={[styles.modalTitle, { marginBottom: 12, fontSize: 18 }]}>Select Category</Text>
            {CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.dropdownOption,
                    isSelected && styles.dropdownOptionActive
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      isSelected && styles.dropdownOptionTextActive
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Expense Form Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <ScrollView style={[styles.modalContent, { padding: 0 }]} contentContainerStyle={{ padding: 22 }} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Farm Expense</Text>
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
              label="Amount"
              placeholder="e.g. 5000"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              prefix={currency}
              helperText="Expense cost in Rupees"
            />

            <Text style={styles.inputLabel}>CATEGORY</Text>
            <View style={styles.catSelectGrid}>
              {FORM_CATEGORIES.map((c) => {
                const isSelected = category === c;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[styles.catOption, isSelected && styles.catOptionActive]}
                  >
                    <Text
                      style={[
                        styles.catOptionText,
                        isSelected && styles.catOptionTextActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {(category === 'Diesel' || category === 'Other') && (
              <Input
                label={category === 'Diesel' ? 'Diesel Detail (Litres / Purpose)' : 'Other Expense Detail'}
                placeholder={
                  category === 'Diesel'
                    ? 'e.g. Generator 25 Litres or Tractor fuel'
                    : 'e.g. Shed maintenance, sawdust, packaging'
                }
                value={detail}
                onChangeText={setDetail}
                helperText={
                  category === 'Diesel'
                    ? 'Specify litres or vehicle/generator purpose'
                    : 'Specify exact purpose of this expense'
                }
              />
            )}

            <Input
              label="Date"
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
            />

            <Input
              label="Note (Optional)"
              placeholder="e.g. Feed truck purchase 50 bags"
              value={note}
              onChangeText={setNote}
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
                title="SAVE EXPENSE"
                variant="warning"
                loading={saveLoading}
                onPress={handleSaveExpense}
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
    minHeight: 46,
    paddingHorizontal: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  sumLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sumVal: {
    fontSize: 15,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  dropdownBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardAlt,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  dropdownTriggerText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginRight: 8,
  },
  dropdownIcon: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownOptionActive: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  dropdownOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dropdownOptionTextActive: {
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  expenseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginVertical: 6,
  },
  expenseLeft: {
    flex: 1,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  catBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  catText: {
    fontSize: 12,
    fontWeight: '800',
  },
  expenseDate: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  detailBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.warningDark,
  },
  expenseDetail: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  expenseNote: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  expenseRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  expenseAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  deleteTouch: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginTop: 4,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.danger,
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
  inputLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  catSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  catOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.cardAlt,
  },
  catOptionActive: {
    backgroundColor: Colors.warningLight,
  },
  catOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  catOptionTextActive: {
    color: Colors.warningDark,
    fontWeight: '800',
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
