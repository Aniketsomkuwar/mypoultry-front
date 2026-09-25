import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Api, setOnUnauthorized } from '../services/api';
import { OfflineSync, subscribeSyncStatus } from '../services/offlineSync';
import { registerForPushNotifications, unregisterPushToken } from '../services/notifications';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [farm, setFarm] = useState(null);
  const [activeBatch, setActiveBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('SYNCED');

  const logout = async () => {
    await unregisterPushToken().catch(() => {});
    await AsyncStorage.removeItem('@poultry_auth_token');
    await AsyncStorage.removeItem('@poultry_user_info');
    await AsyncStorage.removeItem('@poultry_farm_info');
    await AsyncStorage.removeItem('@poultry_batch_info');
    setUser(null);
    setFarm(null);
    setActiveBatch(null);
  };

  // Register unauthorized listener to handle stale or invalidated sessions
  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
    });
  }, []);

  // Monitor sync status
  useEffect(() => {
    const unsubscribe = subscribeSyncStatus(setSyncStatus);
    const stopAutoSync = OfflineSync.startAutoSync(20000);
    return () => {
      unsubscribe();
      stopAutoSync();
    };
  }, []);

  // Check saved session on app launch
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('@poultry_auth_token');
        const savedUser = await AsyncStorage.getItem('@poultry_user_info');
        const savedFarm = await AsyncStorage.getItem('@poultry_farm_info');
        const savedBatch = await AsyncStorage.getItem('@poultry_batch_info');

        if (savedUser) setUser(JSON.parse(savedUser));
        if (savedFarm) setFarm(JSON.parse(savedFarm));
        if (savedBatch) setActiveBatch(JSON.parse(savedBatch));

        if (savedToken) {
          // Verify with server in background
          Api.getMe()
            .then(async (data) => {
              if (data && data.success) {
                setUser(data.user);
                setFarm(data.farm);
                setActiveBatch(data.activeBatch);
                await AsyncStorage.setItem('@poultry_user_info', JSON.stringify(data.user));
                if (data.farm) await AsyncStorage.setItem('@poultry_farm_info', JSON.stringify(data.farm));
                if (data.activeBatch) await AsyncStorage.setItem('@poultry_batch_info', JSON.stringify(data.activeBatch));
              }
            })
            .catch(async (err) => {
              if (err.status === 401 || err.message === 'User not found' || err.message?.includes('session')) {
                await logout();
              }
            });
        }
      } catch (e) {
        console.warn('Session restoration error:', e);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (pin) => {
    try {
      const res = await Api.login(pin);
      if (res.success) {
        await AsyncStorage.setItem('@poultry_auth_token', res.token);
        await AsyncStorage.setItem('@poultry_user_info', JSON.stringify(res.user));
        if (res.farm) await AsyncStorage.setItem('@poultry_farm_info', JSON.stringify(res.farm));
        if (res.activeBatch) await AsyncStorage.setItem('@poultry_batch_info', JSON.stringify(res.activeBatch));

        setUser(res.user);
        setFarm(res.farm);
        setActiveBatch(res.activeBatch);
        // Register push token after successful login (fire-and-forget)
        registerForPushNotifications().catch(() => {});
        return { success: true };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (err) {
      return { success: false, message: err.message || 'Unable to connect to server' };
    }
  };

  const refreshBatchData = async () => {
    try {
      const res = await Api.getActiveBatch();
      if (res && res.success) {
        setActiveBatch(res.batch);
        if (res.batch) {
          await AsyncStorage.setItem('@poultry_batch_info', JSON.stringify(res.batch));
        }
        return res;
      }
    } catch (e) {
      console.warn('Could not refresh batch:', e.message);
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        farm,
        activeBatch,
        loading,
        syncStatus,
        login,
        logout,
        refreshBatchData,
        setActiveBatch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
