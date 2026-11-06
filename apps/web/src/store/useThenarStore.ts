import { create } from 'zustand';
import type {
  AttemptRecord,
  AdversaryRole,
  GateOutcome,
  LockState,
  OwnerProfile,
  SensorHealth,
  TelemetryFrame
} from '../mock/types';
import {
  computeMahalanobisScore,
  defaultPRNG,
  extractFeatures,
  generateAttemptFrames,
  generateDefaultOwnerProfile,
  generateSeedAttempts
} from '../mock/engine';
import type { Language } from '../i18n';
import { apiClient } from '../api/client';
import { wsClient } from '../api/ws';

export interface AppNotification {
  id: string;
  timestamp: string;
  type: 'accept' | 'reject' | 'lockout' | 'fault' | 'door';
  titleKey: string;
  descKey: string;
  read: boolean;
}

interface ThenarState {
  // Gateway Connection & Fallback
  isGatewayOnline: boolean;
  gatewayMode: 'api' | 'fallback_mock';
  initApiAndWs: () => () => void;
  syncFromGateway: () => Promise<void>;

  // Appearance & Localization
  language: Language;
  theme: 'dark' | 'light';
  setLanguage: (lang: Language) => void;
  setTheme: (theme: 'dark' | 'light') => void;

  // Lock State Machine
  lockState: LockState;
  doorReedOpen: boolean;
  solenoidActive: boolean;
  boltRetracted: boolean;
  failureCounter: number;
  lockoutEndTime: number | null;
  lockoutDurationSeconds: number;
  lockoutRepeatCount: number;
  maxFailuresBeforeLockout: number;
  unlockHoldSeconds: number;
  activeGestureStep: 'idle' | 'touch' | 'grip' | 'turn' | 'release' | 'decision';

  // Hardware Link & Sensors
  esp32Online: boolean;
  wifiRssi: number;
  serviceSwitchEngaged: boolean;
  sensors: SensorHealth;
  injectSensorFault: boolean;
  setInjectSensorFault: (val: boolean) => void;
  setServiceSwitch: (val: boolean) => void;

  // Real-time Session & Attempts
  attempts: AttemptRecord[];
  activeSessionFrames: TelemetryFrame[];
  isStreaming: boolean;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;

  // Owner Profile
  ownerProfile: OwnerProfile;
  setOwnerProfile: (profile: OwnerProfile) => void;
  resetOwnerProfile: () => void;

  // Notifications
  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationsAsRead: () => void;
  clearNotifications: () => void;

  // Actions
  runSimulation: (role: AdversaryRole, gate1Override?: boolean) => Promise<AttemptRecord>;
  pullDoorOpen: () => void;
  closeDoor: () => void;
  checkLockoutExpiry: () => void;
  resetToSeedData: () => void;
  updateSettings: (settings: {
    maxFailures?: number;
    lockoutDuration?: number;
    unlockHold?: number;
  }) => void;
}

// Safe LocalStorage wrapper
const STORAGE_KEY = 'thenar_companion_state_v1';

function loadPersistedState(): Partial<ThenarState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load Thenar state from localStorage:', err);
  }
  return {};
}

function saveState(state: Partial<ThenarState>) {
  try {
    const toSave = {
      language: state.language,
      theme: state.theme,
      failureCounter: state.failureCounter,
      lockoutEndTime: state.lockoutEndTime,
      lockoutRepeatCount: state.lockoutRepeatCount,
      maxFailuresBeforeLockout: state.maxFailuresBeforeLockout,
      lockoutDurationSeconds: state.lockoutDurationSeconds,
      unlockHoldSeconds: state.unlockHoldSeconds,
      serviceSwitchEngaged: state.serviceSwitchEngaged,
      ownerProfile: state.ownerProfile,
      attempts: state.attempts,
      notifications: state.notifications,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.warn('Failed to persist Thenar state:', err);
  }
}

const saved = loadPersistedState();

export const useThenarStore = create<ThenarState>((set, get) => ({
  isGatewayOnline: false,
  gatewayMode: 'fallback_mock',

  initApiAndWs: () => {
    // 1. Connect WebSocket
    wsClient.connect();

    // 2. Subscribe to WebSocket events
    const unsubConn = wsClient.subscribe('connection_change', (data: any) => {
      const online = Boolean(data.online);
      set({
        isGatewayOnline: online,
        gatewayMode: online ? 'api' : 'fallback_mock',
        esp32Online: online
      });
      if (online) {
        get().syncFromGateway();
      }
    });

    const unsubFrame = wsClient.subscribe('frame', (data: any) => {
      if (Array.isArray(data.frames)) {
        set((state) => ({
          activeSessionFrames: [...state.activeSessionFrames, ...data.frames].slice(-300),
          isStreaming: true
        }));
      }
    });

    const unsubStatus = wsClient.subscribe('status', (data: any) => {
      if (data.data?.lock) {
        const lk = data.data.lock;
        let lockState: LockState = 'LOCKED';
        if (lk.state === 'accept' || lk.state === 'gesture') lockState = 'UNLOCKING';
        else if (lk.state === 'lockout') lockState = 'LOCKOUT';
        else if (lk.state === 'fault') lockState = 'FAULT';
        else if (lk.door === 'open') lockState = 'DOOR_OPEN';

        set({
          doorReedOpen: lk.door === 'open',
          boltRetracted: lk.bolt === 'retracted',
          solenoidActive: lk.solenoid === 'on',
          failureCounter: lk.failureCount,
          lockoutEndTime: lk.lockoutUntil,
          lockState
        });
      }
      if (data.data?.device) {
        set({
          wifiRssi: data.data.device.rssi,
          esp32Online: Boolean(data.data.device.online)
        });
      }
    });

    const unsubDecision = wsClient.subscribe('decision', (data: any) => {
      const att = data.attempt;
      if (att) {
        const attemptRecord: AttemptRecord = {
          id: att.id,
          timestamp: new Date(att.ts).toLocaleTimeString(),
          outcome: att.decision === 'accept' ? 'ACCEPT' : att.decision === 'reject' ? 'REJECT' : 'FAULT',
          gate1Minutiae: att.fingerprint.result === 'accept',
          gate2Score: att.score ?? -5.0,
          decisionTau: att.tau,
          latencyMs: att.durations?.totalMs || 2150,
          adversaryRole: (att.role as AdversaryRole) || 'owner',
          deviations: (att.featureDeviations || []).map((d: any) => ({
            featureKey: 'f_peak',
            label: d.name,
            ownerMean: 0,
            ownerStd: 1,
            actualValue: 0,
            zScore: d.z
          }))
        };

        set((state) => ({
          attempts: [attemptRecord, ...state.attempts].slice(0, 100),
          isStreaming: false,
          activeGestureStep: 'idle',
          boltRetracted: att.decision === 'accept',
          solenoidActive: att.decision === 'accept',
          lockState: att.decision === 'accept' ? 'UNLOCKING' : (att.failureCounterAfter >= state.maxFailuresBeforeLockout ? 'LOCKOUT' : 'LOCKED')
        }));

        if (att.decision === 'accept') {
          setTimeout(() => {
            set({ boltRetracted: false, solenoidActive: false, lockState: 'LOCKED' });
          }, get().unlockHoldSeconds * 1000);
        }
      }
    });

    const unsubNotif = wsClient.subscribe('notification', (data: any) => {
      const n = data.notification;
      if (n) {
        get().addNotification({
          type: n.severity === 'success' ? 'accept' : n.severity === 'error' ? 'fault' : 'reject',
          titleKey: n.messageKey,
          descKey: n.type
        });
      }
    });

    // Initial HTTP check
    get().syncFromGateway().catch(() => {
      set({ isGatewayOnline: false, gatewayMode: 'fallback_mock' });
    });

    return () => {
      unsubConn();
      unsubFrame();
      unsubStatus();
      unsubDecision();
      unsubNotif();
    };
  },

  syncFromGateway: async () => {
    try {
      const [status, attemptsData, settingsData] = await Promise.all([
        apiClient.getStatus(),
        apiClient.getAttempts({ limit: 50 }),
        apiClient.getSettings()
      ]);

      const formattedAttempts: AttemptRecord[] = attemptsData.items.map((att: any) => {
        const isAccept = att.decision === 'accept';
        const isTimeout = att.decision === 'timeout';
        const role = att.role === 'genuine' ? 'owner' : (att.role as AdversaryRole) || 'owner';
        return {
          id: att.id,
          timestamp: typeof att.ts === 'number' ? new Date(att.ts).toISOString() : (att.timestamp || new Date().toISOString()),
          sessionTag: (att.experimentSession as any) || 'S1',
          role: role,
          gate1Result: Boolean(att.fingerprint?.result === 'accept'),
          gate1TemplateId: att.fingerprint?.templateId || (att.fingerprint?.result === 'accept' ? 'FP_TPL_01' : '—'),
          score: typeof att.score === 'number' ? att.score : -2.5,
          tau: typeof att.tau === 'number' ? att.tau : -3.85,
          decision: (isAccept ? 'ACCEPT' : isTimeout ? 'TIMEOUT' : 'REJECT') as GateOutcome,
          failureCounterAtTime: att.failureCounterAfter ?? 0,
          rejectionReason: att.flags?.join(', ') || undefined,
          features: {
            t_total: (att.durations?.totalMs ? att.durations.totalMs / 1000 : 2.15),
            t_p1: 0.65,
            t_p2: 0.90,
            t_p3: 0.60,
            t_lag_force_gyro: 0.28,
            t_to_peak_force: 0.45,
            f_peak: 52.0,
            f_mean: 44.5,
            f_impulse: 38.2,
            f_rfd: 95.0,
            w_peak: 72.0,
            w_excursion: 48.0,
            a_rms: 1.45,
            a_peak_jerk: 14.5,
            corr_force_gyro: 0.84,
            phase_overlap_ratio: 0.72,
          },
          deviations: (att.featureDeviations || []).map((d: any) => ({
            featureKey: 'f_peak',
            label: d.name,
            ownerMean: 0,
            ownerStd: 1,
            actualValue: 0,
            zScore: typeof d.z === 'number' ? d.z : 0
          }))
        };
      });

      set({
        isGatewayOnline: true,
        gatewayMode: 'api',
        esp32Online: status.device.online,
        wifiRssi: status.device.rssi,
        doorReedOpen: status.lock.door === 'open',
        boltRetracted: status.lock.bolt === 'retracted',
        solenoidActive: status.lock.solenoid === 'on',
        failureCounter: status.lock.failureCount,
        lockoutEndTime: status.lock.lockoutUntil,
        maxFailuresBeforeLockout: settingsData.nFailuresBeforeLockout,
        lockoutDurationSeconds: settingsData.lockoutBaseSec,
        unlockHoldSeconds: Math.round(settingsData.solenoidHoldMs / 1000),
        attempts: formattedAttempts.length > 0 ? formattedAttempts : get().attempts
      });
    } catch {
      set({ isGatewayOnline: false, gatewayMode: 'fallback_mock' });
    }
  },

  language: saved.language || 'en',
  theme: saved.theme || 'light',

  setLanguage: (lang: Language) => {
    set({ language: lang });
    saveState(get());
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  },

  setTheme: (theme: 'dark' | 'light') => {
    set({ theme });
    saveState(get());
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
  },

  lockState: (saved.lockoutEndTime && saved.lockoutEndTime > Date.now()) ? 'LOCKOUT' : 'LOCKED',
  doorReedOpen: false,
  solenoidActive: false,
  boltRetracted: false,
  failureCounter: saved.failureCounter || 0,
  lockoutEndTime: saved.lockoutEndTime || null,
  lockoutDurationSeconds: saved.lockoutDurationSeconds || 60,
  lockoutRepeatCount: saved.lockoutRepeatCount || 0,
  maxFailuresBeforeLockout: saved.maxFailuresBeforeLockout || 5,
  unlockHoldSeconds: saved.unlockHoldSeconds || 3,
  activeGestureStep: 'idle',

  esp32Online: true,
  wifiRssi: -58,
  serviceSwitchEngaged: saved.serviceSwitchEngaged || false,
  sensors: {
    hx711: true,
    mpuGyro: true,
    mpuAccel: true,
    fingerprint: true,
  },
  injectSensorFault: false,
  setInjectSensorFault: (val: boolean) => set({ injectSensorFault: val }),
  setServiceSwitch: (val: boolean) => {
    set({ serviceSwitchEngaged: val });
    saveState(get());
  },

  attempts: saved.attempts && saved.attempts.length > 0 ? saved.attempts : generateSeedAttempts(),
  activeSessionFrames: [],
  isStreaming: false,
  playbackSpeed: 1.0,
  setPlaybackSpeed: (speed: number) => set({ playbackSpeed: speed }),

  ownerProfile: saved.ownerProfile || generateDefaultOwnerProfile(),
  setOwnerProfile: (profile: OwnerProfile) => {
    set({ ownerProfile: profile });
    saveState(get());
  },
  resetOwnerProfile: () => {
    const fresh = generateDefaultOwnerProfile();
    set({ ownerProfile: fresh });
    saveState(get());
  },

  notifications: saved.notifications || [
    {
      id: 'init-1',
      timestamp: new Date().toISOString(),
      type: 'accept',
      titleKey: 'notifications.unlock_success',
      descKey: 'dashboard.step_decision',
      read: false
    }
  ],

  addNotification: (n) => {
    const item: AppNotification = {
      ...n,
      id: 'notif-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      read: false,
    };
    const updated = [item, ...get().notifications].slice(0, 30);
    set({ notifications: updated });
    saveState(get());

    // Optional browser Notification prompt
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Thenar Smart Safe', { body: item.titleKey });
      } catch (e) {
        // Ignore background permission errors
      }
    }
  },

  markNotificationsAsRead: () => {
    const updated = get().notifications.map(n => ({ ...n, read: true }));
    set({ notifications: updated });
    saveState(get());
  },

  clearNotifications: () => {
    set({ notifications: [] });
    saveState(get());
  },

  checkLockoutExpiry: () => {
    const state = get();
    if (state.lockoutEndTime && Date.now() >= state.lockoutEndTime) {
      set({
        lockoutEndTime: null,
        lockState: 'LOCKED',
        failureCounter: 0,
      });
      state.addNotification({
        type: 'accept',
        titleKey: 'notifications.lockout_end',
        descKey: 'status.lockout_normal',
      });
      saveState(get());
    }
  },

  pullDoorOpen: () => {
    const { lockState, boltRetracted } = get();
    if (boltRetracted || lockState === 'UNLOCKING') {
      set({ doorReedOpen: true, lockState: 'DOOR_OPEN' });
      get().addNotification({
        type: 'door',
        titleKey: 'notifications.door_ajar',
        descKey: 'status.state_open',
      });
    }
  },

  closeDoor: () => {
    const { lockState } = get();
    if (lockState === 'DOOR_OPEN') {
      set({ lockState: 'RELOCKING' });
      setTimeout(() => {
        set({
          doorReedOpen: false,
          boltRetracted: false,
          solenoidActive: false,
          lockState: 'LOCKED',
        });
      }, 700);
    }
  },

  updateSettings: (newSettings) => {
    set(state => ({
      ...state,
      maxFailuresBeforeLockout: newSettings.maxFailures ?? state.maxFailuresBeforeLockout,
      lockoutDurationSeconds: newSettings.lockoutDuration ?? state.lockoutDurationSeconds,
      unlockHoldSeconds: newSettings.unlockHold ?? state.unlockHoldSeconds,
    }));
    saveState(get());
  },

  resetToSeedData: () => {
    const seed = generateSeedAttempts();
    const prof = generateDefaultOwnerProfile();
    set({
      attempts: seed,
      ownerProfile: prof,
      failureCounter: 0,
      lockoutEndTime: null,
      lockoutRepeatCount: 0,
      lockState: 'LOCKED',
      doorReedOpen: false,
      boltRetracted: false,
      solenoidActive: false,
      notifications: [],
    });
    saveState(get());
  },

  runSimulation: async (role: AdversaryRole, gate1Override?: boolean) => {
    const state = get();
    state.checkLockoutExpiry();

    if (state.lockState === 'LOCKOUT') {
      throw new Error('Safe is in Lockout state. Telemetry acquisition locked.');
    }

    // Real Gateway API call if connected
    if (state.isGatewayOnline && state.gatewayMode === 'api') {
      try {
        let scenario = 'owner-unlock';
        if (role === 'impostor') {
          scenario = gate1Override ? 'fingerprint-accepted-impostor' : 'impostor';
        } else if (role === 'mimic_l1') {
          scenario = 'mimic-l1';
        } else if (role === 'mimic_l2') {
          scenario = 'mimic-l2';
        }

        if (state.injectSensorFault) {
          scenario = 'sensor-fault';
        }

        set({ lockState: 'GESTURE', activeGestureStep: 'touch', isStreaming: true });
        const res = await apiClient.simulateScenario(scenario);
        const att = res.attempt;

        const attemptRecord: AttemptRecord = {
          id: att.id,
          timestamp: new Date(att.ts).toLocaleTimeString(),
          outcome: att.decision === 'accept' ? 'ACCEPT' : att.decision === 'reject' ? 'REJECT' : 'FAULT',
          gate1Minutiae: att.fingerprint.result === 'accept',
          gate2Score: att.score ?? -5.0,
          decisionTau: att.tau,
          latencyMs: att.durations?.totalMs || 2150,
          adversaryRole: role,
          deviations: (att.featureDeviations || []).map((d: any) => ({
            featureKey: 'f_peak',
            label: d.name,
            ownerMean: 0,
            ownerStd: 1,
            actualValue: 0,
            zScore: d.z
          }))
        };

        set((s) => ({
          attempts: [attemptRecord, ...s.attempts].slice(0, 100),
          isStreaming: false,
          activeGestureStep: 'idle'
        }));

        return attemptRecord;
      } catch (err) {
        console.warn('Gateway simulate API call failed, falling back to local mock engine:', err);
      }
    }

    const injectFault = state.injectSensorFault;

    // Phase 1: Touch & Scan
    set({ lockState: 'GESTURE', activeGestureStep: 'touch', isStreaming: true });
    await new Promise(r => setTimeout(r, 350 / state.playbackSpeed));

    // Phase 2: Grip Build-up
    set({ activeGestureStep: 'grip' });
    await new Promise(r => setTimeout(r, 450 / state.playbackSpeed));

    // Phase 3: Handle Rotation
    set({ activeGestureStep: 'turn' });
    await new Promise(r => setTimeout(r, 550 / state.playbackSpeed));

    // Phase 4: Release & Return
    set({ activeGestureStep: 'release' });
    await new Promise(r => setTimeout(r, 400 / state.playbackSpeed));

    // Generate raw 100 Hz frames
    const frames = generateAttemptFrames(role, 'S4', defaultPRNG, injectFault);
    set({ activeSessionFrames: frames });

    // Phase 5: Decision
    set({ lockState: 'EVALUATING', activeGestureStep: 'decision' });
    await new Promise(r => setTimeout(r, 400 / state.playbackSpeed));

    if (injectFault) {
      set({
        lockState: 'FAULT',
        isStreaming: false,
        activeGestureStep: 'idle',
        sensors: { ...state.sensors, hx711: false },
      });
      state.addNotification({
        type: 'fault',
        titleKey: 'notifications.sensor_fault',
        descKey: 'status.state_fault',
      });
      setTimeout(() => {
        set({ lockState: 'LOCKED', sensors: { ...state.sensors, hx711: true } });
      }, 3000);
      throw new Error('Hardware fault injected: HX711 sensor timed out');
    }

    const features = extractFeatures(frames);
    const { score, deviations } = computeMahalanobisScore(
      features,
      state.ownerProfile.means,
      state.ownerProfile.stds
    );

    const gate1Result = gate1Override !== undefined ? gate1Override : (role === 'owner');
    const tau = state.ownerProfile.tau;
    const isAccepted = gate1Result && score >= tau;

    const record: AttemptRecord = {
      id: `S-S4-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      sessionTag: 'S4',
      role,
      gate1Result,
      gate1TemplateId: gate1Result ? 'FP_TPL_01' : '—',
      score,
      tau,
      decision: isAccepted ? 'ACCEPT' : 'REJECT',
      failureCounterAtTime: isAccepted ? 0 : state.failureCounter + 1,
      rejectionReason: !isAccepted 
        ? (!gate1Result ? 'Gate 1 (Fingerprint mismatch)' : `Gate 2 s(x)=${score} < τ=${tau}`)
        : undefined,
      features,
      deviations,
      frames,
    };

    // Update attempts log
    const updatedAttempts = [record, ...state.attempts];

    if (isAccepted) {
      // Unlocking sequence
      set({
        lockState: 'UNLOCKING',
        solenoidActive: true,
        boltRetracted: true,
        failureCounter: 0,
        attempts: updatedAttempts,
        isStreaming: false,
        activeGestureStep: 'idle',
      });

      state.addNotification({
        type: 'accept',
        titleKey: 'notifications.unlock_success',
        descKey: 'dashboard.step_decision',
      });

      // Solenoid hold interval (default 3 seconds), then bolt extends back unless door is pulled open
      setTimeout(() => {
        const cur = get();
        if (cur.lockState === 'UNLOCKING' && !cur.doorReedOpen) {
          set({
            lockState: 'RELOCKING',
            solenoidActive: false,
          });
          setTimeout(() => {
            set({
              lockState: 'LOCKED',
              boltRetracted: false,
            });
          }, 600);
        }
      }, state.unlockHoldSeconds * 1000);

    } else {
      // Rejection sequence
      const newFailureCount = state.failureCounter + 1;
      const isLockoutTriggered = newFailureCount >= state.maxFailuresBeforeLockout;

      if (isLockoutTriggered) {
        // Escalating lockout duration
        const duration = state.lockoutDurationSeconds * Math.pow(2, state.lockoutRepeatCount);
        const lockoutEndTime = Date.now() + duration * 1000;

        set({
          lockState: 'LOCKOUT',
          failureCounter: newFailureCount,
          lockoutEndTime,
          lockoutRepeatCount: state.lockoutRepeatCount + 1,
          attempts: updatedAttempts,
          isStreaming: false,
          activeGestureStep: 'idle',
        });

        state.addNotification({
          type: 'lockout',
          titleKey: 'notifications.lockout_start',
          descKey: 'status.state_lockout',
        });
      } else {
        set({
          lockState: 'LOCKED',
          failureCounter: newFailureCount,
          attempts: updatedAttempts,
          isStreaming: false,
          activeGestureStep: 'idle',
        });

        state.addNotification({
          type: 'reject',
          titleKey: 'notifications.unlock_fail',
          descKey: record.rejectionReason || 'status.state_locked',
        });
      }
    }

    saveState(get());
    return record;
  }
}));
