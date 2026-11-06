import React, { useState } from 'react';
import { useThenarStore } from '../store/useThenarStore';
import { getTranslation } from '../i18n';
import { LiveChart } from '../components/LiveChart';
import type { AdversaryRole, AttemptRecord, TelemetryFrame } from '../mock/types';
import {
  generateAttemptFrames,
  extractFeatures,
  computeMahalanobisScore,
  defaultPRNG
} from '../mock/engine';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Fingerprint,
  Info,
  CheckCircle2,
} from 'lucide-react';

export const AttackSimulator: React.FC = () => {
  const {
    language,
    ownerProfile,
    failureCounter,
    maxFailuresBeforeLockout,
    lockoutDurationSeconds,
    lockoutRepeatCount,
    addNotification,
  } = useThenarStore();

  const [scenario, setScenario] = useState<AdversaryRole>('impostor');
  const [fpCompromised, setFpCompromised] = useState<boolean>(true); // default true to emphasize Gate 2 behavioral stopping power!
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [attackResult, setAttackResult] = useState<AttemptRecord | null>(null);
  const [attackerFrames, setAttackerFrames] = useState<TelemetryFrame[]>([]);

  // Baseline owner template curve for overlay comparison
  const [ownerTemplateFrames] = useState<TelemetryFrame[]>(() =>
    generateAttemptFrames('owner', 'S1', defaultPRNG)
  );

  const handleRunAttack = async () => {
    setIsSimulating(true);
    setAttackResult(null);

    // Generate adversary kinematic frames
    const frames = generateAttemptFrames(scenario, 'S4', defaultPRNG);
    setAttackerFrames(frames);

    await new Promise((r) => setTimeout(r, 600));

    const features = extractFeatures(frames);
    const { score, deviations } = computeMahalanobisScore(
      features,
      ownerProfile.means,
      ownerProfile.stds
    );

    const gate1Result = fpCompromised ? true : false;
    const tau = ownerProfile.tau;
    const isAccepted = gate1Result && score >= tau;

    const record: AttemptRecord = {
      id: `ATK-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      sessionTag: 'S4',
      role: scenario,
      gate1Result,
      gate1TemplateId: fpCompromised ? 'SPOOFED_FP' : '—',
      score,
      tau,
      decision: isAccepted ? 'ACCEPT' : 'REJECT',
      failureCounterAtTime: isAccepted ? 0 : failureCounter + 1,
      rejectionReason: !isAccepted
        ? (!gate1Result ? 'Gate 1 rejected' : `Gate 2 behavioral defense triggered: s(x)=${score.toFixed(2)} < τ=${tau.toFixed(2)}`)
        : undefined,
      features,
      deviations,
      frames,
    };

    setAttackResult(record);
    setIsSimulating(false);

    // Update global store attempts and failure counter
    const nextFailure = isAccepted ? 0 : failureCounter + 1;
    const isLockout = nextFailure >= maxFailuresBeforeLockout;

    if (isLockout) {
      const duration = lockoutDurationSeconds * Math.pow(2, lockoutRepeatCount);
      useThenarStore.setState((st) => ({
        lockState: 'LOCKOUT',
        failureCounter: nextFailure,
        lockoutEndTime: Date.now() + duration * 1000,
        lockoutRepeatCount: st.lockoutRepeatCount + 1,
        attempts: [record, ...st.attempts],
      }));
      addNotification({
        type: 'lockout',
        titleKey: 'notifications.lockout_start',
        descKey: 'status.state_lockout',
      });
    } else {
      useThenarStore.setState((st) => ({
        failureCounter: nextFailure,
        attempts: [record, ...st.attempts],
      }));
      addNotification({
        type: isAccepted ? 'accept' : 'reject',
        titleKey: isAccepted ? 'notifications.unlock_success' : 'notifications.unlock_fail',
        descKey: record.rejectionReason || 'status.state_locked',
      });
    }
  };

  return (
    <div className="sol-wrap py-8 space-y-8">
      {/* Title */}
      <div className="pb-4 border-b border-[var(--sol-line)]">
        <span className="sol-tag">ADVERSARIAL EVALUATION HARNESS</span>
        <h1 className="sol-h1 font-serif mt-2 !text-3xl">
          {getTranslation(language, 'attack.title')}
        </h1>
        <p className="text-sm text-[var(--sol-soft)] mt-1">
          {getTranslation(language, 'attack.subtitle')}
        </p>
      </div>

      {/* Security Scope Notice */}
      <div className="sol-card sol-card-pad text-xs text-[var(--sol-soft)] sol-mono space-y-1">
        <div className="flex items-center gap-2 text-[var(--sol-ink)]">
          <Info className="w-4 h-4 text-[var(--sol-accent)]" />
          <span className="font-bold uppercase tracking-wider">Evaluation Boundary</span>
        </div>
        <p className="leading-relaxed">
          {getTranslation(language, 'attack.out_of_scope_note')}
        </p>
      </div>

      {/* Threat Scenario Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {[
          {
            id: 'impostor' as AdversaryRole,
            title: getTranslation(language, 'attack.scenario_a1'),
            desc: getTranslation(language, 'attack.scenario_a1_desc'),
          },
          {
            id: 'mimicry_l1' as AdversaryRole,
            title: getTranslation(language, 'attack.scenario_a2_l1'),
            desc: getTranslation(language, 'attack.scenario_a2_l1_desc'),
          },
          {
            id: 'mimicry_l2' as AdversaryRole,
            title: getTranslation(language, 'attack.scenario_a2_l2'),
            desc: getTranslation(language, 'attack.scenario_a2_l2_desc'),
          },
        ].map((sc) => {
          const isSelected = scenario === sc.id;

          return (
            <div
              key={sc.id}
              onClick={() => setScenario(sc.id)}
              className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? 'border-[var(--sol-accent)] bg-[color-mix(in_srgb,var(--sol-accent)_10%,var(--sol-card))] shadow-sm'
                  : 'border-[var(--sol-line)] bg-[var(--sol-card)] hover:bg-[var(--sol-panel)]'
              }`}
            >
              <div>
                <span className={`text-xs font-bold sol-mono uppercase block mb-1.5 ${isSelected ? 'text-[var(--sol-accent)]' : 'text-[var(--sol-ink)]'}`}>
                  {sc.title}
                </span>
                <p className="text-xs text-[var(--sol-soft)] leading-relaxed">
                  {sc.desc}
                </p>
              </div>

              <div className={`mt-4 flex items-center justify-between text-[11px] sol-mono pt-2.5 border-t border-[var(--sol-line)] ${
                isSelected ? 'text-[var(--sol-ink)] font-semibold' : 'text-[var(--sol-muted)]'
              }`}>
                <span>{isSelected ? 'Threat Vector Selected' : 'Select Threat Vector'}</span>
                {isSelected ? <CheckCircle2 className="w-4 h-4 text-[var(--sol-accent)]" /> : <div className="w-4 h-4 rounded-full border border-[var(--sol-line)]" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Compromise Toggle & Execution Console */}
      <div className="sol-card sol-card-pad space-y-4">
        {/* Compromise Toggle Box */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-[var(--sol-accent)]" />
              <span className="text-xs font-bold text-[var(--sol-ink)] sol-mono uppercase">
                {getTranslation(language, 'attack.fp_compromise_toggle')}
              </span>
            </div>
            <p className="text-xs text-[var(--sol-soft)] leading-relaxed">
              {getTranslation(language, 'attack.fp_compromise_note')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setFpCompromised(!fpCompromised)}
            className={`sol-pill !text-xs cursor-pointer transition-all shrink-0 ${
              fpCompromised
                ? '!bg-amber-500/20 !border-amber-500 !text-amber-800 dark:!text-amber-400 font-bold'
                : 'text-[var(--sol-muted)]'
            }`}
          >
            {fpCompromised ? 'GATE 1 COMPROMISED (PASS)' : 'GATE 1 STRICT (FAIL)'}
          </button>
        </div>

        {/* Lockout status before execution */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs sol-mono text-[var(--sol-muted)] px-1">
          <span>
            Security Lockout Threshold: <strong className="text-[var(--sol-ink)]">{failureCounter} / {maxFailuresBeforeLockout}</strong> consecutive failures
          </span>
          <span className="text-[11px]">
            {maxFailuresBeforeLockout - failureCounter} attempt(s) remaining before system freeze
          </span>
        </div>

        {/* Execute Button */}
        <div>
          <button
            type="button"
            onClick={handleRunAttack}
            disabled={isSimulating}
            className="w-full sol-btn !py-3.5 !justify-center cursor-pointer disabled:opacity-40"
          >
            <Zap className="w-4 h-4" />
            <span>{isSimulating ? 'Injecting Vector & Sampling...' : getTranslation(language, 'attack.run_sim')}</span>
            <span className="sol-btn-arrow">→</span>
          </button>
        </div>
      </div>

      {/* Signal Overlay: Attacker Telemetry vs Genuine Owner Envelope */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[var(--sol-ink)] font-serif">
              {getTranslation(language, 'attack.overlay_title')}
            </h2>
            <p className="text-xs text-[var(--sol-muted)] sol-mono mt-0.5">
              {getTranslation(language, 'attack.overlay_desc')}
            </p>
          </div>
        </div>

        <LiveChart
          frames={ownerTemplateFrames}
          overlayFrames={attackerFrames.length > 0 ? attackerFrames : undefined}
          overlayLabel="Attacker Attempt Vector"
          height={380}
          highlightPhases={true}
        />
      </div>

      {/* Threat Verdict & Behavioral Stopping Power Panel */}
      {attackResult && (
        <div className={`sol-card sol-card-pad space-y-4 animate-in slide-in-from-bottom duration-300 ${
          attackResult.decision === 'ACCEPT'
            ? 'border-red-500/40 bg-red-500/5'
            : 'border-[var(--sol-accent)]/40 bg-[color-mix(in_srgb,var(--sol-accent)_6%,var(--sol-card))]'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-[var(--sol-line)]">
            <div className="flex items-center gap-2">
              {attackResult.decision === 'ACCEPT' ? (
                <ShieldAlert className="w-5 h-5 text-red-500" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-[var(--sol-accent)]" />
              )}
              <h3 className="text-base font-bold text-[var(--sol-ink)] font-serif">
                {attackResult.decision === 'ACCEPT'
                  ? 'BREACH SUCCESSFUL: Adversary Matched Both Gates'
                  : 'ATTACK REPELLED: Gate 2 Behavioral Biometrics Blocked the Breach'}
              </h3>
            </div>

            <span className="text-xs sol-mono font-bold text-[var(--sol-ink)]">
              s(x) = {attackResult.score.toFixed(2)} vs &tau; = {attackResult.tau.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sol-mono">
            {/* Gate 1 summary */}
            <div className="p-3.5 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)] flex items-center justify-between">
              <div>
                <span className="text-[var(--sol-muted)] block text-[10px]">Gate 1: Optical Fingerprint</span>
                <span className="font-bold text-[var(--sol-ink)]">
                  {attackResult.gate1Result ? 'SPOOF ACCEPTED (Gate Compromised)' : 'REJECTED AT CONTACT'}
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                attackResult.gate1Result ? 'bg-amber-500/20 text-amber-800 dark:text-amber-400 font-bold' : 'bg-red-500/20 text-red-800 dark:text-red-400 font-bold'
              }`}>
                {attackResult.gate1Result ? 'PASS' : 'FAIL'}
              </span>
            </div>

            {/* Gate 2 summary */}
            <div className="p-3.5 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)] flex items-center justify-between">
              <div>
                <span className="text-[var(--sol-muted)] block text-[10px]">Gate 2: Behavioral s(x)</span>
                <span className="font-bold text-[var(--sol-ink)]">
                  Mahalanobis Distance s(x) = {attackResult.score.toFixed(2)}
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                attackResult.score >= attackResult.tau ? 'bg-[color-mix(in_srgb,var(--sol-accent)_20%,transparent)] text-[var(--sol-accent)]' : 'bg-red-500/20 text-red-800 dark:text-red-400 font-bold'
              }`}>
                {attackResult.score >= attackResult.tau ? 'ACCEPT' : 'DEFENDED (BLOCKED)'}
              </span>
            </div>
          </div>

          {/* Feature deviation bars for attack */}
          <div className="space-y-1.5 pt-2 border-t border-[var(--sol-line)] sol-mono text-xs">
            <span className="text-[var(--sol-muted)] block text-[11px] font-semibold">
              Adversary Feature Distance Anomalies (z-scores):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
              {attackResult.deviations.slice(0, 6).map((d) => (
                <div key={d.featureKey} className="flex items-center justify-between p-2 rounded-lg bg-[var(--sol-panel)] border border-[var(--sol-line)] text-[11px]">
                  <span className="truncate text-[var(--sol-soft)]">{d.label}</span>
                  <span className={`font-bold ${Math.abs(d.zScore) > 2.0 ? 'text-red-800 dark:text-red-400' : 'text-[var(--sol-ink)]'}`}>
                    {d.zScore > 0 ? `+${d.zScore}` : d.zScore}&sigma;
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AttackSimulator;
