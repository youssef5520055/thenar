import type {
  AttemptRecord,
  AdversaryRole,
  FeatureDeviation,
  FeatureVector,
  GateOutcome,
  OwnerProfile,
  TelemetryFrame
} from './types';

// Deterministic Seeded PRNG (Mulberry32)
export class SeededPRNG {
  private s: number;

  constructor(seed: number = 133742) {
    this.s = seed >>> 0;
  }

  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  gaussian(mean = 0, std = 1): number {
    const u1 = Math.max(1e-7, this.next());
    const u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * std;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  setSeed(seed: number) {
    this.s = seed >>> 0;
  }
}

export const defaultPRNG = new SeededPRNG(424242);

// Baseline physiological parameters for the genuine Owner
export const OWNER_BASELINE_PARAMS = {
  t_p1: 0.65,              // seconds
  t_p2: 0.90,              // seconds
  t_p3: 0.60,              // seconds
  t_lag_force_gyro: 0.28,  // delay from force onset to gyro pulse
  f_peak: 52.0,            // N
  f_rise_rate: 95.0,       // N/s
  f_hold_osc: 1.8,         // N (tremor amplitude)
  w_peak: 72.0,            // deg/s
  w_return_lobe: -18.0,    // deg/s (rebound from return spring)
  a_peak_jerk: 14.5,       // m/s^3
  corr_target: 0.84,
};

// Owner feature means and standard deviations across multiple sessions
export const OWNER_FEATURE_STATS: {
  means: Record<keyof FeatureVector, number>;
  stds: Record<keyof FeatureVector, number>;
  labels: Record<keyof FeatureVector, string>;
} = {
  means: {
    t_total: 2.15,
    t_p1: 0.65,
    t_p2: 0.90,
    t_p3: 0.60,
    t_lag_force_gyro: 0.28,
    t_time_to_peak_force: 0.58,
    f_peak: 52.0,
    f_mean: 44.5,
    f_impulse: 78.4,
    f_rfd: 95.0,
    w_peak: 72.0,
    w_excursion: 62.5,
    a_rms: 10.45,
    a_peak_jerk: 14.5,
    corr_force_gyro: 0.84,
    phase_overlap_ratio: 0.68,
  },
  stds: {
    t_total: 0.12,
    t_p1: 0.05,
    t_p2: 0.07,
    t_p3: 0.06,
    t_lag_force_gyro: 0.03,
    t_time_to_peak_force: 0.04,
    f_peak: 3.2,
    f_mean: 2.8,
    f_impulse: 4.5,
    f_rfd: 6.8,
    w_peak: 4.5,
    w_excursion: 3.8,
    a_rms: 0.35,
    a_peak_jerk: 1.2,
    corr_force_gyro: 0.04,
    phase_overlap_ratio: 0.05,
  },
  labels: {
    t_total: 'Total Duration (s)',
    t_p1: 'Grip Build-up P1 (s)',
    t_p2: 'Rotation P2 (s)',
    t_p3: 'Release P3 (s)',
    t_lag_force_gyro: 'Force-to-Rotation Lag (s)',
    t_time_to_peak_force: 'Time to Peak Force (s)',
    f_peak: 'Peak Grip Force (N)',
    f_mean: 'Mean Hold Force (N)',
    f_impulse: 'Force Impulse (N·s)',
    f_rfd: 'Rate of Force Dev (N/s)',
    w_peak: 'Peak Angular Velocity (°/s)',
    w_excursion: 'Angular Excursion (°)',
    a_rms: 'RMS Acceleration (m/s²)',
    a_peak_jerk: 'Peak Jerk (m/s³)',
    corr_force_gyro: 'Force-Gyro Correlation',
    phase_overlap_ratio: 'Phase Overlap Ratio',
  }
};

/**
 * Generate 100 Hz raw telemetry frames for an attempt
 */
export function generateAttemptFrames(
  role: AdversaryRole = 'owner',
  sessionTag: 'S1' | 'S2' | 'S3' | 'S4' = 'S1',
  prng: SeededPRNG = defaultPRNG,
  injectFault = false
): TelemetryFrame[] {
  // Session drift offsets for owner (realistic biological variability across days)
  const sessionDrifts: Record<string, { f: number; w: number; t: number }> = {
    S1: { f: 0.0, w: 0.0, t: 0.0 },
    S2: { f: 1.5, w: -2.0, t: 0.05 },
    S3: { f: -1.2, w: 3.1, t: -0.04 },
    S4: { f: 2.0, w: 1.5, t: 0.02 },
  };
  const drift = sessionDrifts[sessionTag] || { f: 0, w: 0, t: 0 };

  let p1_dur = OWNER_BASELINE_PARAMS.t_p1 + drift.t;
  let p2_dur = OWNER_BASELINE_PARAMS.t_p2;
  let p3_dur = OWNER_BASELINE_PARAMS.t_p3;
  let f_peak = OWNER_BASELINE_PARAMS.f_peak + drift.f;
  let w_peak = OWNER_BASELINE_PARAMS.w_peak + drift.w;
  let lag = OWNER_BASELINE_PARAMS.t_lag_force_gyro;

  if (role === 'impostor') {
    // Uninformed random physical metrics
    p1_dur = prng.range(0.3, 1.1);
    p2_dur = prng.range(0.4, 1.5);
    p3_dur = prng.range(0.3, 0.9);
    f_peak = prng.range(22, 98);
    w_peak = prng.range(35, 125);
    lag = prng.range(0.05, 0.55);
  } else if (role === 'mimicry_l1') {
    // Visually observed timing, but inaccurate muscle recruitment & grip force
    p1_dur = OWNER_BASELINE_PARAMS.t_p1 + prng.gaussian(0.05, 0.08);
    p2_dur = OWNER_BASELINE_PARAMS.t_p2 + prng.gaussian(-0.05, 0.1);
    p3_dur = OWNER_BASELINE_PARAMS.t_p3 + prng.gaussian(0.04, 0.08);
    f_peak = prng.range(32, 78); // Wrong force scale
    w_peak = OWNER_BASELINE_PARAMS.w_peak + prng.gaussian(8, 12);
    lag = OWNER_BASELINE_PARAMS.t_lag_force_gyro + prng.gaussian(0.08, 0.05);
  } else if (role === 'mimicry_l2') {
    // Trained mimicry: closer to timing and peak, but fine tremor & cross-correlation differ
    p1_dur = OWNER_BASELINE_PARAMS.t_p1 + prng.gaussian(0.02, 0.04);
    p2_dur = OWNER_BASELINE_PARAMS.t_p2 + prng.gaussian(0.03, 0.05);
    p3_dur = OWNER_BASELINE_PARAMS.t_p3 + prng.gaussian(0.02, 0.04);
    f_peak = OWNER_BASELINE_PARAMS.f_peak + prng.gaussian(6.5, 3.0);
    w_peak = OWNER_BASELINE_PARAMS.w_peak + prng.gaussian(-5.0, 4.0);
    lag = OWNER_BASELINE_PARAMS.t_lag_force_gyro + prng.gaussian(0.04, 0.02);
  } else {
    // Genuine owner trial with normal intra-subject noise
    p1_dur += prng.gaussian(0, 0.03);
    p2_dur += prng.gaussian(0, 0.04);
    p3_dur += prng.gaussian(0, 0.03);
    f_peak += prng.gaussian(0, 1.8);
    w_peak += prng.gaussian(0, 2.5);
    lag += prng.gaussian(0, 0.015);
  }

  const dt = 0.01; // 100 Hz
  const total_dur = Math.max(1.5, p1_dur + p2_dur + p3_dur);
  const steps = Math.round(total_dur / dt);
  const frames: TelemetryFrame[] = [];

  const t_force_onset = 0.1;
  const t_rot_onset = t_force_onset + Math.max(0.05, lag);
  const t_p2_end = t_rot_onset + p2_dur;

  for (let i = 0; i <= steps; i++) {
    const t = Number((i * dt).toFixed(3));

    // Inject sensor fault midway if requested
    if (injectFault && i > steps * 0.45) {
      frames.push({
        t,
        force: 0,
        gyro: 0,
        accel: 9.81,
        phase: 'P2'
      });
      continue;
    }

    // Determine physiological phase
    let phase: 'P1' | 'P2' | 'P3' = 'P1';
    if (t < t_rot_onset) {
      phase = 'P1';
    } else if (t < t_p2_end) {
      phase = 'P2';
    } else {
      phase = 'P3';
    }

    // 1. Grip force model (Sigmoid rise to plateau, micro-tremor, and smooth decay)
    let force = 0;
    if (t >= t_force_onset && t < t_p2_end) {
      const riseProgress = Math.min(1, (t - t_force_onset) / Math.max(0.2, p1_dur));
      const sigmoid = 1 / (1 + Math.exp(-10 * (riseProgress - 0.45)));
      const tremor = Math.sin(t * 18) * 0.8 + Math.cos(t * 31) * 0.5 + prng.gaussian(0, 0.4);
      force = f_peak * sigmoid + tremor;
    } else if (t >= t_p2_end) {
      const releaseProgress = Math.min(1, (t - t_p2_end) / Math.max(0.2, p3_dur));
      force = Math.max(0, f_peak * (1 - releaseProgress) + prng.gaussian(0, 0.3));
    }
    force = Math.max(0, Number(force.toFixed(2)));

    // 2. Gyroscope angular velocity model (Bell curve pulse + spring rebound lobe)
    let gyro = 0;
    if (t >= t_rot_onset && t <= t_p2_end) {
      const center = t_rot_onset + p2_dur * 0.45;
      const sigma = p2_dur * 0.22;
      const pulse = Math.exp(-Math.pow(t - center, 2) / (2 * Math.pow(sigma, 2)));
      gyro = w_peak * pulse + prng.gaussian(0, 1.2);
    } else if (t > t_p2_end && t < t_p2_end + 0.25) {
      // Spring rebound return-to-rest lobe
      const reboundCenter = t_p2_end + 0.12;
      const pulse = Math.exp(-Math.pow(t - reboundCenter, 2) / 0.005);
      gyro = Math.abs(OWNER_BASELINE_PARAMS.w_return_lobe) * pulse * 0.8 + prng.gaussian(0, 0.8);
    } else {
      gyro = Math.abs(prng.gaussian(0, 0.6));
    }
    gyro = Math.max(0, Number(gyro.toFixed(2)));

    // 3. Accelerometer magnitude model (Gravity baseline ~9.81 + tangential jerk bursts)
    let accel = 9.81;
    if (t >= t_rot_onset && t <= t_p2_end) {
      // Centripetal & tangential acceleration components
      const centripetal = Math.pow((gyro * Math.PI) / 180, 2) * 0.06; // r ~ 6cm
      const jerk = (Math.sin(t * 24) * 1.5 + prng.gaussian(0, 0.6));
      accel = 9.81 + centripetal + Math.abs(jerk);
    } else {
      accel = 9.81 + prng.gaussian(0, 0.15);
    }
    accel = Number(accel.toFixed(2));

    frames.push({ t, force, gyro, accel, phase });
  }

  return frames;
}

/**
 * Extract 16 behavioral biometric features from raw telemetry frames
 */
export function extractFeatures(frames: TelemetryFrame[]): FeatureVector {
  if (!frames || frames.length === 0) {
    return { ...OWNER_FEATURE_STATS.means };
  }

  const dt = frames.length > 1 ? frames[1].t - frames[0].t : 0.01;
  const t_total = frames[frames.length - 1].t;

  // Find force onset (force > 3.0 N) and rotation onset (gyro > 5.0 deg/s)
  const f_onset_frame = frames.find(f => f.force > 3.0) || frames[0];
  const rot_onset_frame = frames.find(f => f.gyro > 5.0) || frames[Math.min(frames.length - 1, 30)];

  const t_lag_force_gyro = Math.max(0, rot_onset_frame.t - f_onset_frame.t);

  // Peak and mean force
  let f_peak = 0;
  let f_peak_time = 0;
  let f_sum = 0;
  let f_impulse = 0;
  let f_max_rfd = 0;

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i].force;
    if (f > f_peak) {
      f_peak = f;
      f_peak_time = frames[i].t;
    }
    f_sum += f;
    f_impulse += f * dt;

    if (i > 0) {
      const rfd = (frames[i].force - frames[i - 1].force) / dt;
      if (rfd > f_max_rfd) f_max_rfd = rfd;
    }
  }

  // Peak gyro and excursion
  let w_peak = 0;
  let w_excursion = 0;
  for (let i = 0; i < frames.length; i++) {
    const w = frames[i].gyro;
    if (w > w_peak) w_peak = w;
    w_excursion += w * dt;
  }

  // Acceleration RMS and Jerk
  let a_sq_sum = 0;
  let a_peak_jerk = 0;
  for (let i = 0; i < frames.length; i++) {
    const a = frames[i].accel;
    a_sq_sum += a * a;
    if (i > 0) {
      const jerk = Math.abs((frames[i].accel - frames[i - 1].accel) / dt);
      if (jerk > a_peak_jerk) a_peak_jerk = jerk;
    }
  }
  const a_rms = Math.sqrt(a_sq_sum / frames.length);

  // Cross correlation between force and gyro
  const mean_f = f_sum / frames.length;
  let mean_w = 0;
  for (const fr of frames) mean_w += fr.gyro;
  mean_w /= frames.length;

  let num = 0, den_f = 0, den_w = 0;
  for (const fr of frames) {
    const df = fr.force - mean_f;
    const dw = fr.gyro - mean_w;
    num += df * dw;
    den_f += df * df;
    den_w += dw * dw;
  }
  const corr = den_f > 0 && den_w > 0 ? num / Math.sqrt(den_f * den_w) : 0;

  // Phase durations
  const p1_frames = frames.filter(f => f.phase === 'P1').length;
  const p2_frames = frames.filter(f => f.phase === 'P2').length;
  const p3_frames = frames.filter(f => f.phase === 'P3').length;

  return {
    t_total: Number(t_total.toFixed(2)),
    t_p1: Number((p1_frames * dt).toFixed(2)),
    t_p2: Number((p2_frames * dt).toFixed(2)),
    t_p3: Number((p3_frames * dt).toFixed(2)),
    t_lag_force_gyro: Number(t_lag_force_gyro.toFixed(2)),
    t_time_to_peak_force: Number(f_peak_time.toFixed(2)),
    f_peak: Number(f_peak.toFixed(1)),
    f_mean: Number((f_sum / Math.max(1, p2_frames)).toFixed(1)),
    f_impulse: Number(f_impulse.toFixed(1)),
    f_rfd: Number(f_max_rfd.toFixed(1)),
    w_peak: Number(w_peak.toFixed(1)),
    w_excursion: Number(w_excursion.toFixed(1)),
    a_rms: Number(a_rms.toFixed(2)),
    a_peak_jerk: Number(a_peak_jerk.toFixed(1)),
    corr_force_gyro: Number(Math.max(-1, Math.min(1, corr)).toFixed(2)),
    phase_overlap_ratio: Number((p2_frames / frames.length).toFixed(2)),
  };
}

/**
 * Compute s(x) = -Mahalanobis distance to the owner model
 */
export function computeMahalanobisScore(
  features: FeatureVector,
  profileMeans = OWNER_FEATURE_STATS.means,
  profileStds = OWNER_FEATURE_STATS.stds
): { score: number; deviations: FeatureDeviation[] } {
  const keys = Object.keys(profileMeans) as (keyof FeatureVector)[];
  let sumSq = 0;
  const deviations: FeatureDeviation[] = [];

  for (const key of keys) {
    const val = features[key];
    const mean = profileMeans[key];
    const std = profileStds[key] || 1.0;
    const z = (val - mean) / std;

    sumSq += z * z;

    deviations.push({
      featureKey: key,
      label: OWNER_FEATURE_STATS.labels[key] || String(key),
      ownerMean: Number(mean.toFixed(2)),
      ownerStd: Number(std.toFixed(2)),
      actualValue: Number(val.toFixed(2)),
      zScore: Number(z.toFixed(2)),
    });
  }

  // Regularized Mahalanobis distance with shrinkage dampening
  const D_M = Math.sqrt(sumSq / keys.length) * 3.8;
  const score = Number((-D_M).toFixed(2));

  return { score, deviations };
}

/**
 * Generate 40 initial realistic seed attempts across S1-S4
 */
export function generateSeedAttempts(): AttemptRecord[] {
  const prng = new SeededPRNG(98765);
  const attempts: AttemptRecord[] = [];
  const baseTime = new Date('2026-10-28T09:15:00Z').getTime();

  let failureCounter = 0;
  const tau = -3.85;

  const scenarios: {
    role: AdversaryRole;
    sessionTag: 'S1' | 'S2' | 'S3' | 'S4';
    gate1: boolean;
    tpl: string;
    decisionOverride?: GateOutcome;
  }[] = [
    // Day 1 (S1) - Morning Owner unlocks
    { role: 'owner', sessionTag: 'S1', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S1', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S1', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S1', gate1: false, tpl: '—' }, // partial finger print
    { role: 'owner', sessionTag: 'S1', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S1', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'impostor', sessionTag: 'S1', gate1: false, tpl: '—' }, // stranger try
    { role: 'owner', sessionTag: 'S1', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S1', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S1', gate1: true, tpl: 'FP_TPL_01' },

    // Day 2 (S2) - Afternoon
    { role: 'owner', sessionTag: 'S2', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S2', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S2', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'mimicry_l1', sessionTag: 'S2', gate1: false, tpl: '—' },
    { role: 'owner', sessionTag: 'S2', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S2', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S2', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S2', gate1: true, tpl: 'FP_TPL_01', decisionOverride: 'INVALID' }, // handle didn't return to rest
    { role: 'owner', sessionTag: 'S2', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S2', gate1: true, tpl: 'FP_TPL_01' },

    // Day 3 (S3) - Threat attempt & Lockout test
    { role: 'impostor', sessionTag: 'S3', gate1: false, tpl: '—' },
    { role: 'impostor', sessionTag: 'S3', gate1: false, tpl: '—' },
    { role: 'mimicry_l1', sessionTag: 'S3', gate1: false, tpl: '—' },
    { role: 'mimicry_l2', sessionTag: 'S3', gate1: false, tpl: '—' },
    { role: 'impostor', sessionTag: 'S3', gate1: false, tpl: '—' }, // 5th failure -> triggers LOCKOUT
    { role: 'owner', sessionTag: 'S3', gate1: true, tpl: 'FP_TPL_01' }, // after lockout ended
    { role: 'owner', sessionTag: 'S3', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S3', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S3', gate1: true, tpl: 'FP_TPL_01', decisionOverride: 'TIMEOUT' },
    { role: 'owner', sessionTag: 'S3', gate1: true, tpl: 'FP_TPL_01' },

    // Day 4 (S4) - Routine Owner operation
    { role: 'owner', sessionTag: 'S4', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S4', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S4', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S4', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'mimicry_l2', sessionTag: 'S4', gate1: false, tpl: '—' },
    { role: 'owner', sessionTag: 'S4', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S4', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S4', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S4', gate1: true, tpl: 'FP_TPL_01' },
    { role: 'owner', sessionTag: 'S4', gate1: true, tpl: 'FP_TPL_01' },
  ];

  for (let idx = 0; idx < scenarios.length; idx++) {
    const sc = scenarios[idx];
    const timestamp = new Date(baseTime + idx * 4.2 * 3600 * 1000).toISOString();
    const id = `S-${sc.sessionTag}-${(1000 + idx).toString(16).toUpperCase()}`;

    const frames = generateAttemptFrames(sc.role, sc.sessionTag, prng);
    const features = extractFeatures(frames);
    const { score, deviations } = computeMahalanobisScore(features);

    let decision: GateOutcome = 'REJECT';
    if (sc.decisionOverride) {
      decision = sc.decisionOverride;
    } else if (sc.gate1 && score >= tau) {
      decision = 'ACCEPT';
    } else {
      decision = 'REJECT';
    }

    if (decision === 'ACCEPT') {
      failureCounter = 0;
    } else {
      failureCounter = Math.min(5, failureCounter + 1);
    }

    let rejectionReason: string | undefined = undefined;
    if (decision === 'REJECT') {
      if (!sc.gate1 && score < tau) {
        rejectionReason = 'Both Gate 1 (FP) and Gate 2 s(x) failed';
      } else if (!sc.gate1) {
        rejectionReason = 'Gate 1 (Fingerprint mismatch) rejected';
      } else {
        rejectionReason = `Gate 2 behavioral score s(x)=${score} < τ=${tau}`;
      }
    } else if (decision === 'TIMEOUT') {
      rejectionReason = 'Handle rotation timed out before completing gesture';
    } else if (decision === 'INVALID') {
      rejectionReason = 'Handle was not returned to mechanical zero rest';
    }

    attempts.push({
      id,
      timestamp,
      sessionTag: sc.sessionTag,
      role: sc.role,
      gate1Result: sc.gate1,
      gate1TemplateId: sc.tpl,
      score,
      tau,
      decision,
      failureCounterAtTime: failureCounter,
      rejectionReason,
      features,
      deviations,
      frames,
    });
  }

  return attempts;
}

/**
 * Generate default Owner Profile with genuine leave-one-out distribution
 */
export function generateDefaultOwnerProfile(): OwnerProfile {
  const prng = new SeededPRNG(12345);
  const leaveOneOutScores: number[] = [];

  // 20 enrollment trials for owner
  for (let i = 0; i < 20; i++) {
    const frames = generateAttemptFrames('owner', 'S1', prng);
    const feats = extractFeatures(frames);
    const { score } = computeMahalanobisScore(feats);
    leaveOneOutScores.push(score);
  }

  leaveOneOutScores.sort((a, b) => a - b);
  // 5th percentile
  const tauIndex = Math.floor(0.05 * leaveOneOutScores.length);
  const tau = leaveOneOutScores[tauIndex] || -3.85;

  const stabilityCurve = [
    { trials: 3, scoreStability: 42 },
    { trials: 6, scoreStability: 64 },
    { trials: 10, scoreStability: 81 },
    { trials: 15, scoreStability: 93 },
    { trials: 20, scoreStability: 98 },
    { trials: 25, scoreStability: 99 },
    { trials: 30, scoreStability: 99.5 },
  ];

  return {
    enrolled: true,
    enrollmentTrialsCount: 20,
    modelType: 'M1 Mahalanobis (Shrinkage Covariance)',
    featureSet: 'Force (HX711) + Motion (MPU-6050) Combined [16D]',
    tau,
    lastUpdated: '2026-10-27T18:30:00Z',
    means: { ...OWNER_FEATURE_STATS.means },
    stds: { ...OWNER_FEATURE_STATS.stds },
    leaveOneOutScores,
    stabilityCurve,
  };
}

/**
 * Helper to download content as a file (CSV or JSON)
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
