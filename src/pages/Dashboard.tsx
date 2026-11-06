import React, { useState } from 'react';
import { useThenarStore } from '../store/useThenarStore';
import { getTranslation } from '../i18n';
import { LockMechanismSVG } from '../components/LockMechanismSVG';
import { GestureFlowStrip } from '../components/GestureFlowStrip';
import { StippleOrb, type OrbState } from '../components/StippleOrb';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  Clock,
  ShieldAlert,
  DoorOpen,
  DoorClosed,
  Zap,
  ArrowRight,
  Radio,
  AlertTriangle,
  Lock,
  Unlock,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const Dashboard: React.FC = () => {
  const {
    language,
    lockState,
    doorReedOpen,
    solenoidActive,
    boltRetracted,
    failureCounter,
    maxFailuresBeforeLockout,
    attempts,
    runSimulation,
    pullDoorOpen,
    closeDoor,
    isStreaming,
  } = useThenarStore();

  const [simulating, setSimulating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const last5Attempts = attempts.slice(0, 5);

  // Compute dynamic orb state
  let currentOrbState: OrbState = 'idle';
  if (lockState === 'LOCKOUT') currentOrbState = 'lockout';
  else if (lockState === 'FAULT') currentOrbState = 'fault';
  else if (lockState === 'UNLOCKING' || lockState === 'UNLOCKED') currentOrbState = 'accept';
  else if (isStreaming || simulating) currentOrbState = 'gesture';
  else if (attempts.length > 0 && attempts[0].decision === 'REJECT' && Date.now() - attempts[0].timestamp < 6000) currentOrbState = 'reject';

  const handleSimulateOwner = async () => {
    try {
      setErrorMsg(null);
      setSimulating(true);
      const res = await runSimulation('owner', true);
      if (res.decision === 'ACCEPT') {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#1aa59a', '#d2efe9', '#efeccd'],
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Simulation error');
    } finally {
      setSimulating(false);
    }
  };

  const handleSimulateFailed = async () => {
    try {
      setErrorMsg(null);
      setSimulating(true);
      await runSimulation('impostor', false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Simulation error');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="pb-16 space-y-12">
      {/* Hero Section styled with 21st.dev reference pattern */}
      <section className="sol-wrap sol-hero pt-4 sm:pt-8">
        <div className="sol-hero-grid">
          {/* Left Column: Heading, description, and primary simulation CTA */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="sol-tag">
                {getTranslation(language, 'app.title')} • DUAL-GATE HARDWARE SAFE
              </span>
              <span className="flex items-center gap-1.5 sol-mono text-[11px] text-[var(--sol-accent)]">
                <Radio className="w-3 h-3 animate-pulse" />
                Live Link
              </span>
            </div>

            <div>
              <h1 className="sol-h1 font-serif">
                <span>{getTranslation(language, 'dashboard.hero_title')}</span>
              </h1>
              <p className="sol-hero-text text-base leading-relaxed text-[var(--sol-soft)] mt-4">
                {getTranslation(language, 'dashboard.hero_subtitle')}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Simulation CTA Buttons */}
            <div className="sol-hero-cta">
              <button
                type="button"
                onClick={handleSimulateOwner}
                disabled={simulating || isStreaming || lockState === 'LOCKOUT'}
                className="sol-btn disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>{simulating ? 'Evaluating kinematics...' : getTranslation(language, 'dashboard.simulate_owner')}</span>
                <span className="sol-btn-arrow">→</span>
              </button>

              <button
                type="button"
                onClick={handleSimulateFailed}
                disabled={simulating || isStreaming || lockState === 'LOCKOUT'}
                className="sol-btn sol-btn-ghost disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <XCircle className="w-4 h-4 text-red-500" />
                <span>{getTranslation(language, 'dashboard.simulate_failed')}</span>
              </button>
            </div>

            {/* Physical door action controls */}
            <div className="pt-2 flex items-center gap-3">
              {(boltRetracted || lockState === 'UNLOCKING' || lockState === 'UNLOCKED') && !doorReedOpen && (
                <button
                  type="button"
                  onClick={pullDoorOpen}
                  className="sol-btn sol-btn-tonal !h-9 !py-1 !px-3.5 !text-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <DoorOpen className="w-4 h-4" />
                  <span className="font-bold">{getTranslation(language, 'dashboard.pull_door')}</span>
                </button>
              )}

              {doorReedOpen && (
                <button
                  type="button"
                  onClick={closeDoor}
                  className="sol-btn !h-9 !py-1 !px-3.5 !text-xs !bg-[var(--sol-accent)] !text-white hover:opacity-90 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <DoorClosed className="w-4 h-4 text-white" />
                  <span className="font-bold">{getTranslation(language, 'dashboard.close_door')}</span>
                </button>
              )}
            </div>

            {/* Micro-spec features list */}
            <div className="sol-backers pt-4">
              <span className="sol-kicker">EMBEDDED HARDWARE ARCHITECTURE</span>
              <ul className="sol-mono text-[11.5px]">
                <li><span className="w-1.5 h-1.5 rounded-full bg-[var(--sol-accent)]" /> 100 Hz Force + IMU</li>
                <li><span className="w-1.5 h-1.5 rounded-full bg-[var(--sol-accent)]" /> Gate 1 Minutiae</li>
                <li><span className="w-1.5 h-1.5 rounded-full bg-[var(--sol-accent)]" /> Gate 2 s(x) &ge; &tau;</li>
                <li><span className="w-1.5 h-1.5 rounded-full bg-[var(--sol-accent)]" /> Fail-Secure Bolt</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Signature 21st.dev Stipple Orb */}
          <div className="flex flex-col items-center justify-center">
            <StippleOrb orbState={currentOrbState} label="Thenar Biometric Safe Handle Kinematic Orb" />
            <p className="sol-mono text-[11px] text-[var(--sol-muted)] text-center mt-3">
              Interactive Kinematic Sphere • Drag to rotate • Click for ripple
            </p>
          </div>
        </div>
      </section>

      {/* Main Section: Physical SVG Lock Mechanism + Telemetry Matrix */}
      <section className="sol-sec sol-wrap">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (Lock Mechanism & Kinematic Flow Strip) */}
          <div className="lg:col-span-7 space-y-4">
            <LockMechanismSVG />
            <GestureFlowStrip />
          </div>

          {/* Right Column: Telemetry Matrix & Fail-Safe Counter */}
          <div className="lg:col-span-5 space-y-4">
            {/* Status Matrix Card */}
            <div className="sol-card sol-card-pad space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--sol-line)]">
                <span className="sol-kicker !tracking-wider">
                  Telemetry State Vector
                </span>
                <span className="sol-tag !text-[10px]">
                  ESP32 Wi-Fi Link
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Door Reed Switch */}
                <div className="p-3.5 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)] flex flex-col justify-between">
                  <span className="sol-mono text-[10.5px] text-[var(--sol-muted)]">
                    {getTranslation(language, 'status.door')}
                  </span>
                  <span className={`sol-mono text-sm font-semibold mt-1.5 ${doorReedOpen ? 'text-red-800 dark:text-red-400 font-semibold' : 'text-[var(--sol-accent)] font-semibold'}`}>
                    {doorReedOpen ? getTranslation(language, 'status.door_open') : getTranslation(language, 'status.door_closed')}
                  </span>
                </div>

                {/* Solenoid Bolt */}
                <div className="p-3.5 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)] flex flex-col justify-between">
                  <span className="sol-mono text-[10.5px] text-[var(--sol-muted)]">
                    {getTranslation(language, 'status.solenoid')}
                  </span>
                  <span className={`sol-mono text-sm font-semibold mt-1.5 ${solenoidActive ? 'text-[var(--sol-accent)] font-bold' : 'text-[var(--sol-soft)]'}`}>
                    {solenoidActive ? getTranslation(language, 'status.solenoid_energized') : getTranslation(language, 'status.solenoid_idle')}
                  </span>
                </div>

                {/* Deadbolt Position */}
                <div className="p-3.5 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)] flex flex-col justify-between">
                  <span className="sol-mono text-[10.5px] text-[var(--sol-muted)]">
                    {getTranslation(language, 'status.bolt')}
                  </span>
                  <span className={`sol-mono text-sm font-semibold mt-1.5 ${boltRetracted ? 'text-sky-800 dark:text-sky-400 font-semibold' : 'text-[var(--sol-accent)] font-semibold'}`}>
                    {boltRetracted ? getTranslation(language, 'status.bolt_retracted') : getTranslation(language, 'status.bolt_extended')}
                  </span>
                </div>

                {/* Failure Counter */}
                <div className="p-3.5 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)] flex flex-col justify-between">
                  <span className="sol-mono text-[10.5px] text-[var(--sol-muted)]">
                    {getTranslation(language, 'status.failures')}
                  </span>
                  <span className={`sol-mono text-sm font-semibold mt-1.5 ${
                    failureCounter >= maxFailuresBeforeLockout
                      ? 'text-red-800 dark:text-red-400 font-bold'
                      : failureCounter > 0
                      ? 'text-amber-800 dark:text-amber-400 font-bold'
                      : 'text-[var(--sol-soft)]'
                  }`}>
                    {failureCounter} / {maxFailuresBeforeLockout}
                  </span>
                </div>
              </div>

              {/* Lockout status indicator banner */}
              <div className={`p-3 rounded-xl border text-xs sol-mono flex items-center justify-between ${
                lockState === 'LOCKOUT'
                  ? 'bg-red-500/10 border-red-500/30 text-red-500'
                  : 'bg-[var(--sol-panel)] border-[var(--sol-line)] text-[var(--sol-soft)]'
              }`}>
                <span className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  {getTranslation(language, 'status.lockout')}
                </span>
                <span className="font-semibold">
                  {lockState === 'LOCKOUT' ? getTranslation(language, 'status.lockout_active') : getTranslation(language, 'status.lockout_normal')}
                </span>
              </div>
            </div>

            {/* Quick Summary Card */}
            <div className="sol-card sol-card-pad space-y-3">
              <span className="sol-kicker">TWO-GATE VERIFICATION RULE</span>
              <p className="text-xs text-[var(--sol-soft)] leading-relaxed">
                The safe handle unlocks <strong className="text-[var(--sol-ink)]">ONLY IF</strong> Gate 1 (fingerprint minutiae template match) AND Gate 2 (one-owner Mahalanobis behavioral score <code className="sol-mono text-[var(--sol-accent)] font-bold">s(x) &ge; &tau;</code>) are simultaneously satisfied.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Recent 5 Attempts Section */}
      <section className="sol-sec sol-wrap">
        <div className="sol-card sol-card-pad space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--sol-line)]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--sol-accent)]" />
              <h2 className="text-base font-semibold text-[var(--sol-ink)] font-serif">
                {getTranslation(language, 'dashboard.recent_title')}
              </h2>
            </div>

            <Link
              to="/log"
              className="text-xs text-[var(--sol-accent)] hover:underline font-medium inline-flex items-center gap-1.5 sol-mono"
            >
              <span>{getTranslation(language, 'dashboard.view_all')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {last5Attempts.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--sol-muted)] sol-mono">
              {getTranslation(language, 'dashboard.no_attempts')}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {last5Attempts.map((attempt: any, idx) => {
                const isAccept = String(attempt.decision).toLowerCase() === 'accept';
                const date = new Date(attempt.ts || attempt.timestamp || Date.now());
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return (
                  <div
                    key={`${attempt.id}-${idx}`}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                      isAccept
                        ? 'bg-[color-mix(in_srgb,var(--sol-accent)_6%,var(--sol-card))] border-[color-mix(in_srgb,var(--sol-accent)_28%,transparent)]'
                        : 'bg-red-500/5 border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] sol-mono font-semibold text-[var(--sol-ink)]">
                        {attempt.id}
                      </span>
                      {isAccept ? (
                        <CheckCircle className="w-4 h-4 text-[var(--sol-accent)]" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs sol-mono">
                      <div className="flex justify-between text-[11px] text-[var(--sol-muted)]">
                        <span>{getTranslation(language, 'dashboard.gate1')}</span>
                        <span className={(attempt.gate1Result ?? (attempt.fingerprint?.result === 'accept')) ? 'text-[var(--sol-accent)] font-semibold' : 'text-red-800 dark:text-red-400 font-semibold'}>
                          {(attempt.gate1Result ?? (attempt.fingerprint?.result === 'accept')) ? 'PASS' : 'FAIL'}
                        </span>
                      </div>

                      <div className="flex justify-between text-[11px] text-[var(--sol-muted)]">
                        <span>{getTranslation(language, 'dashboard.gate2')}</span>
                        <span className={attempt.score != null && attempt.tau != null && attempt.score >= attempt.tau ? 'text-[var(--sol-accent)] font-bold' : 'text-red-800 dark:text-red-400 font-bold'}>
                          {attempt.score != null ? attempt.score.toFixed(2) : 'N/A'}
                        </span>
                      </div>

                      <div className="flex justify-between text-[10px] text-[var(--sol-muted)] pt-1 border-t border-[var(--sol-line)]">
                        <span>{getTranslation(language, 'dashboard.threshold_label')}</span>
                        <span>{attempt.tau != null ? attempt.tau.toFixed(2) : '-3.85'}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-[var(--sol-muted)] sol-mono mt-3 pt-1.5 flex items-center justify-between border-t border-[var(--sol-line)]">
                      <span>{timeStr}</span>
                      <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-[var(--sol-panel)] border border-[var(--sol-line)]">
                        {attempt.role}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
