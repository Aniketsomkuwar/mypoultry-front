import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Automatically detect the PC's LAN IP from Expo Metro bundler
function resolveHostIp() {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest?.debuggerHost ||
      Constants.manifest2?.extra?.expoClient?.hostUri;

    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return ip;
      }
    }
  } catch (e) {}
  return null;
}

const detectedHostIp = resolveHostIp();

// In production (APK), use Railway. In development (npx expo start), use local PC.
export const PROD_URL = 'https://mypoultry-back-production.up.railway.app/api';
export const DEV_URL = detectedHostIp ? `http://${detectedHostIp}:5000/api` : 'http://192.168.1.3:5000/api';

export const DEFAULT_URL = __DEV__ ? DEV_URL : PROD_URL;

let currentBaseUrl = DEFAULT_URL;

// Candidate URLs to try on Android in priority order
const CANDIDATE_URLS = [
  DEFAULT_URL,
  ...(detectedHostIp ? [`http://${detectedHostIp}:5000/api`] : []),
  'http://localhost:5000/api',
  'http://10.0.2.2:5000/api',
  'https://mypoultry-back-production.up.railway.app/api',
];

export const setCustomBaseUrl = async (url) => {
  if (url) {
    currentBaseUrl = url.trim().replace(/\/+$/, '');
    await AsyncStorage.setItem('@poultry_api_url', currentBaseUrl);
  }
};

export const getBaseUrl = async () => {
  const saved = await AsyncStorage.getItem('@poultry_api_url');
  // If previously saved with local network IPs, remove it so production works
  if (saved && (saved.includes('10.0.2.2') || saved.includes('192.168'))) {
    await AsyncStorage.removeItem('@poultry_api_url');
    currentBaseUrl = DEFAULT_URL;
    return currentBaseUrl;
  }
  if (saved) {
    currentBaseUrl = saved;
    return currentBaseUrl;
  }

  currentBaseUrl = DEFAULT_URL;
  return currentBaseUrl;
};

let onUnauthorizedHandler = null;

export const setOnUnauthorized = (handler) => {
  onUnauthorizedHandler = handler;
};

// Generic authenticated fetch wrapper with auto fallback on Android
async function request(endpoint, options = {}) {
  const primaryUrl = await getBaseUrl();
  const token = await AsyncStorage.getItem('@poultry_auth_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  // Try primary URL first, then other candidate URLs
  const urlsToTry = [primaryUrl, ...CANDIDATE_URLS.filter((u) => u !== primaryUrl)];

  let lastError = null;

  for (const baseUrl of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${baseUrl}${endpoint}`, {
        ...config,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const serverError = new Error(data.message || `Request failed with status ${res.status}`);
        serverError.isServerResponse = true;
        serverError.status = res.status;
        if (res.status === 401 && (data.message === 'User not found' || data.message?.includes('session') || data.message?.includes('token'))) {
          if (onUnauthorizedHandler) {
            onUnauthorizedHandler();
          }
        }
        throw serverError;
      }

      // If a fallback URL succeeded, persist it as the new working base URL
      if (baseUrl !== primaryUrl) {
        currentBaseUrl = baseUrl;
        await AsyncStorage.setItem('@poultry_api_url', baseUrl);
      }

      return data;
    } catch (err) {
      lastError = err;
      // If the error came from the server (e.g. invalid PIN or bad input), rethrow immediately
      if (err.isServerResponse) {
        throw err;
      }
      // Otherwise it's a network/connection failure (fetch failed, ConnectException, timeout)
      // Continue to next candidate URL
      continue;
    }
  }

  console.warn(`[API Request Error] ${endpoint}:`, lastError?.message);
  throw lastError || new Error('Could not connect to poultry server.');
}

export const Api = {
  // Auth
  login: async (pin) => {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  },
  getMe: async () => {
    return request('/auth/me');
  },

  // Reports
  getBatchHealth: async (batchId) => {
    const query = batchId ? `?batchId=${batchId}` : '';
    return request(`/reports/batch-health${query}`);
  },

  // Batches
  getActiveBatch: async () => {
    return request('/batches/active');
  },
  getBatches: async () => {
    return request('/batches');
  },
  createBatch: async (batchData) => {
    return request('/batches', {
      method: 'POST',
      body: JSON.stringify(batchData),
    });
  },
  closeBatch: async (batchId) => {
    return request(`/batches/${batchId}/close`, {
      method: 'PUT',
    });
  },
  closeBatchWithLifting: async (batchId, closingData) => {
    return request(`/batches/${batchId}/close-lifting`, {
      method: 'POST',
      body: JSON.stringify(closingData),
    });
  },
  setActiveBatch: async (batchId) => {
    return request(`/batches/${batchId}/set-active`, {
      method: 'PUT',
    });
  },
  getBatchPerformance: async (batchId = 'active') => {
    return request(`/batches/${batchId}/performance`);
  },
  getBatchSettlement: async (batchId = 'active', params = {}) => {
    const q = [];
    if (params.gcRate) q.push(`gcRate=${params.gcRate}`);
    if (params.incentiveRate) q.push(`incentiveRate=${params.incentiveRate}`);
    if (params.shedCategory) q.push(`shedCategory=${encodeURIComponent(params.shedCategory)}`);
    const qs = q.length > 0 ? `?${q.join('&')}` : '';
    return request(`/batches/${batchId}/settlement${qs}`);
  },
  saveBatchSettlement: async (batchId, settlementData) => {
    return request(`/batches/${batchId}/settlement`, {
      method: 'POST',
      body: JSON.stringify(settlementData),
    });
  },

  // Body Weight Tracking
  getWeightSummary: async (batchId = null) => {
    const q = batchId ? `?batchId=${batchId}` : '';
    return request(`/weights/summary${q}`);
  },
  getLatestWeight: async (batchId = null) => {
    const q = batchId ? `?batchId=${batchId}` : '';
    return request(`/weights/latest${q}`);
  },
  getWeights: async (batchId = null) => {
    const q = batchId ? `?batchId=${batchId}` : '';
    return request(`/weights${q}`);
  },
  addWeightLog: async (weightData) => {
    return request('/weights', {
      method: 'POST',
      body: JSON.stringify(weightData),
    });
  },

  // Feed Inventory & IB Supplies
  getFeedSummary: async (batchId = null) => {
    const q = batchId ? `?batchId=${batchId}` : '';
    return request(`/supplies/feed-summary${q}`);
  },
  getSupplies: async (category = 'All', batchId = null) => {
    let q = [];
    if (category && category !== 'All') q.push(`category=${encodeURIComponent(category)}`);
    if (batchId) q.push(`batchId=${batchId}`);
    const queryString = q.length > 0 ? `?${q.join('&')}` : '';
    return request(`/supplies${queryString}`);
  },
  addSupply: async (supplyData) => {
    return request('/supplies', {
      method: 'POST',
      body: JSON.stringify(supplyData),
    });
  },
  deleteSupply: async (supplyId) => {
    return request(`/supplies/${supplyId}`, {
      method: 'DELETE',
    });
  },

  // Daily Records
  getDailyRecords: async (batchId) => {
    const query = batchId ? `?batchId=${batchId}` : '';
    return request(`/daily-records${query}`);
  },
  getTodayRecord: async (batchId) => {
    const query = batchId ? `?batchId=${batchId}` : '';
    return request(`/daily-records/today${query}`);
  },
  saveDailyRecord: async (recordData) => {
    return request('/daily-records', {
      method: 'POST',
      body: JSON.stringify(recordData),
    });
  },

  // Expenses
  getExpenses: async (category = 'All', period = '') => {
    let q = [];
    if (category && category !== 'All') q.push(`category=${encodeURIComponent(category)}`);
    if (period) q.push(`period=${encodeURIComponent(period)}`);
    const queryString = q.length > 0 ? `?${q.join('&')}` : '';
    return request(`/expenses${queryString}`);
  },
  getExpenseSummary: async () => {
    return request('/expenses/summary');
  },
  addExpense: async (expenseData) => {
    return request('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });
  },
  deleteExpense: async (expenseId) => {
    return request(`/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  },

  // Reports
  getBatchTimeline: async (batchId) => {
    return request(`/reports/batch-timeline?batchId=${batchId}`);
  },
  getWeeklySummary: async () => {
    return request(`/reports/weekly`);
  },
  getReports: async (period = 'batch', batchId = null) => {
    let q = [`period=${period}`];
    if (batchId) q.push(`batchId=${batchId}`);
    return request(`/reports?${q.join('&')}`);
  },
  exportBatchCsv: async (batchId) => {
    // Custom fetch because request() expects JSON
    const primaryUrl = await getBaseUrl();
    const token = await AsyncStorage.getItem('@poultry_auth_token');
    
    const res = await fetch(`${primaryUrl}/reports/export-csv?batchId=${batchId}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    
    if (!res.ok) {
      throw new Error(`Export failed with status ${res.status}`);
    }
    
    return await res.text();
  },

  // Offline Sync
  syncDailyRecords: async (items) => {
    return request('/sync/daily-records', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  // Notifications
  registerPushToken: async (data) => {
    return request('/notifications/register-token', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  unregisterPushToken: async (data) => {
    return request('/notifications/unregister-token', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getNotifPrefs: async () => {
    return request('/notifications/prefs');
  },
  updateNotifPrefs: async (prefs) => {
    return request('/notifications/prefs', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    });
  },
};
