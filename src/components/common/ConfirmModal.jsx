import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme/colors';
import { Button } from './Button';

export const ConfirmModal = ({
  visible,
  title = 'Confirmation',
  message,
  confirmText = 'YES',
  cancelText = 'CANCEL',
  onConfirm,
  onCancel,
  variant = 'danger',
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.dialogBox}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonRow}>
            <Button
              title={cancelText}
              variant="secondary"
              onPress={onCancel}
              style={styles.actionBtn}
            />
            <View style={{ width: 12 }} />
            <Button
              title={confirmText}
              variant={variant}
              onPress={onConfirm}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  message: {
    fontSize: 17,
    fontWeight: '500',
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  actionBtn: {
    flex: 1,
    minHeight: 52,
  },
});
