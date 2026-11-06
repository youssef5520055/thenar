import React, { useState, useEffect, useRef } from 'react';
import { useThenarStore } from '../store/useThenarStore';
import { getTranslation } from '../i18n';
import { LiveChart } from '../components/LiveChart';
import type { TelemetryFrame, AttemptRecord } from '../mock/types';
import {
  generateAttemptFrames,
  extractFeatures,
  computeMahalanobisScore,
  defaultPRNG
} from '../mock/engine';
import {
  Play,
  Square,
  AlertTriangle,
  Fingerprint,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Cpu,
  Activity,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const LiveSession: React.FC = () => {
  const {
    language,
    playbackSpeed,
    setPlaybackSpeed,
    ownerProfile,
    failureCounter,
    unlockHoldSeconds,
    addNotification,
  } = useThenarStore();

  const [isRunning, setIsRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string>('S-LIVE-01');
  const [elapsedTime, setElapsedTime] = useState<number>(0.0);
  const [streamingFrames, setStreamingFrames] = useState<TelemetryFrame[]>([]);
  const [injectFault, setInjectFault] = useState<boolean>(false);
  const [sensorHealth, setSensorHealth] = useState({
    hx711: true,
    gyro: true,
    accel: true,
    fp: true,
  });

  // Decision animation state
  const [decisionPending, setDecisionPending] = useState(false);
  const [completedAttempt, setCompletedAttempt] = useState<AttemptRecord | null>(null);

  const fullSessionFramesRef = useRef<TelemetryFrame[]>([]);
  const frameIdxRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  // Stop session helper
  const handleStop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(false);
    setDecisionPending(false);
  };

  // Start capture sequence
  const handleStart = () => {
    handleStop();
    const id = `S-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setSessionId(id);
    setStreamingFrames([]);
    setElapsedTime(0.0);
    setCompletedAttempt(null);
    setDecisionPending(false);
    setSensorHealth({
      hx711: !injectFault,
      gyro: true,
      accel: true,
      fp: true,
    });

    // Generate raw frames for full session
    const frames = generateAttemptFrames('owner', 'S4', defaultPRNG, injectFault);
    fullSessionFramesRef.current = frames;
    frameIdxRef.current = 0;
    setIsRunning(true);

    const stepInterval = Math.max(10, Math.round(10 / playbackSpeed));

    timerRef.current = window.setInterval(() => {
      frameIdxRef.current += 1;
      const idx = frameIdxRef.current;

      if (idx >= frames.length) {
        clearInterval(timerRef.current!);
        setIsRunning(false);
        finishSession(frames, id);
        return;
      }

      const currentFrames = frames.slice(0, idx);
      setStreamingFrames(currentFrames);
      setElapsedTime(frames[idx].t);

      // If fault was injected midway, simulate sensor disconnect dot
      if (injectFault && idx > frames.length * 0.45) {
        setSensorHealth(prev => ({ ...prev, hx711: false }));
      }
    }, stepInterval);
  };

  // Finish session & compute decision
  const finishSession = (frames: TelemetryFrame[], id: string) => {
    setDecisionPending(true);

    setTimeout(() => {
      if (injectFault) {
        setDecisionPending(false);
        useThenarStore.setState({ lockState: 'FAULT' });
        addNotification({
          type: 'fault',
          titleKey: 'notifications.sensor_fault',
          descKey: 'live.decision_fault',
        });
        setTimeout(() => {
          useThenarStore.setState({ lockState: 'LOCKED' });
        }, 3000);
        return;
      }

      const features = extractFeatures(frames);
      const { score, deviations } = computeMahalanobisScore(
        features,
        ownerProfile.means,
        ownerProfile.stds
      );

      const gate1Result = true; // Genuine owner fingerprint match
      const tau = ownerProfile.tau;
      const isAccepted = gate1Result && score >= tau;

      const record: AttemptRecord = {
        id,
        timestamp: new Date().toISOString(),
        sessionTag: 'S4',
        role: 'owner',
        gate1Result,
        gate1TemplateId: 'FP_TPL_01',
        score,
        tau,
        decision: isAccepted ? 'ACCEPT' : 'REJECT',
        failureCounterAtTime: isAccepted ? 0 : failureCounter + 1,
        rejectionReason: isAccepted ? undefined : `Gate 2 s(x)=${score.toFixed(2)} < τ=${tau.toFixed(2)}`,
        features,
        deviations,
        frames,
      };

      setCompletedAttempt(record);
      setDecisionPending(false);

      // Save to store attempts
      useThenarStore.setState(state => ({
        attempts: [record, ...state.attempts],
      }));

      // Trigger lock states and celebrations
      if (isAccepted) {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#1aa59a', '#d2efe9', '#efeccd'],
        });

        useThenarStore.setState({
          lockState: 'UNLOCKING',
          solenoidActive: true,
          boltRetracted: true,
          failureCounter: 0,
        });

        addNotification({
          type: 'accept',
          titleKey: 'notifications.unlock_success',
          descKey: 'live.decision_accept',
        });

        setTimeout(() => {
          const cur = useThenarStore.getState();
          if (cur.lockState === 'UNLOCKING' && !cur.doorReedOpen) {
            useThenarStore.setState({ lockState: 'RELOCKING', solenoidActive: false });
            setTimeout(() => {
              useThenarStore.setState({ lockState: 'LOCKED', boltRetracted: false });
            }, 600);
          }
        }, unlockHoldSeconds * 1000);

      } else {
        const nextFail = failureCounter + 1;
        useThenarStore.setState({ failureCounter: nextFail });
        addNotification({
          type: 'reject',
          titleKey: 'notifications.unlock_fail',
          descKey: 'live.decision_reject',
        });
      }
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="sol-wrap py-8 space-y-6">
      {/* Header & Meta telemetry */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--sol-line)]">
        <div>
          <span className="sol-tag">REAL-TIME IN-BROWSER KINEMATIC STREAM</span>
          <h1 className="sol-h1 font-serif mt-2 !text-3xl">
            {getTranslation(language, 'live.title')}
          </h1>
          <p className="text-sm text-[var(--sol-soft)] mt-1">
            {getTranslation(language, 'live.subtitle')}
          </p>
        </div>

        {/* Top Session Stats Bar */}
        <div className="flex flex-wrap items-center gap-2.5 sol-mono text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-[var(--sol-card)] border border-[var(--sol-line)] flex items-center gap-2">
            <span className="text-[var(--sol-muted)]">{getTranslation(language, 'live.session_id')}:</span>
            <span className="font-bold text-[var(--sol-accent)]">{sessionId}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-[var(--sol-card)] border border-[var(--sol-line)] flex items-center gap-2">
            <span className="text-[var(--sol-muted)]">{getTranslation(language, 'live.elapsed')}:</span>
            <span className="font-bold text-[var(--sol-ink)]">{elapsedTime.toFixed(2)}s</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-[var(--sol-card)] border border-[var(--sol-line)] text-[var(--sol-soft)]">
            {getTranslation(language, 'live.sampling_rate')}
          </div>
        </div>
      </div>

      {/* Sensor Channel Health Bar */}
      <div className="sol-card sol-card-pad flex flex-wrap items-center justify-between gap-4">
        <span className="sol-kicker">
          {getTranslation(language, 'live.channels_title')}
        </span>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sol-mono">
          {/* HX711 Load Cell */}
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${sensorHealth.hx711 ? 'bg-[var(--sol-accent)] animate-pulse' : 'bg-red-500'}`} />
            <span className={sensorHealth.hx711 ? 'text-[var(--sol-ink)]' : 'text-red-800 dark:text-red-400 font-bold'}>
              {getTranslation(language, 'live.ch_loadcell')}
            </span>
          </div>

          {/* Gyroscope */}
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${sensorHealth.gyro ? 'bg-[var(--sol-accent)]' : 'bg-red-500'}`} />
            <span className="text-[var(--sol-ink)]">{getTranslation(language, 'live.ch_gyro')}</span>
          </div>

          {/* Accelerometer */}
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${sensorHealth.accel ? 'bg-[var(--sol-accent)]' : 'bg-red-500'}`} />
            <span className="text-[var(--sol-ink)]">{getTranslation(language, 'live.ch_accel')}</span>
          </div>

          {/* Fingerprint */}
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${sensorHealth.fp ? 'bg-[var(--sol-accent)]' : 'bg-red-500'}`} />
            <span className="text-[var(--sol-ink)]">{getTranslation(language, 'live.ch_fp')}</span>
          </div>
        </div>
      </div>

      {/* Control Buttons Console */}
      <div className="flex flex-wrap items-center justify-between gap-3 sol-card sol-card-pad">
        <div className="flex items-center gap-3">
          {!isRunning ? (
            <button
              type="button"
              onClick={handleStart}
              className="sol-btn !py-2.5 !px-5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{getTranslation(language, 'live.start')}</span>
              <span className="sol-btn-arrow">→</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStop}
              className="sol-btn sol-btn-ghost !border-red-500/40 !text-red-800 dark:!text-red-400 !py-2.5 !px-5 cursor-pointer font-bold"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>{getTranslation(language, 'live.stop')}</span>
            </button>
          )}

          {/* Inject Sensor Fault Toggle Button */}
          <button
            type="button"
            onClick={() => setInjectFault(!injectFault)}
            className={`sol-pill cursor-pointer transition-all ${
              injectFault
                ? '!bg-red-500/15 !border-red-500 !text-red-800 dark:!text-red-400 font-bold'
                : 'hover:text-[var(--sol-ink)]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{getTranslation(language, 'live.inject_fault')}</span>
            {injectFault && <span className="text-[9.5px] uppercase font-bold text-red-800 dark:text-red-400">(ARMED)</span>}
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--sol-muted)] sol-mono">{getTranslation(language, 'live.speed')}:</span>
          <div className="flex items-center gap-1 bg-[var(--sol-panel)] p-1 rounded-xl border border-[var(--sol-line)]">
            {[0.5, 1.0, 2.0].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2.5 py-1 text-xs sol-mono rounded-lg transition-all cursor-pointer ${
                  playbackSpeed === spd
                    ? 'bg-[var(--btn-tonal-bg)] text-[var(--btn-tonal-fg)] border border-[var(--btn-tonal-border)] font-bold'
                    : 'text-[var(--sol-soft)] hover:text-[var(--sol-ink)]'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Streaming Telemetry Chart */}
      <div className="space-y-2">
        <LiveChart
          frames={streamingFrames.length > 0 ? streamingFrames : generateAttemptFrames('owner', 'S1', defaultPRNG).slice(0, 40)}
          isLive={isRunning}
          height={380}
          highlightPhases={true}
        />
      </div>

      {/* Evaluating state spinner */}
      {decisionPending && (
        <div className="sol-card sol-card-pad text-center space-y-2 animate-pulse border-[var(--sol-accent)]/50">
          <Activity className="w-8 h-8 text-[var(--sol-accent)] mx-auto animate-spin" />
          <h3 className="text-base font-semibold text-[var(--sol-ink)] font-serif">
            {getTranslation(language, 'live.evaluating')}
          </h3>
          <p className="text-xs text-[var(--sol-muted)] sol-mono">
            Extracting 16-D kinematic vector & calculating Mahalanobis distance s(x)
          </p>
        </div>
      )}

      {/* Decision Panel (Animates after gesture completes) */}
      {completedAttempt && (
        <div className={`sol-card sol-card-pad space-y-4 animate-in slide-in-from-bottom duration-300 ${
          completedAttempt.decision === 'ACCEPT'
            ? 'border-[var(--sol-accent)]/50 bg-[color-mix(in_srgb,var(--sol-accent)_6%,var(--sol-card))]'
            : 'border-red-500/40 bg-red-500/5'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--sol-line)]">
            <div className="flex items-center gap-2">
              {completedAttempt.decision === 'ACCEPT' ? (
                <ShieldCheck className="w-5 h-5 text-[var(--sol-accent)]" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-red-500" />
              )}
              <h2 className="text-base font-bold text-[var(--sol-ink)] font-serif">
                {getTranslation(language, 'live.decision_title')}
              </h2>
            </div>

            <span className="text-xs sol-mono text-[var(--sol-muted)]">
              {getTranslation(language, 'live.saved_to_log')} ({completedAttempt.id})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gate 1: Fingerprint */}
            <div className="p-4 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--sol-card)] text-[var(--sol-accent)] border border-[var(--sol-line)]">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] sol-mono text-[var(--sol-muted)]">GATE 1: OPTICAL SCANNER</div>
                  <div className="text-sm font-bold text-[var(--sol-ink)]">Template {completedAttempt.gate1TemplateId}</div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs sol-mono font-bold ${
                completedAttempt.gate1Result ? 'bg-[color-mix(in_srgb,var(--sol-accent)_20%,transparent)] text-[var(--sol-accent)]' : 'bg-red-500/20 text-red-800 dark:text-red-400 font-bold'
              }`}>
                {completedAttempt.gate1Result ? 'VERIFIED' : 'REJECTED'}
              </span>
            </div>

            {/* Gate 2: Behavioral Biometric Score vs tau */}
            <div className="p-4 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-[var(--sol-accent)]" />
                  <span className="text-[11px] sol-mono text-[var(--sol-muted)]">GATE 2: BEHAVIORAL SCORE s(x)</span>
                </div>
                <span className={`text-sm sol-mono font-bold ${
                  completedAttempt.score >= completedAttempt.tau ? 'text-[var(--sol-accent)]' : 'text-red-800 dark:text-red-400 font-bold'
                }`}>
                  {completedAttempt.score.toFixed(2)} (&tau; = {completedAttempt.tau.toFixed(2)})
                </span>
              </div>

              {/* Score bar compared to tau */}
              <div className="w-full bg-[var(--sol-card)] h-2.5 rounded-full relative overflow-hidden border border-[var(--sol-line)]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    completedAttempt.score >= completedAttempt.tau ? 'bg-[var(--sol-accent)]' : 'bg-red-500'
                  }`}
                  style={{
                    width: `${Math.max(5, Math.min(100, ((completedAttempt.score + 10) / 10) * 100))}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] sol-mono text-[var(--sol-muted)]">
                <span>Distant / High Jerk</span>
                <span className="text-[var(--sol-accent)]">Cutoff &tau; = {completedAttempt.tau.toFixed(2)}</span>
                <span>Genuine Fit</span>
              </div>
            </div>
          </div>

          {/* Final Combined Logic Verdict */}
          <div className={`p-3 rounded-xl text-center text-xs sol-mono font-semibold ${
            completedAttempt.decision === 'ACCEPT' ? 'text-[var(--sol-accent)]' : 'text-red-800 dark:text-red-400 font-bold'
          }`}>
            {completedAttempt.decision === 'ACCEPT'
              ? getTranslation(language, 'live.decision_accept')
              : getTranslation(language, 'live.decision_reject')}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveSession;
