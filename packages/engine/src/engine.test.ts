import { describe, it, expect } from 'vitest';
import {
  generateAttemptFrames,
  extractFeatures,
  computeMahalanobisScore,
  evaluateDualGate,
  generateGoldenVectors,
  CANONICAL_FEATURE_NAMES
} from './index.js';

describe('Biometric Kinematic Engine', () => {
  it('synthesizes ~250 frames with expected phases', () => {
    const frames = generateAttemptFrames('genuine', 42);
    expect(frames.length).toBeGreaterThan(150);
    expect(frames.length).toBeLessThan(350);

    const phases = new Set(frames.map(f => f.phase));
    expect(phases.has('P1')).toBe(true);
    expect(phases.has('P2')).toBe(true);
    expect(phases.has('P3')).toBe(true);
  });

  it('extracts all 16 canonical features within physiological bounds', () => {
    const frames = generateAttemptFrames('genuine', 42);
    const features = extractFeatures(frames);

    expect(Object.keys(features)).toHaveLength(16);
    for (const key of CANONICAL_FEATURE_NAMES) {
      expect(typeof features[key]).toBe('number');
      expect(Number.isNaN(features[key])).toBe(false);
    }

    expect(features.f_peak).toBeGreaterThan(30);
    expect(features.f_peak).toBeLessThan(80);
    expect(features.w_peak).toBeGreaterThan(40);
    expect(features.w_peak).toBeLessThan(120);
  });

  it('computes higher scores for genuine attempts than impostors', () => {
    const genuineFrames = generateAttemptFrames('genuine', 999);
    const genuineFeatures = extractFeatures(genuineFrames);
    const genuineResult = computeMahalanobisScore(genuineFeatures);

    const impostorFrames = generateAttemptFrames('impostor', 999);
    const impostorFeatures = extractFeatures(impostorFrames);
    const impostorResult = computeMahalanobisScore(impostorFeatures);

    // s(x) = -D_M, so closer to 0 is more similar
    expect(genuineResult.score).toBeGreaterThan(impostorResult.score);
  });

  it('correctly evaluates Dual-Gate logic', () => {
    // Both pass -> accepted
    expect(evaluateDualGate(true, -2.5, -3.85).accepted).toBe(true);
    // Gate 1 fails -> rejected
    expect(evaluateDualGate(false, -2.5, -3.85).accepted).toBe(false);
    // Gate 2 fails -> rejected
    expect(evaluateDualGate(true, -4.8, -3.85).accepted).toBe(false);
    // Both fail -> rejected
    expect(evaluateDualGate(false, -5.2, -3.85).accepted).toBe(false);
  });

  it('produces deterministic golden vectors across runs with same seeds', () => {
    const gv1 = generateGoldenVectors();
    const gv2 = generateGoldenVectors();
    expect(gv1).toEqual(gv2);
    expect(gv1).toHaveLength(5);
  });
});
