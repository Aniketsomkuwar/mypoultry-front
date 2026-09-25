import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { SyncBadge } from '../../components/common/SyncBadge';
import { useAuth } from '../../context/AuthContext';
import { Api } from '../../services/api';
import { OfflineSync } from '../../services/offlineSync';

export const WorkerTodayEntryScreen = ({ onNavigate }) => {
  const { activeBatch, syncStatus, refreshBatchData } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];
  const formattedToday = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const [date, setDate] = useState(todayStr);
  const [startingBirds, setStartingBirds] = useState(0);
  const [deaths, setDeaths] = useState('');
  const [feedUsed, setFeedUsed] = useState('');
  const [waterUsed, setWaterUsed] = useState('');
  const [weight, setWeight] = useState('');
  const [fcr, setFcr] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  // Fetch starting birds and check if today's entry already exists
  useEffect(() => {
    const controller = new AbortController();

    const fetchInitialData = async () => {
      try {
        const [batchRes, wtRes] = await Promise.all([
          Api.getActiveBatch(),
          Api.getLatestWeight().catch(() => ({ latest: null })),
        ]);

        if (controller.signal.aborted) return;

        if (batchRes && batchRes.success && batchRes.stats) {
          const currentCount = batchRes.stats.currentBirds;
          const todayRec = batchRes.stats.todayRecord;

          if (todayRec) {
            // Already recorded today, prefill
            setDeaths(String(todayRec.deaths || ''));
            setFeedUsed(String(todayRec.feedUsed || ''));
            if (todayRec.waterUsed !== null && todayRec.waterUsed !== undefined) {
              setWaterUsed(String(todayRec.waterUsed));
            }
            setFcr(todayRec.fcr ? String(todayRec.fcr) : '');
            setNotes(todayRec.notes || '');
            setStartingBirds(currentCount + (todayRec.deaths || 0));
          } else {
            setStartingBirds(currentCount);
          }
        }

        if (wtRes && wtRes.success && wtRes.latest) {
          setWeight(String(wtRes.latest.averageWeight || ''));
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        // Offline fallback
        setStartingBirds(activeBatch?.initialBirdCount || 0);
      }
    };

    fetchInitialData();
    return () => controller.abort();
  }, [activeBatch]);

  // Live calculation of remaining birds
  const parsedDeaths = Number(deaths) || 0;
  const remainingBirds = Math.max(0, startingBirds - parsedDeaths);

  // Live calculation of mortality %
  const initialBatchCount = activeBatch?.initialBirdCount || startingBirds;
  const calculatedMortality = initialBatchCount > 0
    ? ((parsedDeaths / startingBirds) * 100).toFixed(2)
    : '0.00';

  const validate = () => {
    const errs = {};
    if (deaths === '') {
      errs.deaths = 'Please enter the number of deaths (or 0 if none).';
    } else if (isNaN(deaths) || Number(deaths) < 0) {
      errs.deaths = 'Deaths cannot be negative.';
    } else if (Number(deaths) > startingBirds) {
      errs.deaths = `Deaths cannot be greater than the number of birds (${startingBirds}).`;
    }

    if (feedUsed === '') {
      errs.feedUsed = 'Please enter feed used in KG.';
    } else if (isNaN(feedUsed) || Number(feedUsed) < 0) {
      errs.feedUsed = 'Feed cannot be negative.';
    }

    if (waterUsed !== '' && (isNaN(waterUsed) || Number(waterUsed) < 0)) {
      errs.waterUsed = 'Water used must be a positive number.';
    }

    if (fcr !== '' && (isNaN(fcr) || Number(fcr) <= 0)) {
      errs.fcr = 'FCR must be a positive number.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    setSavedSuccess(false);

    const recordPayload = {
      batchId: activeBatch?.id,
      date,
      deaths: Number(deaths),
      feedUsed: Number(feedUsed),
      waterUsed: waterUsed ? Number(waterUsed) : null,
      fcr: fcr ? Number(fcr) : null,
      notes: notes.trim(),
    };

    try {
      // Try direct server call first
      await Api.saveDailyRecord(recordPayload);

      // If weight entered, also log sample weight
      if (weight && !isNaN(weight) && Number(weight) > 0) {
        await Api.addWeightLog({
          batchId: activeBatch?.id,
          averageWeight: Number(weight),
          sampleCount: 50,
          date,
        }).catch(() => {});
      }

      await refreshBatchData();
      setSavedSuccess(true);
    } catch (err) {
      // Offline fallback: queue locally in AsyncStorage
      try {
        await OfflineSync.enqueueRecord(recordPayload);
        setSavedSuccess(true);
      } catch (queueErr) {
        Alert.alert('Storage Error', 'Could not save record locally.');
      }
    } finally {
      setLoading(false);
    }
  };

  const placementDate = activeBatch?.placementDate || activeBatch?.startDate;
  const calculateBatchDay = (pDate) => {
    if (!pDate) return 1;
    const p = new Date(pDate);
    const now = new Date();
    const d1 = Date.UTC(p.getFullYear(), p.getMonth(), p.getDate());
    const d2 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.max(1, Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
  };
  const batchDay = calculateBatchDay(placementDate);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.topHeader}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.headerTitle}>TODAY'S ENTRY</Text>
              <View style={styles.entryDayBadge}>
                <Text style={styles.entryDayText}>DAY {batchDay}</Text>
              </View>
            </View>
            <Text style={styles.headerSub}>
              {activeBatch?.ibBatchNumber || activeBatch?.name || 'IB BATCH'} • {formattedToday}
            </Text>
          </View>
          <SyncBadge status={syncStatus} />
        </View>

        {/* Clear Success Banner */}
        {savedSuccess ? (
          <View style={styles.successBanner}>
            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>OK</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.successTitle}>Today's data saved successfully.</Text>
              <Text style={styles.successSub}>
                {syncStatus === 'SAVED'
                  ? 'Stored safely on phone. Will sync automatically.'
                  : 'Flock records and farm metrics updated.'}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Summary Card with Live Calculated Birds */}
        <Card style={styles.summaryCard}>
          <View style={styles.calcRow}>
            <View style={styles.calcCol}>
              <Text style={styles.calcLabel}>BIRDS AT START</Text>
              <Text style={styles.calcValue}>{startingBirds.toLocaleString()}</Text>
            </View>

            <View style={styles.minusSign}>
              <Text style={styles.mathSymbol}>-</Text>
            </View>

            <View style={styles.calcCol}>
              <Text style={styles.calcLabel}>DEATHS TODAY</Text>
              <Text style={[styles.calcValue, { color: Colors.danger }]}>
                {parsedDeaths}
              </Text>
            </View>

            <View style={styles.minusSign}>
              <Text style={styles.mathSymbol}>=</Text>
            </View>

            <View style={styles.calcCol}>
              <Text style={styles.calcLabel}>BIRDS TODAY</Text>
              <Text style={[styles.calcValue, { color: Colors.primary }]}>
                {remainingBirds.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.mortalityPill}>
            <Text style={styles.mortalityText}>
              Estimated Mortality Today: <Text style={{ fontWeight: '800' }}>{calculatedMortality}%</Text>
            </Text>
          </View>
        </Card>

        {/* The Entry Form */}
        <Card style={styles.formCard}>
          <Input
            label="1. Deaths Today"
            placeholder="0"
            value={deaths}
            onChangeText={(t) => {
              setDeaths(t);
              setErrors((prev) => ({ ...prev, deaths: null }));
              setSavedSuccess(false);
            }}
            keyboardType="numeric"
            error={errors.deaths}
            helperText="Number of birds that died today"
          />

          <Input
            label="2. Feed Used (KG)"
            placeholder="e.g. 245"
            value={feedUsed}
            onChangeText={(t) => {
              setFeedUsed(t);
              setErrors((prev) => ({ ...prev, feedUsed: null }));
              setSavedSuccess(false);
            }}
            keyboardType="numeric"
            suffix="KG"
            error={errors.feedUsed}
            helperText="Amount of feed given today in kilograms"
          />

          <Input
            label="3. Water Used (Optional - Liters)"
            placeholder="e.g. 500"
            value={waterUsed}
            onChangeText={(t) => {
              setWaterUsed(t);
              setErrors((prev) => ({ ...prev, waterUsed: null }));
              setSavedSuccess(false);
            }}
            keyboardType="numeric"
            suffix="L"
            error={errors.waterUsed}
            helperText="Amount of water consumed today in liters"
          />

          <Input
            label="4. Sample Body Weight (Optional - KG)"
            placeholder="e.g. 1.82"
            value={weight}
            onChangeText={(t) => {
              setWeight(t);
              setSavedSuccess(false);
            }}
            keyboardType="decimal-pad"
            suffix="KG"
            helperText="Average weight of 50 sample birds today"
          />

          <Input
            label="5. Notes (Optional)"
            placeholder="e.g. Feed truck arrived late, all birds active"
            value={notes}
            onChangeText={(t) => {
              setNotes(t);
              setSavedSuccess(false);
            }}
            multiline
            numberOfLines={3}
            helperText="Any farm observation or issue"
          />

          {/* Big Action Button */}
          <Button
            title="SAVE TODAY'S DATA"
            onPress={handleSave}
            loading={loading}
            style={styles.saveBtn}
          />
        </Card>

        {/* Back / Done Navigation Button */}
        {savedSuccess ? (
          <Button
            title="BACK TO WORKER DASHBOARD"
            variant="secondary"
            onPress={() => onNavigate('Home')}
            style={styles.backBtn}
          />
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
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  entryDayBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  entryDayText: {
    color: Colors.textWhite,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    borderColor: '#86EFAC',
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  successBadge: {
    backgroundColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 12,
  },
  successBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.primary,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#14532D',
  },
  successSub: {
    fontSize: 14,
    color: '#166534',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcCol: {
    alignItems: 'center',
    flex: 1,
  },
  calcLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  calcValue: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  minusSign: {
    paddingHorizontal: 4,
  },
  mathSymbol: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.textMuted,
  },
  mortalityPill: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  mortalityText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  formCard: {
    padding: 20,
  },
  saveBtn: {
    marginTop: 20,
    minHeight: 60,
  },
  backBtn: {
    marginTop: 16,
    minHeight: 52,
  },
});
