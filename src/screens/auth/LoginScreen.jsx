import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import { setCustomBaseUrl, getBaseUrl } from '../../services/api';

export const LoginScreen = () => {
  const { login } = useAuth();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    getBaseUrl().then((url) => setApiUrl(url));
  }, []);

  const handleApplyPreset = async (url) => {
    setApiUrl(url);
    await setCustomBaseUrl(url);
    Alert.alert('Server Connected', `Server URL set to: ${url}`);
  };

  const handleLogin = async (targetPin) => {
    setLoading(true);
    setErrorMessage('');

    try {
      const result = await login(targetPin);
      if (!result.success) {
        setErrorMessage(result.message || 'Invalid credentials.');
      }
    } catch (err) {
      setErrorMessage('Unable to connect to poultry server. Check internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (t) => {
    setPin(t);
    setErrorMessage('');
    
    if (t.length === 4) {
      handleLogin(t);
    }
  };

  const handleSaveApiUrl = async () => {
    if (apiUrl.trim()) {
      await setCustomBaseUrl(apiUrl.trim());
      Alert.alert('Server URL Updated', `API target set to: ${apiUrl.trim()}`);
      setShowConfig(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Farm App Header */}
        <View style={styles.header}>
          <Text style={styles.appBadge}>Poultry Farm</Text>
          <Text style={styles.title}>Simple Farm Manager</Text>
          <Text style={styles.subtitle}>Easy management for Farmers & Workers</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Login</Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Input
            label="4-Digit PIN"
            placeholder="••••"
            value={pin}
            onChangeText={handlePinChange}
            keyboardType="numeric"
            inputStyle={{ letterSpacing: 8, fontSize: 24, textAlign: 'center' }}
            secureTextEntry
          />

          {loading ? (
            <Button
              title="LOGGING IN..."
              loading={true}
              style={styles.loginBtn}
            />
          ) : null}
        </Card>

        {/* Optional Server URL configuration for physical devices */}
        <TouchableOpacity
          onPress={() => setShowConfig(!showConfig)}
          style={styles.configToggle}
        >
          <Text style={styles.configToggleText}>
            {showConfig ? 'Hide Server Settings' : 'Server Connection Settings'}
          </Text>
        </TouchableOpacity>

        {showConfig ? (
          <Card style={styles.configCard}>
            <Text style={styles.configTitle}>Backend API URL</Text>
            <Input
              placeholder="http://192.168.1.XX:5000/api"
              value={apiUrl}
              onChangeText={setApiUrl}
              helperText="Set to your local PC IP if testing on physical Android device"
            />
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => handleApplyPreset('http://192.168.1.3:5000/api')}
                style={{ padding: 8, backgroundColor: Colors.primaryLight, borderRadius: 8, flex: 1, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: Colors.primary }}>Phone (WiFi)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleApplyPreset('http://10.0.2.2:5000/api')}
                style={{ padding: 8, backgroundColor: '#DBEAFE', borderRadius: 8, flex: 1, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E40AF' }}>Emulator</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleApplyPreset('http://localhost:5000/api')}
                style={{ padding: 8, backgroundColor: '#F1F5F9', borderRadius: 8, flex: 1, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155' }}>Localhost</Text>
              </TouchableOpacity>
            </View>
            <Button
              title="Save Server URL"
              variant="secondary"
              onPress={handleSaveApiUrl}
              style={{ minHeight: 46 }}
            />
          </Card>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  appBadge: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    padding: 22,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  loginBtn: {
    marginTop: 16,
  },
  errorBox: {
    backgroundColor: Colors.dangerLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  demoCard: {
    backgroundColor: '#F1F5F9',
    marginTop: 16,
    padding: 16,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  demoSub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 14,
    marginTop: 2,
  },
  demoBtnRow: {
    flexDirection: 'column',
    gap: 10,
  },
  demoBtn: {
    minHeight: 48,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  configToggle: {
    marginTop: 24,
    padding: 12,
    alignItems: 'center',
  },
  configToggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  configCard: {
    marginTop: 8,
    padding: 16,
  },
  configTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
});
