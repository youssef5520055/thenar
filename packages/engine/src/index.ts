/**
 * @file packages/engine/src/index.ts
 * @package @thenar/engine
 * @description Core behavioral biometric kinematic synthesis, feature extraction, and Mahalanobis scoring engine.
 *
 * PURPOSE:
 * Serves as the shared mathematical kernel used by:
 * 1. The offline / fallback in-browser engine in `apps/web`.
 * 2. The physical ESP32 device simulator in `apps/device-sim`.
 * 3. The cross-language golden-vector verification tests (TypeScript vs Python).
 *
 * WHY THIS EXISTS:
 * Guarantees that kinematic frame generation, 16-D feature extraction, and Mahalanobis distance scoring
 * are 100% numerically identical across both client and server simulation.
 */

export interface TelemetryFrame {
  t: number;          // timestamp in seconds (0.00 to ~2.50)
  force: number;      // Grip force in Newtons
  gyro: number;       // Angular velocity in deg/sec
  accel: number;      // Acceleration magnitude in m/s^2
  phase: 'P1' | 'P2' | 'P3'; // Physiological phase
}

export interface FeatureVector {
  t_total: number;
  t_p1: number;
  t_p2: number;
  t_p3: number;
  t_lag_force_gyro: number;
  t_time_to_peak_force: number;
  f_peak: number;
  f_mean: number;
  f_impulse: number;
  f_rfd: number;
  w_peak: number;
  w_excursion: number;
  a_rms: number;
  a_peak_jerk: number;
  corr_force_gyro: number;
  phase_overlap_ratio: number;
}

export const CANONICAL_FEATURE_NAMES: (keyof FeatureVector)[] = [
  't_total',
  't_p1',
  't_p2',
  't_p3',
  't_lag_force_gyro',
  't_time_to_peak_force',
  'f_peak',
  'f_mean',
  'f_impulse',
  'f_rfd',
  'w_peak',
  'w_excursion',
  'a_rms',
  'a_peak_jerk',
  'corr_force_gyro',
  'phase_overlap_ratio'
];

export interface FeatureDeviation {
  featureKey: keyof FeatureVector;
  label: string;
  ownerMean: number;
  ownerStd: number;
  actualValue: number;
  zScore: number;
}

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

export const OWNER_BASELINE_PARAMS = {
  t_p1: 0.65,
  t_p2: 0.90,
  t_p3: 0.60,
  t_lag_force_gyro: 0.28,
  f_peak: 52.0,
  f_rise_rate: 95.0,
  f_hold_osc: 1.8,
  w_peak: 72.0,
  w_return_lobe: -18.0,
  a_peak_jerk: 14.5,
  corr_target: 0.84
};

export const OWNER_FEATURE_STATS: {
  means: Record<keyof FeatureVector, number>;
  stds: Record<keyof FeatureVector, number>;
  labels: Record<keyof FeatureVector, string>;
} = {
  means: {
    t_total: 2.15,
    t_p1: 0.38,
    t_p2: 0.90,
    t_p3: 0.88,
    t_lag_force_gyro: 0.17,
    t_time_to_peak_force: 0.84,
    f_peak: 53.2,
    f_mean: 68.35,
    f_impulse: 61.5,
    f_rfd: 303.5,
    w_peak: 73.5,
    w_excursion: 37.2,
    a_rms: 10.28,
    a_peak_jerk: 209.1,
    corr_force_gyro: 0.70,
    phase_overlap_ratio: 0.42
  },
  stds: {
    t_total: 0.08,
    t_p1: 0.05,
    t_p2: 0.05,
    t_p3: 0.05,
    t_lag_force_gyro: 0.05,
    t_time_to_peak_force: 0.12,
    f_peak: 2.2,
    f_mean: 3.0,
    f_impulse: 3.2,
    f_rfd: 32.0,
    w_peak: 3.0,
    w_excursion: 2.5,
    a_rms: 0.08,
    a_peak_jerk: 32.0,
    corr_force_gyro: 0.06,
    phase_overlap_ratio: 0.05
  },
  labels: {
    t_total: 'Total Duration',
    t_p1: 'Approach / Contact (P1)',
    t_p2: 'Load & Turn (P2)',
    t_p3: 'Release & Return (P3)',
    t_lag_force_gyro: 'Force-to-Rotation Latency',
    t_time_to_peak_force: 'Time to Peak Force',
    f_peak: 'Peak Grip Force',
    f_mean: 'Mean Grip Force (P2)',
    f_impulse: 'Force Impulse (AUC)',
    f_rfd: 'Max Rate of Force Dev',
    w_peak: 'Peak Angular Velocity',
    w_excursion: 'Angular Excursion',
    a_rms: 'Acceleration RMS',
    a_peak_jerk: 'Peak Jerk Magnitude',
    corr_force_gyro: 'Force-Gyro Cross-Correlation',
    phase_overlap_ratio: 'Phase Overlap Ratio'
  }
};

/**
 * Synthesizes ~250 telemetry frames (100 Hz sampling rate) for an attempt scenario.
 */
export function generateAttemptFrames(
  scenario: 'genuine' | 'impostor' | 'mimic_l1' | 'mimic_l2' | 'fault',
  seed?: number,
  injectFault = false
): TelemetryFrame[] {
  const prng = new SeededPRNG(seed ?? Math.floor(Math.random() * 1000000));

  let p1_dur = OWNER_BASELINE_PARAMS.t_p1;
  let p2_dur = OWNER_BASELINE_PARAMS.t_p2;
  let p3_dur = OWNER_BASELINE_PARAMS.t_p3;
  let f_peak = OWNER_BASELINE_PARAMS.f_peak;
  let w_peak = OWNER_BASELINE_PARAMS.w_peak;
  let lag = OWNER_BASELINE_PARAMS.t_lag_force_gyro;

  if (scenario === 'impostor') {
    p1_dur += prng.range(-0.25, 0.35);
    p2_dur += prng.range(-0.30, 0.45);
    p3_dur += prng.range(-0.20, 0.30);
    f_peak += prng.range(-24.0, 32.0);
    w_peak += prng.range(-35.0, 48.0);
    lag += prng.range(-0.15, 0.22);
  } else if (scenario === 'mimic_l1') {
    p1_dur += prng.range(-0.12, 0.15);
    p2_dur += prng.range(-0.15, 0.18);
    p3_dur += prng.range(-0.10, 0.12);
    f_peak += prng.range(-12.0, 14.0);
    w_peak += prng.range(-18.0, 22.0);
    lag += prng.range(-0.06, 0.08);
  } else if (scenario === 'mimic_l2') {
    p1_dur += prng.range(-0.06, 0.08);
    p2_dur += prng.range(-0.08, 0.09);
    p3_dur += prng.range(-0.05, 0.06);
    f_peak += prng.range(-6.5, 7.5);
    w_peak += prng.range(-8.0, 10.0);
    lag += prng.range(-0.03, 0.04);
  } else {
    // Genuine owner trial with physiological intra-subject jitter
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

    if (injectFault && i > steps * 0.45) {
      frames.push({ t, force: 0, gyro: 0, accel: 9.81, phase: 'P2' });
      continue;
    }

    let phase: 'P1' | 'P2' | 'P3' = 'P1';
    if (t < t_rot_onset) phase = 'P1';
    else if (t < t_p2_end) phase = 'P2';
    else phase = 'P3';

    // 1. Grip force model (Sigmoid rise to plateau + micro-tremor + smooth decay)
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
      const reboundCenter = t_p2_end + 0.12;
      const pulse = Math.exp(-Math.pow(t - reboundCenter, 2) / 0.005);
      gyro = Math.abs(OWNER_BASELINE_PARAMS.w_return_lobe) * pulse * 0.8 + prng.gaussian(0, 0.8);
    } else {
      gyro = Math.abs(prng.gaussian(0, 0.6));
    }
    gyro = Math.max(0, Number(gyro.toFixed(2)));

    // 3. Accelerometer magnitude model (Gravity baseline ~9.81 + tangential centripetal burst)
    let accel = 9.81;
    if (t >= t_rot_onset && t <= t_p2_end) {
      const centripetal = Math.pow((gyro * Math.PI) / 180, 2) * 0.06;
      const jerk = Math.sin(t * 24) * 1.5 + prng.gaussian(0, 0.6);
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
 * Extracts the 16 canonical behavioral biometric features from a stream of telemetry frames.
 */
export function extractFeatures(frames: TelemetryFrame[]): FeatureVector {
  if (!frames || frames.length === 0) {
    return { ...OWNER_FEATURE_STATS.means };
  }

  const dt = frames.length > 1 ? frames[1].t - frames[0].t : 0.01;
  const t_total = frames[frames.length - 1].t;

  const f_onset_frame = frames.find(f => f.force > 3.0) || frames[0];
  const rot_onset_frame = frames.find(f => f.gyro > 5.0) || frames[Math.min(frames.length - 1, 30)];
  const t_lag_force_gyro = Math.max(0, rot_onset_frame.t - f_onset_frame.t);

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

  let w_peak = 0;
  let w_excursion = 0;
  for (let i = 0; i < frames.length; i++) {
    const w = frames[i].gyro;
    if (w > w_peak) w_peak = w;
    w_excursion += w * dt;
  }

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
    phase_overlap_ratio: Number((p2_frames / frames.length).toFixed(2))
  };
}

/**
 * Computes behavioral score s(x) = -D_M using diagonal shrinkage approximation.
 */
export function computeMahalanobisScore(
  features: FeatureVector,
  profileMeans = OWNER_FEATURE_STATS.means,
  profileStds = OWNER_FEATURE_STATS.stds
): { score: number; deviations: FeatureDeviation[]; rawDistance: number } {
  let sumSq = 0;
  const deviations: FeatureDeviation[] = [];

  for (const key of CANONICAL_FEATURE_NAMES) {
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
      zScore: Number(z.toFixed(2))
    });
  }

  const rawDistance = Math.sqrt(sumSq / CANONICAL_FEATURE_NAMES.length) * 2.5;
  const score = Number((-rawDistance).toFixed(2));

  return { score, deviations, rawDistance };
}

/**
 * Evaluates the Dual-Gate rule:
 * Decision = Gate1 (Fingerprint Minutiae Match) AND Gate2 (s(x) >= tau)
 */
export function evaluateDualGate(
  fingerprintMatch: boolean,
  score: number,
  tau: number
): { accepted: boolean; reason?: string } {
  if (!fingerprintMatch) {
    return { accepted: false, reason: 'Gate 1 Fingerprint mismatch' };
  }
  if (score < tau) {
    return { accepted: false, reason: `Gate 2 Score ${score.toFixed(2)} below threshold ${tau.toFixed(2)}` };
  }
  return { accepted: true };
}

/**
 * Golden vector generator for cross-language validation (TypeScript vs Python).
 * Generates fixed recordings from seeded PRNGs and records expected feature vectors and scores.
 */
export function generateGoldenVectors() {
  const seeds = [1001, 2002, 3003, 4004, 5005];
  const scenarios: ('genuine' | 'impostor' | 'mimic_l1' | 'mimic_l2')[] = [
    'genuine',
    'impostor',
    'mimic_l1',
    'mimic_l2',
    'genuine'
  ];

  return seeds.map((seed, idx) => {
    const scenario = scenarios[idx];
    const frames = generateAttemptFrames(scenario, seed);
    const features = extractFeatures(frames);
    const { score, rawDistance } = computeMahalanobisScore(features);

    return {
      index: idx,
      seed,
      scenario,
      numFrames: frames.length,
      sampleFrames: [frames[0], frames[Math.floor(frames.length / 2)], frames[frames.length - 1]],
      features,
      rawDistance: Number(rawDistance.toFixed(4)),
      score: Number(score.toFixed(4))
    };
  });
}
