import AsyncStorage from '@react-native-async-storage/async-storage';
import { Api } from './api';

const QUEUE_KEY = '@poultry_offline_queue';
const SYNC_STATUS_KEY = '@poultry_sync_status';

// Statuses: 'SYNCED' | 'SYNCING' | 'SAVED'
let currentSyncStatus = 'SYNCED';
const listeners = new Set();

export const notifyStatusChange = (status) => {
  currentSyncStatus = status;
  listeners.forEach((callback) => {
    try {
      callback(status);
    } catch (e) {}
  });
};

export const subscribeSyncStatus = (callback) => {
  listeners.add(callback);
  callback(currentSyncStatus);
  return () => listeners.delete(callback);
};

export const getSyncStatus = () => currentSyncStatus;

export const OfflineSync = {
  // Get all locally queued records
  getQueue: async () => {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  // Save record to local queue immediately
  enqueueRecord: async (recordData) => {
    try {
      const queue = await OfflineSync.getQueue();
      const offlineItem = {
        ...recordData,
        offlineCreatedId: 'off_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        queuedAt: new Date().toISOString(),
      };

      // If record for the same date already in queue, update it
      const existingIdx = queue.findIndex(
        (q) => q.date === offlineItem.date && q.batchId === offlineItem.batchId
      );
      if (existingIdx >= 0) {
        queue[existingIdx] = offlineItem;
      } else {
        queue.push(offlineItem);
      }

      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      notifyStatusChange('SAVED');

      // Attempt immediate background sync if server is reachable
      OfflineSync.triggerSync();

      return offlineItem;
    } catch (error) {
      console.error('Failed to queue offline record:', error);
      throw error;
    }
  },

  // Synchronize local queue with backend
  triggerSync: async () => {
    const queue = await OfflineSync.getQueue();
    if (!queue || queue.length === 0) {
      notifyStatusChange('SYNCED');
      return { syncedCount: 0 };
    }

    try {
      notifyStatusChange('SYNCING');
      const res = await Api.syncDailyRecords(queue);

      if (res && res.success) {
        // Clear synced items
        await AsyncStorage.removeItem(QUEUE_KEY);
        notifyStatusChange('SYNCED');
        return res;
      } else {
        notifyStatusChange('SAVED');
        return { success: false };
      }
    } catch (err) {
      // Network not available or backend down - remain in 'SAVED' (offline) mode
      notifyStatusChange('SAVED');
      return { success: false, offline: true };
    }
  },

  // Initialize auto-sync background checker
  startAutoSync: (intervalMs = 15000) => {
    // Check queue periodically when app is open
    const timer = setInterval(() => {
      OfflineSync.triggerSync();
    }, intervalMs);

    return () => clearInterval(timer);
  },
};
