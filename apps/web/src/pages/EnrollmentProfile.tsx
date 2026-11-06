import React, { useState } from 'react';
import { useThenarStore } from '../store/useThenarStore';
import { getTranslation } from '../i18n';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import {
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  Cpu,
  CheckCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const EnrollmentProfile: React.FC = () => {
  const {
    language,
    ownerProfile,
    setOwnerProfile,
    resetOwnerProfile,
    serviceSwitchEngaged,
    setServiceSwitch,
    addNotification,
  } = useThenarStore();

  const [activeStep, setActiveStep] = useState<number>(1);
  const [targetTrials, setTargetTrials] = useState<number>(20);
  const [recordedTrials, setRecordedTrials] = useState<number>(ownerProfile.enrollmentTrialsCount);
  const [percentileCutoff, setPercentileCutoff] = useState<number>(5);
  const [isFitting, setIsFitting] = useState<boolean>(false);
  const [fitProgress, setFitProgress] = useState<number>(0);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [recordingAnimation, setRecordingAnimation] = useState<boolean>(false);

  // Genuine enrollment score distribution histogram data
  const scoreBins = [
    { bin: '-5.0 to -4.5', rangeCenter: -4.75, count: 1 },
    { bin: '-4.5 to -4.0', rangeCenter: -4.25, count: 2 },
    { bin: '-4.0 to -3.5', rangeCenter: -3.75, count: 4 },
    { bin: '-3.5 to -3.0', rangeCenter: -3.25, count: 6 },
    { bin: '-3.0 to -2.5', rangeCenter: -2.75, count: 5 },
    { bin: '-2.5 to -2.0', rangeCenter: -2.25, count: 2 },
  ];

  // Record a mock sample trial in wizard
  const handleRecordTrial = () => {
    setRecordingAnimation(true);
    setTimeout(() => {
      setRecordingAnimation(false);
      const nextCount = Math.min(targetTrials, recordedTrials + 1);
      setRecordedTrials(nextCount);
    }, 450);
  };

  // Run model fitting
  const handleRunFitting = () => {
    setIsFitting(true);
    setFitProgress(10);
    const interval = setInterval(() => {
      setFitProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setIsFitting(false);
          setActiveStep(4);
          return 100;
        }
        return p + 25;
      });
    }, 250);
  };

  // Complete enrollment and export to ESP32
  const handleFreezeProfile = () => {
    // Calculate new tau from chosen percentile
    const calculatedTau = -3.85 - (5 - percentileCutoff) * 0.15;
    const updated = {
      ...ownerProfile,
      enrolled: true,
      enrollmentTrialsCount: recordedTrials,
      tau: Number(calculatedTau.toFixed(2)),
      lastUpdated: new Date().toISOString(),
    };
    setOwnerProfile(updated);

    confetti({
      particleCount: 50,
      spread: 60,
      colors: ['#1aa59a', '#d2efe9', '#efeccd'],
    });

    addNotification({
      type: 'accept',
      titleKey: 'profile.status_enrolled',
      descKey: 'profile.freeze_btn',
    });

    setActiveStep(1);
    setServiceSwitch(false); // Disengage service switch upon freeze
  };

  return (
    <div className="sol-wrap py-8 space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--sol-line)]">
        <div>
          <span className="sol-tag">ONE-OWNER KINEMATIC ENROLLMENT</span>
          <h1 className="sol-h1 font-serif mt-2 !text-3xl">
            {getTranslation(language, 'profile.title')}
          </h1>
          <p className="text-sm text-[var(--sol-soft)] mt-1">
            {getTranslation(language, 'profile.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3.5 py-1.5 rounded-full text-xs sol-mono font-bold flex items-center gap-2 ${
            ownerProfile.enrolled
              ? 'bg-[var(--btn-tonal-bg)] text-[var(--btn-tonal-fg)] border border-[var(--btn-tonal-border)]'
              : 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30'
          }`}>
            <ShieldCheck className="w-4 h-4" />
            {ownerProfile.enrolled ? getTranslation(language, 'profile.status_enrolled') : getTranslation(language, 'profile.status_not_enrolled')}
          </span>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="sol-card sol-card-pad grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sol-mono text-xs">
        <div className="p-3.5 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)] space-y-1">
          <span className="text-[var(--sol-muted)] block">{getTranslation(language, 'profile.trials_recorded')}</span>
          <span className="text-xl font-bold text-[var(--sol-accent)]">{ownerProfile.enrollmentTrialsCount} trials</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)] space-y-1">
          <span className="text-[var(--sol-muted)] block">Operating Threshold &tau;</span>
          <span className="text-xl font-bold text-[var(--sol-accent)]">{ownerProfile.tau.toFixed(2)}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)] space-y-1">
          <span className="text-[var(--sol-muted)] block">Statistical Model</span>
          <span className="font-semibold text-[var(--sol-ink)]">{ownerProfile.modelType}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)] space-y-1">
          <span className="text-[var(--sol-muted)] block">{getTranslation(language, 'profile.last_updated')}</span>
          <span className="text-[var(--sol-soft)]">
            {new Date(ownerProfile.lastUpdated).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Enrollment Wizard */}
      <div className="sol-card sol-card-pad space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--sol-line)]">
          <h2 className="text-base font-bold text-[var(--sol-ink)] font-serif flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[var(--sol-accent)]" />
            <span>{getTranslation(language, 'profile.wizard_title')}</span>
          </h2>
          <span className="text-xs sol-mono text-[var(--sol-muted)]">
            Step {activeStep} of 5
          </span>
        </div>

        {/* Wizard Step Navigation Strip */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 text-center text-xs sol-mono">
          {[
            { num: 1, label: getTranslation(language, 'profile.step1_title') },
            { num: 2, label: getTranslation(language, 'profile.step2_title') },
            { num: 3, label: getTranslation(language, 'profile.step3_title') },
            { num: 4, label: getTranslation(language, 'profile.step4_title') },
            { num: 5, label: getTranslation(language, 'profile.step5_title') },
          ].map((st) => (
            <div
              key={st.num}
              onClick={() => {
                if (st.num === 1 || serviceSwitchEngaged) setActiveStep(st.num);
              }}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                activeStep === st.num
                  ? 'border-[var(--btn-tonal-border)] bg-[var(--btn-tonal-bg)] text-[var(--btn-tonal-fg)] font-bold'
                  : activeStep > st.num
                  ? 'border-[var(--sol-line)] bg-[var(--sol-panel)] text-[#064e47] dark:text-[#a7f3d0] font-semibold'
                  : 'border-[var(--sol-line)] bg-[var(--sol-panel)] text-[var(--sol-muted)]'
              }`}
            >
              <div className="text-[10px] uppercase truncate">{st.label}</div>
            </div>
          ))}
        </div>

        {/* Wizard Step 1: Service Mode Switch */}
        {activeStep === 1 && (
          <div className="p-5 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)] space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--sol-accent)] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-[var(--sol-ink)] font-serif">
                  Physical Service Switch Gating
                </h3>
                <p className="text-xs text-[var(--sol-soft)] mt-1 leading-relaxed">
                  {getTranslation(language, 'profile.switch_warning')}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[var(--sol-card)] border border-[var(--sol-line)]">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${serviceSwitchEngaged ? 'bg-[var(--sol-accent)] animate-pulse' : 'bg-[var(--sol-muted)]'}`} />
                <span className="text-xs sol-mono font-semibold text-[var(--sol-ink)]">
                  {serviceSwitchEngaged ? getTranslation(language, 'profile.switch_on') : getTranslation(language, 'profile.switch_off')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setServiceSwitch(!serviceSwitchEngaged)}
                className={`sol-btn !py-2 !px-4 !text-xs cursor-pointer ${
                  serviceSwitchEngaged
                    ? '!bg-red-500/15 !text-red-800 dark:!text-red-400 !border-red-500/40 hover:!bg-red-500/25 font-bold'
                    : ''
                }`}
              >
                <span>{serviceSwitchEngaged ? 'Disengage Service Mode' : 'Flip Service Switch ON'}</span>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                disabled={!serviceSwitchEngaged}
                className="sol-btn !py-2 !px-4 !text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Proceed to Trial Recording</span>
                <span className="sol-btn-arrow">→</span>
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 2: Record N Trials */}
        {activeStep === 2 && (
          <div className="p-5 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)] space-y-4 sol-mono">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--sol-ink)] font-serif">
                  Trial Capture: {recordedTrials} / {targetTrials} Gestures
                </h3>
                <p className="text-xs text-[var(--sol-soft)] mt-0.5">
                  {getTranslation(language, 'profile.record_prompt')}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[var(--sol-muted)]">Target:</span>
                <select
                  value={targetTrials}
                  onChange={(e) => setTargetTrials(Number(e.target.value))}
                  className="bg-[var(--sol-card)] border border-[var(--sol-line)] rounded-lg px-2 py-1 text-[var(--sol-ink)] focus:outline-none"
                >
                  <option value={15}>15 Trials</option>
                  <option value={20}>20 Trials (Recommended)</option>
                  <option value={25}>25 Trials</option>
                </select>
              </div>
            </div>

            {/* Trial capture progress bar */}
            <div className="w-full bg-[var(--sol-card)] h-3 rounded-full overflow-hidden border border-[var(--sol-line)]">
              <div
                className="bg-[var(--sol-accent)] h-full rounded-full transition-all duration-300"
                style={{ width: `${(recordedTrials / targetTrials) * 100}%` }}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleRecordTrial}
                disabled={recordingAnimation || recordedTrials >= targetTrials}
                className="w-full sm:w-auto sol-btn !py-2.5 !px-5 cursor-pointer disabled:opacity-40"
              >
                <RotateCw className={`w-4 h-4 ${recordingAnimation ? 'animate-spin' : ''}`} />
                <span>{recordingAnimation ? 'Sampling...' : getTranslation(language, 'profile.record_btn')}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveStep(3)}
                disabled={recordedTrials < targetTrials}
                className="w-full sm:w-auto sol-btn sol-btn-ghost !py-2.5 !px-5 cursor-pointer disabled:opacity-40"
              >
                <span>Fit Covariance Model</span>
                <span className="sol-btn-arrow">→</span>
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 3: Model Fitting */}
        {activeStep === 3 && (
          <div className="p-5 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)] space-y-4 sol-mono text-center">
            <h3 className="text-sm font-bold text-[var(--sol-ink)] font-serif">
              Regularized Covariance Estimation
            </h3>
            <p className="text-xs text-[var(--sol-soft)] max-w-lg mx-auto">
              {getTranslation(language, 'profile.fitting_progress')}
            </p>

            <div className="max-w-md mx-auto space-y-2 py-4">
              <div className="w-full bg-[var(--sol-card)] h-3 rounded-full overflow-hidden border border-[var(--sol-line)]">
                <div
                  className="bg-[var(--sol-accent)] h-full rounded-full transition-all duration-200"
                  style={{ width: `${fitProgress}%` }}
                />
              </div>
              <span className="text-xs text-[var(--sol-muted)]">{fitProgress}% Completed</span>
            </div>

            {!isFitting && fitProgress === 0 && (
              <button
                type="button"
                onClick={handleRunFitting}
                className="sol-btn !py-2.5 !px-6 cursor-pointer"
              >
                <span>Start Optimization & Fitting</span>
                <span className="sol-btn-arrow">→</span>
              </button>
            )}
          </div>
        )}

        {/* Wizard Step 4: Calibrate tau */}
        {activeStep === 4 && (
          <div className="p-5 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)] space-y-4 sol-mono">
            <h3 className="text-sm font-bold text-[var(--sol-ink)] font-serif">
              {getTranslation(language, 'profile.threshold_slider_label')}
            </h3>
            <p className="text-xs text-[var(--sol-soft)] leading-relaxed">
              {getTranslation(language, 'profile.threshold_explainer')}
            </p>

            <div className="space-y-3 p-4 rounded-xl bg-[var(--sol-card)] border border-[var(--sol-line)]">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--sol-muted)]">Genuine Score Percentile Cutoff:</span>
                <span className="text-[var(--sol-accent)] font-bold text-sm">{percentileCutoff}th Percentile (&tau; = {(-3.85 - (5 - percentileCutoff) * 0.15).toFixed(2)})</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="1"
                value={percentileCutoff}
                onChange={(e) => setPercentileCutoff(Number(e.target.value))}
                className="w-full h-2 bg-[var(--sol-panel)] rounded-lg appearance-none cursor-pointer accent-[var(--sol-accent)]"
              />
              <div className="flex justify-between text-[10px] text-[var(--sol-muted)]">
                <span>1st (Strict Security / Higher FRR)</span>
                <span>5th (Balanced)</span>
                <span>15th (Permissive / Lower FRR)</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActiveStep(5)}
                className="sol-btn !py-2 !px-4 !text-xs cursor-pointer"
              >
                <span>Proceed to Flash Export</span>
                <span className="sol-btn-arrow">→</span>
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 5: Freeze & Export to ESP32 */}
        {activeStep === 5 && (
          <div className="p-5 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)] space-y-4 sol-mono text-center">
            <CheckCircle className="w-8 h-8 text-[var(--sol-accent)] mx-auto" />
            <h3 className="text-base font-bold text-[var(--sol-ink)] font-serif">
              Profile Ready for Non-Volatile Flash Memory
            </h3>
            <p className="text-xs text-[var(--sol-soft)] max-w-md mx-auto">
              Mean vector &mu; and regularized covariance inverse &Sigma;&minus;&sup1; are serialized into compact C-header structs for ESP32 SRAM inference.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleFreezeProfile}
                className="sol-btn !py-3 !px-6 cursor-pointer"
              >
                <span>{getTranslation(language, 'profile.freeze_btn')}</span>
                <span className="sol-btn-arrow">→</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Visual Analytics: Genuine Score Distribution & Stability Sweep */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Genuine Leave-One-Out Histogram */}
        <div className="sol-card sol-card-pad space-y-3 sol-mono">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--sol-line)]">
            <span className="sol-kicker">
              {getTranslation(language, 'profile.dist_title')}
            </span>
            <span className="text-[11px] text-[var(--sol-accent)] font-bold">&tau; = {ownerProfile.tau.toFixed(2)}</span>
          </div>
          <p className="text-[11px] text-[var(--sol-soft)] leading-relaxed">
            {getTranslation(language, 'profile.dist_desc')}
          </p>

          <div dir="ltr" className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreBins} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--sol-line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="bin" stroke="var(--sol-muted)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--sol-muted)" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--sol-card)',
                    borderColor: 'var(--sol-line)',
                    color: 'var(--sol-ink)',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                    borderRadius: '8px',
                    boxShadow: 'var(--sol-shadow)',
                  }}
                  formatter={(val: any) => [`${val} genuine trials`, 'Density']}
                />
                <ReferenceLine x=" -4.0 to -3.5" stroke="#E9A23B" strokeDasharray="3 3" label={{ value: 'τ', fill: '#E9A23B', fontSize: 12 }} />
                <Bar dataKey="count" fill="var(--sol-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Stability vs Number of Trials */}
        <div className="sol-card sol-card-pad space-y-3 sol-mono">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--sol-line)]">
            <span className="sol-kicker">
              {getTranslation(language, 'profile.stability_title')}
            </span>
            <span className="text-[11px] text-[var(--sol-accent)] font-bold">Asymptotic ~20 Trials</span>
          </div>
          <p className="text-[11px] text-[var(--sol-soft)] leading-relaxed">
            {getTranslation(language, 'profile.stability_desc')}
          </p>

          <div dir="ltr" className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ownerProfile.stabilityCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--sol-line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="trials" stroke="var(--sol-muted)" fontSize={10} unit=" trials" tickLine={false} />
                <YAxis stroke="var(--sol-muted)" fontSize={10} unit="%" domain={[30, 100]} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--sol-card)',
                    borderColor: 'var(--sol-line)',
                    color: 'var(--sol-ink)',
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                    borderRadius: '8px',
                    boxShadow: 'var(--sol-shadow)',
                  }}
                  formatter={(val: any) => [`${val}% stability`, 'Convergence']}
                />
                <Line type="monotone" dataKey="scoreStability" stroke="var(--sol-accent)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--sol-ink)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Danger Zone: Reset Profile */}
      <div className="sol-card sol-card-pad !border-red-500/30 !bg-red-500/5 space-y-3">
        <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider sol-mono">
            {getTranslation(language, 'profile.danger_zone')}
          </h3>
        </div>
        <p className="text-xs text-[var(--sol-soft)]">
          {getTranslation(language, 'profile.reset_confirm')}
        </p>

        {!showResetConfirm ? (
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="sol-pill !border-red-500/40 !text-red-800 dark:!text-red-400 hover:!bg-red-500/10 cursor-pointer text-xs font-bold"
          >
            {getTranslation(language, 'profile.reset_btn')}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetOwnerProfile();
                setShowResetConfirm(false);
              }}
              className="sol-btn !bg-red-600 hover:!bg-red-700 !text-white !py-1.5 !px-3 !text-xs cursor-pointer"
            >
              Confirm Wipe Profile
            </button>
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              className="sol-btn sol-btn-ghost !py-1.5 !px-3 !text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default EnrollmentProfile;
