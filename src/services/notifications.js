import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Api } from './api';

const TOKEN_REGISTERED_KEY = '@poultry_push_token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request permission and register the Expo push token with the backend.
 * Called once after login. Silent on failure — never block the user.
 */
export async function registerForPushNotifications() {
  try {
    if (Platform.OS === 'web') return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission denied — skipping token registration.');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '952b050a-20e6-464d-b9ea-d98f71a601d6',
    });
    const token = tokenData.data;

    // Avoid re-registering the same token every login
    const stored = await AsyncStorage.getItem(TOKEN_REGISTERED_KEY);
    if (stored === token) return;

    await Api.registerPushToken({ token, platform: Platform.OS });
    await AsyncStorage.setItem(TOKEN_REGISTERED_KEY, token);
    console.log('[Notifications] Push token registered:', token.slice(-10));
  } catch (err) {
    console.warn('[Notifications] Registration failed (non-fatal):', err.message);
  }
}

/**
 * Unregister the stored push token on logout.
 */
export async function unregisterPushToken() {
  try {
    const token = await AsyncStorage.getItem(TOKEN_REGISTERED_KEY);
    if (token) {
      await Api.unregisterPushToken({ token });
      await AsyncStorage.removeItem(TOKEN_REGISTERED_KEY);
    }
  } catch (err) {
    console.warn('[Notifications] Unregister failed (non-fatal):', err.message);
  }
}

/**
 * Set up the tap-to-navigate listener.
 * navigateFn = (screen, batchId?) => void
 */
export function setupNotificationListener(navigateFn, setSelectedBatchId) {
  // Handle taps while the app is open or in background
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationTap(response.notification.request.content.data, navigateFn, setSelectedBatchId);
  });

  // Handle cold-start tap
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) {
      handleNotificationTap(response.notification.request.content.data, navigateFn, setSelectedBatchId);
    }
  });

  return () => sub.remove();
}

function handleNotificationTap(data, navigateFn, setSelectedBatchId) {
  if (!data || !navigateFn) return;
  try {
    if (data.type === 'DAILY_RECORD_SUBMITTED') {
      if (data.batchId && setSelectedBatchId) {
        setSelectedBatchId(data.batchId);
      }
      navigateFn('DailyRecords');
    }
  } catch (err) {
    console.warn('[Notifications] Tap handler error:', err.message);
    // Fallback: open daily records without crashing
    navigateFn('DailyRecords');
  }
}
