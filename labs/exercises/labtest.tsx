import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import AntDesign from '@expo/vector-icons/AntDesign';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Constants ────────────────────────────────────────────────
const TASK_NAME = 'HYDRATION_BACKGROUND_TASK';
const STORAGE_KEY = 'hydration_settings';

// ─── Notification Handler ─────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Background Task Definition ───────────────────────────────
// Must be defined at the top level, outside the component
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return BackgroundTask.BackgroundTaskResult.NoData;

    const { startHour, startMin, endHour, endMin, enabled } = JSON.parse(raw);
    if (!enabled) return BackgroundTask.BackgroundTaskResult.NoData;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = parseInt(startHour) * 60 + parseInt(startMin);
    const endMinutes = parseInt(endHour) * 60 + parseInt(endMin);

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '— HYDRATE —',
          body: 'Working hours active. Time to drink water.',
          sound: true,
        },
        trigger: null,
      });
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    return BackgroundTask.BackgroundTaskResult.NoData;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

// ─── Helpers ──────────────────────────────────────────────────
const pad = (n: string | number) => String(n).padStart(2, '0');

const parseHour = (val: string, max: number) => {
  const n = parseInt(val, 10);
  if (isNaN(n)) return 0;
  return Math.min(Math.max(n, 0), max);
};

// ─── Component ────────────────────────────────────────────────
export default function App() {
  const [startHour, setStartHour] = useState('09');
  const [startMin, setStartMin] = useState('00');
  const [endHour, setEndHour] = useState('17');
  const [endMin, setEndMin] = useState('00');
  const [enabled, setEnabled] = useState(false);
  const [taskRegistered, setTaskRegistered] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [inWorkingHours, setInWorkingHours] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const switchAnim = useRef(new Animated.Value(0)).current;

  // ── Boot ────────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    loadSettings();
    checkPermissions();
    startClock();
  }, []);

  // Animate the switch track
  useEffect(() => {
    Animated.timing(switchAnim, {
      toValue: enabled ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [enabled]);

  // ── Clock tick ──────────────────────────────────────────────
  const startClock = () => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  };

  // Update "in working hours" indicator whenever time or settings change
  useEffect(() => {
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const start = parseHour(startHour, 23) * 60 + parseHour(startMin, 59);
    const end = parseHour(endHour, 23) * 60 + parseHour(endMin, 59);
    setInWorkingHours(cur >= start && cur <= end);
  }, [currentTime, startHour, startMin, endHour, endMin]);

  // ── Permissions ─────────────────────────────────────────────
  const checkPermissions = async () => {
    const notif = await Notifications.getPermissionsAsync();
    const bgStatus = await BackgroundTask.getStatusAsync();
    const bgOk = bgStatus === BackgroundTask.BackgroundTaskStatus.Available;
    const notifOk = notif.status === 'granted';
    setPermissionsGranted(notifOk && bgOk);
  };

  const requestPermissions = async (): Promise<boolean> => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('PERMISSION DENIED', 'Notification permission is required.');
      return false;
    }
    const bgStatus = await BackgroundTask.getStatusAsync();
    if (bgStatus !== BackgroundTask.BackgroundTaskStatus.Available) {
      Alert.alert(
        'BACKGROUND TASKS UNAVAILABLE',
        'Background execution is restricted on this device.'
      );
      return false;
    }
    setPermissionsGranted(true);
    return true;
  };

  // ── Persistence ─────────────────────────────────────────────
  const loadSettings = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      setStartHour(pad(s.startHour ?? 9));
      setStartMin(pad(s.startMin ?? 0));
      setEndHour(pad(s.endHour ?? 17));
      setEndMin(pad(s.endMin ?? 0));
      if (s.enabled) {
        setEnabled(true);
        const isReg = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
        setTaskRegistered(isReg);
      }
    } catch {}
  };

  const saveSettings = async (overrides?: Partial<Record<string, unknown>>) => {
    const data = {
      startHour,
      startMin,
      endHour,
      endMin,
      enabled,
      ...overrides,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  // ── Task management ─────────────────────────────────────────
  const registerTask = async () => {
    await BackgroundTask.registerTaskAsync(TASK_NAME, {
      minimumInterval: 3 * 60, // 3 minutes for testing
    });
    setTaskRegistered(true);
  };

  const unregisterTask = async () => {
    const isReg = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isReg) {
      await BackgroundTask.unregisterTaskAsync(TASK_NAME);
    }
    setTaskRegistered(false);
  };

  // ── Toggle handler ──────────────────────────────────────────
  const handleToggle = async (val: boolean) => {
    if (val) {
      const ok = await requestPermissions();
      if (!ok) return;
      await saveSettings({ enabled: true });
      await registerTask();
      setEnabled(true);
    } else {
      await unregisterTask();
      setEnabled(false);
      await saveSettings({ enabled: false });
    }
  };

  // ── Save working hours ──────────────────────────────────────
  const handleSaveHours = async () => {
    const sh = parseHour(startHour, 23);
    const sm = parseHour(startMin, 59);
    const eh = parseHour(endHour, 23);
    const em = parseHour(endMin, 59);

    if (sh * 60 + sm >= eh * 60 + em) {
      Alert.alert('INVALID RANGE', 'End time must be after start time.');
      return;
    }
    const padded = {
      startHour: pad(sh),
      startMin: pad(sm),
      endHour: pad(eh),
      endMin: pad(em),
    };
    setStartHour(padded.startHour);
    setStartMin(padded.startMin);
    setEndHour(padded.endHour);
    setEndMin(padded.endMin);
    await saveSettings(padded);
    Alert.alert('SAVED', 'Working hours updated.');
  };

  // ── Test notification ───────────────────────────────────────
  const testNotification = async () => {
    const ok = permissionsGranted || (await requestPermissions());
    if (!ok) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '— HYDRATE —',
        body: 'Test alert. Time to drink water.',
        sound: true,
      },
      trigger: null,
    });
  };

  // ── Render ───────────────────────────────────────────────────
  const switchTrackColor = switchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1a1a1a', '#fff'],
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, width: '100%', alignItems: 'center' }}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.headerLabel}>Water Reminder</Text>
            <View style={styles.headerLine} />
          </View>

          {/* ── Hero ── */}
          <View style={styles.hero}>
            <Text style={styles.heroSymbol}><AntDesign name="heart" size={80} color="lightblue" /></Text>
            <Text style={styles.heroTitle}>DRINK WATER</Text>
            <Text style={styles.heroSub}>WORK HOURS REMINDER</Text>
          </View>

          {/* ── Live Clock ── */}
          <View style={styles.clockBlock}>
            <Text style={styles.clockTime}>{currentTime}</Text>
            <View style={styles.clockStatusRow}>
              <View style={[styles.clockDot, { backgroundColor: inWorkingHours ? '#fff' : '#333' }]} />
              <Text style={[styles.clockStatus, { color: inWorkingHours ? '#fff' : '#333' }]}>
                {inWorkingHours ? 'WITHIN WORKING HOURS' : 'OUTSIDE WORKING HOURS'}
              </Text>
            </View>
          </View>

          {/* ── Divider ── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>WORKING HOURS</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Time Inputs ── */}
          <View style={styles.timeRow}>
            {/* Start */}
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>START</Text>
              <View style={styles.timeInputRow}>
                <TextInput
                  style={styles.timeInput}
                  value={startHour}
                  onChangeText={setStartHour}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholderTextColor="#333"
                  placeholder="09"
                  selectionColor="#fff"
                />
                <Text style={styles.timeSep}>:</Text>
                <TextInput
                  style={styles.timeInput}
                  value={startMin}
                  onChangeText={setStartMin}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholderTextColor="#333"
                  placeholder="00"
                  selectionColor="#fff"
                />
              </View>
            </View>

            <Text style={styles.timeArrow}>→</Text>

            {/* End */}
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>END</Text>
              <View style={styles.timeInputRow}>
                <TextInput
                  style={styles.timeInput}
                  value={endHour}
                  onChangeText={setEndHour}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholderTextColor="#333"
                  placeholder="17"
                  selectionColor="#fff"
                />
                <Text style={styles.timeSep}>:</Text>
                <TextInput
                  style={styles.timeInput}
                  value={endMin}
                  onChangeText={setEndMin}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholderTextColor="#333"
                  placeholder="00"
                  selectionColor="#fff"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveHours} activeOpacity={0.8}>
            <Text style={styles.saveBtnText}>SAVE HOURS</Text>
          </TouchableOpacity>

          {/* ── Divider ── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>SYSTEM CONTROL</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Toggle ── */}
          <View style={styles.toggleBlock}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>BACKGROUND REMINDER</Text>
              <Text style={styles.toggleSub}>
                {enabled
                  ? taskRegistered
                    ? 'TASK REGISTERED · EVERY 3 MIN'
                    : 'ENABLING...'
                  : 'SYSTEM INACTIVE'}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ false: '#1a1a1a', true: '#fff' }}
              thumbColor={enabled ? '#000' : '#333'}
              ios_backgroundColor="#1a1a1a"
            />
          </View>

          {/* ── Status panel ── */}
          <View style={styles.statusPanel}>
            {[
              {
                label: 'NOTIFICATIONS',
                ok: permissionsGranted,
              },
              {
                label: 'BACKGROUND TASK',
                ok: taskRegistered,
              },
              {
                label: 'WORKING HOURS',
                ok: inWorkingHours,
              },
            ].map(({ label, ok }) => (
              <View key={label} style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: ok ? '#fff' : '#2a2a2a' }]} />
                <Text style={[styles.statusLabel, { color: ok ? '#fff' : '#333' }]}>{label}</Text>
                <Text style={[styles.statusValue, { color: ok ? '#555' : '#222' }]}>
                  {ok ? 'ACTIVE' : 'INACTIVE'}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Test button ── */}
          <TouchableOpacity style={styles.testBtn} onPress={testNotification} activeOpacity={0.8}>
            <Text style={styles.testBtnText}>SEND TEST ALERT</Text>
          </TouchableOpacity>

          {/* ── Info ── */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoHeader}>HOW IT WORKS</Text>
            {[
              ['01', 'SET YOUR WORKING HOURS ABOVE'],
              ['02', 'TOGGLE THE SYSTEM ON'],
              ['03', 'BACKGROUND TASK RUNS EVERY 3 MIN'],
              ['04', 'ALERTS ONLY FIRE WITHIN YOUR HOURS'],
              ['05', 'SETTINGS PERSIST AFTER RESTART'],
            ].map(([n, t]) => (
              <View key={n} style={styles.infoRow}>
                <Text style={styles.infoNum}>{n}</Text>
                <Text style={styles.infoText}>{t}</Text>
              </View>
            ))}
          </View>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <View style={styles.footerLine} />
            <Text style={styles.footerText}>STAY HYDRATED. STAY SHARP.</Text>
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1f1f1f' },
  container: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 48,
  },

  // Header
  header: { width: '100%', marginBottom: 32 },
  headerLabel: {
    color: '#fff',
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'vissans-700-bold',
  },
  headerLine: { height: 1, backgroundColor: '#fff', width: '100%' },

  // Hero
  hero: { alignItems: 'center', marginBottom: 32, paddingVertical: 24 },
  heroSymbol: { color: '#fff', fontSize: 18, letterSpacing: 4, marginBottom: 8 },
  heroTitle: {
    color: 'lightblue',
    fontSize: 60,
    fontWeight: '900',
    letterSpacing: -4,
    lineHeight: 80,
  },
  heroSub: { color: '#d4d4d4', fontSize: 9, fontWeight: '700', letterSpacing: 10, marginTop: 8 },

  // Clock
  clockBlock: {
    width: '100%',
    backgroundColor: '#0d0d0d',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 24,
    marginBottom: 32,
    alignItems: 'center',
    borderRadius: 40,
  },
  clockTime: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 8,
  },
  clockStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clockDot: { width: 6, height: 6, borderRadius: 3 },
  clockStatus: { fontSize: 9, fontWeight: '700', letterSpacing: 5 },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1a1a1a' },
  dividerText: {
    color: '#d4d4d4',
    fontSize: 9,
    letterSpacing: 6,
    marginHorizontal: 12,
    fontWeight: '700',
  },

  // Time inputs
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    gap: 12,
  },
  timeBlock: { flex: 1, borderRadius: 30, },
  timeLabel: {
    color: '#d4d4d4',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 6,
    marginBottom: 8,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 20,
  },
  timeInput: {
    flex: 1,
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    padding: 14,
    textAlign: 'center',
    letterSpacing: 2,
    
  },
  timeSep: {
    color: '#d4d4d4',
    fontSize: 28,
    fontWeight: '900',
  },
  timeArrow: {
    color: '#d4d4d4',
    fontSize: 20,
    fontWeight: '300',
    
    marginTop: 22,
  },
  saveBtn: {
    backgroundColor: '#fff',
    width: '100%',
    padding: 18,
    alignItems: 'center',
    marginBottom: 32,
    borderRadius: 20,
  },
  saveBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 8,
    
  },

  // Toggle
  toggleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#0d0d0d',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 20,
    marginBottom: 16,
  },
  toggleInfo: { flex: 1 },
  toggleTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 5,
    marginBottom: 4,
  },
  toggleSub: { color: '#333', fontSize: 9, fontWeight: '600', letterSpacing: 3 },

  // Status panel
  statusPanel: {
    width: '100%',
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    padding: 20,
    marginBottom: 16,
    gap: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { flex: 1, fontSize: 10, fontWeight: '700', letterSpacing: 4 },
  statusValue: { fontSize: 9, fontWeight: '600', letterSpacing: 3 },

  // Test button
  testBtn: {
    borderWidth: 1,
    borderColor: '#fff',
    width: '100%',
    padding: 18,
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: '#000',
  },
  testBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 8,
  },

  // Info
  infoBlock: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingTop: 24,
    marginBottom: 32,
  },
  infoHeader: {
    color: '#222',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 8,
    marginBottom: 16,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 16 },
  infoNum: { color: '#222', fontSize: 9, fontWeight: '900', letterSpacing: 2, width: 20 },
  infoText: { color: '#333', fontSize: 9, fontWeight: '600', letterSpacing: 3, flex: 1 },

  // Footer
  footer: { width: '100%', alignItems: 'center' },
  footerLine: { height: 1, backgroundColor: '#1a1a1a', width: '100%', marginBottom: 16 },
  footerText: { color: '#2a2a2a', fontSize: 9, fontWeight: '700', letterSpacing: 6 },
});