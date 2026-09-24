import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Button } from './Button';
import { Input } from './Input';
import { Api } from '../../services/api';

export const WeightModal = ({ visible, onClose, onSuccess, batchId, batchDay = 1 }) => {
  const [sampleCount, setSampleCount] = useState('50');
  const [averageWeight, setAverageWeight] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async () => {
    const wt = parseFloat(averageWeight);
    const count = parseInt(sampleCount, 10);

    if (isNaN(wt) || wt <= 0) {
      setErrorMsg('Please enter a valid average weight in KG (e.g. 1.82).');
      return;
    }
    if (isNaN(count) || count <= 0) {
      setErrorMsg('Sample bird count must be at least 1 (e.g. 50 birds).');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await Api.addWeightLog({
        batchId,
        sampleCount: count,
        averageWeight: wt,
        date,
        notes: notes.trim(),
      });

      if (res && res.success) {
        setAverageWeight('');
        setNotes('');
        if (onSuccess) onSuccess(res.weightLog);
        onClose();
      } else {
        setErrorMsg(res?.message || 'Failed to save weight record.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error saving weight measurement.');
    } finally {
      setLoading(false);
    }
  };

  const sampleCountNum = parseInt(sampleCount, 10) || 0;
  const avgWeightNum = parseFloat(averageWeight) || 0;
  const totalSampleKg = (sampleCountNum * avgWeightNum).toFixed(1);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <ScrollView style={[styles.modalContent, { padding: 0 }]} contentContainerStyle={{ padding: 22 }} showsVerticalScrollIndicator={false}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalPre}>BODY WEIGHT LOG</Text>
              <Text style={styles.modalTitle}>Record Sample Weight</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Quick summary preview */}
          {avgWeightNum > 0 ? (
            <View style={styles.calcPreviewBox}>
              <Text style={styles.calcTitle}>SAMPLE CALCULATION</Text>
              <Text style={styles.calcBig}>
                {avgWeightNum.toFixed(2)} KG <Text style={styles.calcSub}>avg / bird</Text>
              </Text>
              <Text style={styles.calcDetail}>
                {sampleCountNum} sample birds = {totalSampleKg} KG total live sample
              </Text>
            </View>
          ) : null}

          <Input
            label="Average Body Weight (KG)"
            placeholder="e.g. 1.82"
            value={averageWeight}
            onChangeText={setAverageWeight}
            keyboardType="decimal-pad"
            helperText="Average weight per bird in kilograms"
          />

          <Input
            label="Sample Bird Count"
            placeholder="e.g. 50"
            value={sampleCount}
            onChangeText={setSampleCount}
            keyboardType="numeric"
            helperText="Number of birds weighed in this sample"
          />

          <Input
            label="Weighing Date"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            helperText="Date sample was taken"
          />

          <Input
            label="Notes (Optional)"
            placeholder="e.g. Shed center birds, uniform growth"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />

          <View style={styles.btnRow}>
            <Button
              title="CANCEL"
              variant="secondary"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <View style={{ width: 10 }} />
            <Button
              title="SAVE WEIGHT"
              loading={loading}
              onPress={handleSave}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
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
    marginTop: 2,
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
  calcPreviewBox: {
    backgroundColor: Colors.successLight,
    borderColor: '#BBF7D0',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    alignItems: 'center',
  },
  calcTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  calcBig: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginVertical: 4,
  },
  calcSub: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  calcDetail: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 18,
  },
});
