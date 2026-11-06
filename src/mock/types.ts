export type LockState = 
  | 'LOCKED'       // Bolt extended, solenoid off, door closed
  | 'GESTURE'      // Turn in progress, acquiring telemetry
  | 'EVALUATING'   // Computing Gate 1 and Gate 2
  | 'UNLOCKING'    // Accepted: Solenoid energized, bolt retracting
  | 'DOOR_OPEN'    // Reed switch open (door pulled ajar)
  | 'RELOCKING'    // Door closed, bolt extending back
  | 'LOCKOUT'      // N failures reached, keypad/handle frozen
  | 'FAULT';       // Hardware fault / sensor disconnect

export type GateOutcome = 'ACCEPT' | 'REJECT' | 'TIMEOUT' | 'FAULT' | 'INVALID';

export type AdversaryRole = 'owner' | 'impostor' | 'mimicry_l1' | 'mimicry_l2';

export interface TelemetryFrame {
  t: number;           // seconds from touch (t = 0)
  force: number;       // Grip force (N)
  gyro: number;        // Angular velocity magnitude (deg/s)
  accel: number;       // Acceleration magnitude (m/s^2)
  phase: 'P1' | 'P2' | 'P3';
}

export interface FeatureVector {
  t_total: number;              // Total gesture duration (s)
  t_p1: number;                 // P1 duration (s)
  t_p2: number;                 // P2 rotation duration (s)
  t_p3: number;                 // P3 release duration (s)
  t_lag_force_gyro: number;     // Time lag between force onset & rotation (s)
  t_time_to_peak_force: number; // Time to max grip force (s)
  f_peak: number;               // Peak grip force (N)
  f_mean: number;               // Mean grip force during rotation (N)
  f_impulse: number;            // Force impulse (N*s)
  f_rfd: number;                // Max rate of force development (N/s)
  w_peak: number;               // Peak angular velocity (deg/s)
  w_excursion: number;          // Total rotation angle (deg)
  a_rms: number;                // RMS acceleration (m/s^2)
  a_peak_jerk: number;          // Peak jerk (m/s^3)
  corr_force_gyro: number;      // Correlation between force and gyro
  phase_overlap_ratio: number;  // Overlap ratio of active windows
}

export interface FeatureDeviation {
  featureKey: keyof FeatureVector;
  label: string;
  ownerMean: number;
  ownerStd: number;
  actualValue: number;
  zScore: number;
}

export interface AttemptRecord {
  id: string;                  // e.g. "S-2F9A"
  timestamp: string;           // ISO format
  sessionTag: 'S1' | 'S2' | 'S3' | 'S4';
  role: AdversaryRole;
  gate1Result: boolean;        // Fingerprint accept/reject
  gate1TemplateId: string;     // e.g. "FP_TPL_01" or "—"
  score: number;               // s(x) = -Mahalanobis distance
  tau: number;                 // Threshold tau
  decision: GateOutcome;
  failureCounterAtTime: number;
  rejectionReason?: string;
  features: FeatureVector;
  deviations: FeatureDeviation[];
  frames?: TelemetryFrame[];
}

export interface OwnerProfile {
  enrolled: boolean;
  enrollmentTrialsCount: number;
  modelType: string;
  featureSet: string;
  tau: number;
  lastUpdated: string;
  means: Record<keyof FeatureVector, number>;
  stds: Record<keyof FeatureVector, number>;
  leaveOneOutScores: number[];
  stabilityCurve: { trials: number; scoreStability: number }[];
}

export interface SensorHealth {
  hx711: boolean;
  mpuGyro: boolean;
  mpuAccel: boolean;
  fingerprint: boolean;
}
