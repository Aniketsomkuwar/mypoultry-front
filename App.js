import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  StatusBar,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Colors } from './src/theme/colors';
import { LoginScreen } from './src/screens/auth/LoginScreen';

// Worker Screens
import { WorkerHomeScreen } from './src/screens/worker/WorkerHomeScreen';
import { WorkerTodayEntryScreen } from './src/screens/worker/WorkerTodayEntryScreen';
import { WorkerHistoryScreen } from './src/screens/worker/WorkerHistoryScreen';
import { WorkerProfileScreen } from './src/screens/worker/WorkerProfileScreen';

// Farmer Screens
import { FarmerHomeScreen } from './src/screens/farmer/FarmerHomeScreen';
import { FarmerBatchesScreen } from './src/screens/farmer/FarmerBatchesScreen';
import { FarmerDailyRecordsScreen } from './src/screens/farmer/FarmerDailyRecordsScreen';
import { FarmerSuppliesScreen } from './src/screens/farmer/FarmerSuppliesScreen';
import { FarmerExpensesScreen } from './src/screens/farmer/FarmerExpensesScreen';
import { FarmerReportsScreen } from './src/screens/farmer/FarmerReportsScreen';
import { BatchPerformanceScreen } from './src/screens/farmer/BatchPerformanceScreen';
import { FarmEarningsScreen } from './src/screens/farmer/FarmEarningsScreen';
import { FarmerProfileScreen } from './src/screens/farmer/FarmerProfileScreen';

const SCREEN_LABELS = {
  Home: 'Home',
  Batches: 'Batch Management',
  DailyRecords: 'Daily Records',
  Supplies: 'Supplies',
  Expenses: 'Expenses',
  Reports: 'Reports',
  Performance: 'Batch Performance',
  Earnings: 'Farm Earnings',
  Profile: 'Profile',
  TodayEntry: "Today's Entry",
  History: 'History',
};

function MainApp() {
  const { user, loading } = useAuth();
  // Stack-based navigation: each entry is a screen id
  const [navStack, setNavStack] = useState(['Home']);
  const [selectedBatchId, setSelectedBatchId] = useState(null);

  const currentTab = navStack[navStack.length - 1];
  const canGoBack = navStack.length > 1;

  const navigate = useCallback((screen) => {
    setNavStack((prev) => {
      // If already at top of stack, don't push duplicate
      if (prev[prev.length - 1] === screen) return prev;
      // Going Home resets the stack
      if (screen === 'Home') return ['Home'];
      return [...prev, screen];
    });
  }, []);

  const goBack = useCallback(() => {
    setNavStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  if (loading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashBadge}>
          <Text style={styles.splashBadgeText}>PF</Text>
        </View>
        <Text style={styles.splashTitle}>Poultry Farm</Text>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.outerContainer}>
        <SafeAreaView style={styles.appContainer}>
          <LoginScreen />
        </SafeAreaView>
      </View>
    );
  }

  const renderCurrentScreen = () => {
    if (user.role === 'WORKER') {
      switch (currentTab) {
        case 'Home':
          return <WorkerHomeScreen onNavigate={navigate} />;
        case 'TodayEntry':
          return <WorkerTodayEntryScreen onNavigate={navigate} />;
        case 'History':
          return <WorkerHistoryScreen onNavigate={navigate} />;
        case 'Profile':
          return <WorkerProfileScreen />;
        default:
          return <WorkerHomeScreen onNavigate={navigate} />;
      }
    } else {
      switch (currentTab) {
        case 'Home':
          return <FarmerHomeScreen onNavigate={navigate} onSelectBatch={setSelectedBatchId} />;
        case 'Batches':
          return <FarmerBatchesScreen onNavigate={navigate} onSelectBatch={setSelectedBatchId} />;
        case 'DailyRecords':
          return <FarmerDailyRecordsScreen onNavigate={navigate} />;
        case 'Supplies':
          return <FarmerSuppliesScreen onNavigate={navigate} />;
        case 'Expenses':
          return <FarmerExpensesScreen onNavigate={navigate} />;
        case 'Reports':
          return <FarmerReportsScreen onNavigate={navigate} />;
        case 'Performance':
          return <BatchPerformanceScreen onNavigate={navigate} selectedBatchId={selectedBatchId} />;
        case 'Earnings':
          return <FarmEarningsScreen onNavigate={navigate} batchId={selectedBatchId} />;
        case 'Profile':
          return <FarmerProfileScreen onNavigate={navigate} onSelectBatch={setSelectedBatchId} />;
        default:
          return <FarmerHomeScreen onNavigate={navigate} onSelectBatch={setSelectedBatchId} />;
      }
    }
  };

  return (
    <View style={styles.outerContainer}>
      <SafeAreaView style={styles.appContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        {/* Back header — only visible when not on Home */}
        {canGoBack && (
          <View style={styles.backHeader}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={goBack}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.backArrow}>←</Text>
              <Text style={styles.backLabel}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle} numberOfLines={1}>
              {SCREEN_LABELS[currentTab] || currentTab}
            </Text>
            <TouchableOpacity
              style={styles.homeBtn}
              onPress={() => navigate('Home')}
              activeOpacity={0.7}
            >
              <Text style={styles.homeBtnText}>⌂ Home</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.screenWrapper}>{renderCurrentScreen()}</View>
      </SafeAreaView>
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#0F172A' : Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  appContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    ...(Platform.OS === 'web'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.25,
          shadowRadius: 25,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: '#1E293B',
        }
      : {}),
  },
  screenWrapper: {
    flex: 1,
  },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 64,
  },
  backArrow: {
    fontSize: 20,
    color: Colors.primary,
    fontWeight: '700',
    lineHeight: 22,
  },
  backLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  screenTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  homeBtn: {
    minWidth: 64,
    alignItems: 'flex-end',
  },
  homeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  splashBadgeText: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.primaryDark,
  },
  splashTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginTop: 12,
  },
});
