import React, { useState } from 'react';
import { useThenarStore } from '../store/useThenarStore';
import { getTranslation } from '../i18n';
import {
  BarChart,
  Layers,
  ShieldAlert,
  Cpu,
  Users,
  Info,
} from 'lucide-react';

export const Analytics: React.FC = () => {
  const { language } = useThenarStore();
  const [activeTab, setActiveTab] = useState<'models' | 'ablation' | 'attacks' | 'system' | 'participants'>('models');

  return (
    <div className="sol-wrap py-8 space-y-8">
      {/* Title */}
      <div className="pb-4 border-b border-[var(--sol-line)]">
        <span className="sol-tag">SCIENTIFIC EVALUATION BENCHMARKS</span>
        <h1 className="sol-h1 font-serif mt-2 !text-3xl">
          {getTranslation(language, 'analytics.title')}
        </h1>
        <p className="text-sm text-[var(--sol-soft)] mt-1">
          {getTranslation(language, 'analytics.subtitle')}
        </p>
      </div>

      {/* Graduation Project Thesis Evaluation Notice */}
      <div className="sol-card sol-card-pad !border-[var(--sol-accent)]/30 !bg-[color-mix(in_srgb,var(--sol-accent)_6%,var(--sol-card))] flex items-start gap-3.5">
        <Info className="w-5 h-5 text-[var(--sol-accent)] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-[var(--sol-ink)] uppercase sol-mono text-xs">
            Scientific Integrity Protocol
          </span>
          <p className="leading-relaxed text-[var(--sol-soft)] sol-mono text-xs">
            {getTranslation(language, 'analytics.notice')}
          </p>
          <p className="text-[11px] text-[var(--sol-accent)] sol-mono pt-1">
            &ldquo;Results are filled from measured held-out sessions; confidence intervals resample volunteers and sessions.&rdquo;
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[var(--sol-panel)] rounded-xl border border-[var(--sol-line)] sol-mono text-xs">
        {[
          { id: 'models', label: getTranslation(language, 'analytics.tab_models'), icon: Layers },
          { id: 'ablation', label: getTranslation(language, 'analytics.tab_ablation'), icon: BarChart },
          { id: 'attacks', label: getTranslation(language, 'analytics.tab_attacks'), icon: ShieldAlert },
          { id: 'system', label: getTranslation(language, 'analytics.tab_system'), icon: Cpu },
          { id: 'participants', label: getTranslation(language, 'analytics.tab_participants'), icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                isActive
                  ? 'bg-[var(--btn-tonal-bg)] text-[var(--btn-tonal-fg)] font-bold shadow-sm border border-[var(--btn-tonal-border)]'
                  : 'text-[var(--sol-soft)] hover:text-[var(--sol-ink)] hover:bg-[var(--sol-card)]'
              }`}
            >
              <Icon className="w-4 h-4 text-[var(--sol-accent)]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Table R1 Model Comparison */}
      {activeTab === 'models' && (
        <div className="space-y-4">
          <div className="sol-card overflow-hidden">
            <div className="p-4 border-b border-[var(--sol-line)] bg-[var(--sol-panel)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--sol-ink)] sol-mono">
                  Table R1: One-Class Model Comparison Benchmark
                </h3>
                <span className="text-[11px] text-[var(--sol-muted)] sol-mono">
                  Comparison against proposal target baselines on held-out test gestures
                </span>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--sol-card)] border border-[var(--sol-line)] sol-mono text-[var(--sol-muted)]">
                Pending Final Evaluation
              </span>
            </div>

            <div className="overflow-x-auto sol-mono text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--sol-line)] bg-[var(--sol-card)] text-[var(--sol-muted)] uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Model Candidate</th>
                    <th className="py-3 px-4">Feature Vector</th>
                    <th className="py-3 px-4">EER (%)</th>
                    <th className="py-3 px-4">AUC</th>
                    <th className="py-3 px-4">FAR @ Fixed FRR</th>
                    <th className="py-3 px-4">Flash Size</th>
                    <th className="py-3 px-4">Inference (ms)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--sol-line)]">
                  {[
                    { name: 'M1 Mahalanobis (Shrinkage Covariance)', features: 'Force + Motion (16-D)' },
                    { name: 'M2 One-Class SVM (RBF Kernel)', features: 'Force + Motion (16-D)' },
                    { name: 'M3 k-NN Distance (k=3)', features: 'Force + Motion (16-D)' },
                    { name: 'M4 Supervised Impostor Baseline', features: 'Force + Motion (16-D)' },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-[var(--sol-panel)]/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[var(--sol-ink)]">{row.name}</td>
                      <td className="py-3.5 px-4 text-[var(--sol-soft)]">{row.features}</td>
                      <td className="py-3.5 px-4 text-[var(--sol-muted)] font-bold">—</td>
                      <td className="py-3.5 px-4 text-[var(--sol-muted)] font-bold">—</td>
                      <td className="py-3.5 px-4 text-[var(--sol-muted)] font-bold">—</td>
                      <td className="py-3.5 px-4 text-[var(--sol-muted)] font-bold">—</td>
                      <td className="py-3.5 px-4 text-[var(--sol-muted)] font-bold">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Table R2 Ablation */}
      {activeTab === 'ablation' && (
        <div className="space-y-4">
          <div className="sol-card overflow-hidden sol-mono text-xs">
            <div className="p-4 border-b border-[var(--sol-line)] bg-[var(--sol-panel)]">
              <h3 className="text-sm font-bold text-[var(--sol-ink)]">
                Table R2: Sensor Modality Ablation Analysis
              </h3>
              <p className="text-[11px] text-[var(--sol-muted)] mt-0.5">
                Evaluating discrimination contribution of Force (HX711) vs Kinematic Motion (MPU-6050)
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--sol-line)] bg-[var(--sol-card)] text-[var(--sol-muted)] uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Sensor Modality Subset</th>
                    <th className="py-3 px-4">Feature Count</th>
                    <th className="py-3 px-4">EER (%)</th>
                    <th className="py-3 px-4">AUC</th>
                    <th className="py-3 px-4">FAR @ FRR=5%</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--sol-line)]">
                  {[
                    { mode: 'Force Only (HX711 Load Cell)', count: '6 Features' },
                    { mode: 'Motion Only (MPU-6050 IMU)', count: '8 Features' },
                    { mode: 'Combined Dual-Modal (Force + Motion + Cross-Channel)', count: '16 Features' },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-[var(--sol-panel)]/40">
                      <td className="py-3.5 px-4 font-bold text-[var(--sol-ink)]">{row.mode}</td>
                      <td className="py-3.5 px-4 text-[var(--sol-soft)]">{row.count}</td>
                      <td className="py-3.5 px-4 text-[var(--sol-muted)] font-bold">—</td>
                      <td className="py-3.5 px-4 text-[var(--sol-muted)] font-bold">—</td>
                      <td className="py-3.5 px-4 text-[var(--sol-muted)] font-bold">—</td>
                      <td className="py-3.5 px-4 text-[var(--sol-accent)] text-[11px]">Pending Experiment</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Table R3 Threat Scenarios */}
      {activeTab === 'attacks' && (
        <div className="space-y-4">
          <div className="sol-card overflow-hidden sol-mono text-xs">
            <div className="p-4 border-b border-[var(--sol-line)] bg-[var(--sol-panel)]">
              <h3 className="text-sm font-bold text-[var(--sol-ink)]">
                Table R3: Adversarial Threat Scenario Evaluation
              </h3>
              <p className="text-[11px] text-[var(--sol-muted)] mt-0.5">
                Evaluation across naive impostors and multi-tier mimicry adversaries
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--sol-line)] bg-[var(--sol-card)] text-[var(--sol-muted)] uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Adversary Scenario</th>
                    <th className="py-3 px-4">Test Attempts</th>
                    <th className="py-3 px-4">Simulated FP Gate</th>
                    <th className="py-3 px-4">FAR (%)</th>
                    <th className="py-3 px-4">95% Confidence Interval</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--sol-line)]">
                  {[
                    { sc: 'A1 Casual Impostor (Naive)', fp: 'Normal Unenrolled' },
                    { sc: 'A2 Observer / Mimicry Level 1', fp: 'Normal Unenrolled' },
                    { sc: 'A2 Informed Mimicry Level 2 (Pessimistic)', fp: 'Normal Unenrolled' },
                    { sc: 'Simulated Fingerprint Compromise (Gate 1 Bypassed)', fp: 'Forced Accepted (Silicone Spoof)' },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-[var(--sol-panel)]/40">
                      <td className="py-3.5 px-4 font-bold text-[var(--sol-ink)]">{row.sc}</td>
                      <td className="py-3.5 px-4 text-[var(--sol-soft)]">—</td>
                      <td className="py-3.5 px-4 text-[var(--sol-accent)]">{row.fp}</td>
                      <td className="py-3.5 px-4 text-[var(--sol-muted)] font-bold">—</td>
                      <td className="py-3.5 px-4 text-[var(--sol-muted)] font-bold">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Table R4 ESP32 System Metrics */}
      {activeTab === 'system' && (
        <div className="space-y-4">
          <div className="sol-card overflow-hidden sol-mono text-xs">
            <div className="p-4 border-b border-[var(--sol-line)] bg-[var(--sol-panel)]">
              <h3 className="text-sm font-bold text-[var(--sol-ink)]">
                Table R4: Microcontroller (ESP32-WROOM-32) System Resource Profile
              </h3>
              <p className="text-[11px] text-[var(--sol-muted)] mt-0.5">
                On-device embedded latency, memory footprints, and timing budgets
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--sol-line)] bg-[var(--sol-card)] text-[var(--sol-muted)] uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Subsystem Phase</th>
                    <th className="py-3 px-4">Execution Time (ms)</th>
                    <th className="py-3 px-4">Target Budget</th>
                    <th className="py-3 px-4">Peak SRAM Usage</th>
                    <th className="py-3 px-4">Flash Footprint</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--sol-line)]">
                  {[
                    { phase: 'Raw Telemetry Ring Buffer Acquisition (100 Hz)', budget: '< 10 ms per tick' },
                    { phase: '16-D Feature Extraction Pipeline', budget: '< 35 ms' },
                    { phase: 'Mahalanobis Score s(x) Inference', budget: '< 15 ms' },
                    { phase: 'End-to-End Decision Latency (Release to Solenoid)', budget: '< 100 ms' },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-[var(--sol-panel)]/40">
                      <td className="py-3.5 px-4 font-bold text-[var(--sol-ink)]">{row.phase}</td>
                      <td className="py-3.5 px-4 text-[var(--sol-muted)] font-bold">—</td>
                      <td className="py-3.5 px-4 text-[var(--sol-soft)]">{row.budget}</td>
                      <td className="py-3.5 px-4 text-[var(--sol-muted)] font-bold">—</td>
                      <td className="py-3.5 px-4 text-[var(--sol-muted)] font-bold">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Table R5 Participant-level Impostor Analysis */}
      {activeTab === 'participants' && (
        <div className="space-y-4">
          <div className="sol-card overflow-hidden sol-mono text-xs">
            <div className="p-4 border-b border-[var(--sol-line)] bg-[var(--sol-panel)]">
              <h3 className="text-sm font-bold text-[var(--sol-ink)]">
                Table R5: Participant-Level Impostor & Volunteer Analysis
              </h3>
              <p className="text-[11px] text-[var(--sol-muted)] mt-0.5">
                (One row per test participant enrolled in the laboratory graduation study)
              </p>
            </div>

            <div className="p-12 text-center space-y-3">
              <Users className="w-10 h-10 text-[var(--sol-muted)] mx-auto" />
              <div className="text-sm font-semibold text-[var(--sol-ink)] font-serif">
                Held-out Cohort Protocol Awaiting Volunteer Session Freeze
              </div>
              <p className="text-xs text-[var(--sol-soft)] max-w-md mx-auto leading-relaxed">
                Participant rows P01–P20 will populate here automatically upon dataset ingestion from the official thesis trials.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart Frames (ROC with diagonal chance baseline, and empty DET frame) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 sol-mono">
        
        {/* ROC Curve Frame */}
        <div className="sol-card sol-card-pad space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--sol-line)]">
            <span className="sol-kicker">
              {getTranslation(language, 'analytics.roc_frame')}
            </span>
            <span className="text-[11px] text-[var(--sol-accent)] font-bold">AUC: —</span>
          </div>

          <p className="text-[11px] text-[var(--sol-muted)]">
            {getTranslation(language, 'analytics.roc_caption')}
          </p>

          <div dir="ltr" className="w-full aspect-[4/3] bg-[var(--sol-panel)] border border-[var(--sol-line)] rounded-xl relative flex items-center justify-center p-4">
            <svg viewBox="0 0 300 240" className="w-full h-full select-none">
              {/* Grid axes */}
              <line x1="40" y1="20" x2="40" y2="200" stroke="var(--sol-line2)" strokeWidth="1.5" />
              <line x1="40" y1="200" x2="280" y2="200" stroke="var(--sol-line2)" strokeWidth="1.5" />

              {/* Diagonal chance line (Random Guessing Baseline) */}
              <line x1="40" y1="200" x2="280" y2="20" stroke="var(--sol-muted)" strokeWidth="1.5" strokeDasharray="4,4" />

              {/* Axis labels */}
              <text x="14" y="110" fill="var(--sol-muted)" fontSize="9" transform="rotate(-90, 14, 110)">
                True Accept Rate (TAR)
              </text>
              <text x="120" y="224" fill="var(--sol-muted)" fontSize="9">
                False Accept Rate (FAR)
              </text>
              <text x="150" y="130" fill="var(--sol-muted)" fontSize="9" transform="rotate(-40, 150, 130)">
                Chance Baseline (AUC = 0.50)
              </text>
            </svg>

            <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[2px] rounded-xl">
              <span className="text-xs px-3.5 py-1.5 rounded-full bg-[var(--sol-paper)] border border-[var(--sol-line)] text-[var(--sol-ink)] font-semibold shadow-sm">
                Pending Final Evaluation
              </span>
            </div>
          </div>
        </div>

        {/* DET Curve Frame */}
        <div className="sol-card sol-card-pad space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--sol-line)]">
            <span className="sol-kicker">
              {getTranslation(language, 'analytics.det_frame')}
            </span>
            <span className="text-[11px] text-[var(--sol-accent)] font-bold">EER: —</span>
          </div>

          <p className="text-[11px] text-[var(--sol-muted)]">
            {getTranslation(language, 'analytics.det_caption')}
          </p>

          <div dir="ltr" className="w-full aspect-[4/3] bg-[var(--sol-panel)] border border-[var(--sol-line)] rounded-xl relative flex items-center justify-center p-4">
            <svg viewBox="0 0 300 240" className="w-full h-full select-none">
              <line x1="40" y1="20" x2="40" y2="200" stroke="var(--sol-line2)" strokeWidth="1.5" />
              <line x1="40" y1="200" x2="280" y2="200" stroke="var(--sol-line2)" strokeWidth="1.5" />

              {/* Grid tick marks */}
              <line x1="40" y1="65" x2="280" y2="65" stroke="var(--sol-line)" strokeDasharray="2,2" />
              <line x1="40" y1="130" x2="280" y2="130" stroke="var(--sol-line)" strokeDasharray="2,2" />
              <line x1="120" y1="20" x2="120" y2="200" stroke="var(--sol-line)" strokeDasharray="2,2" />
              <line x1="200" y1="20" x2="200" y2="200" stroke="var(--sol-line)" strokeDasharray="2,2" />

              <text x="14" y="110" fill="var(--sol-muted)" fontSize="9" transform="rotate(-90, 14, 110)">
                False Reject Rate (FRR) [%]
              </text>
              <text x="120" y="224" fill="var(--sol-muted)" fontSize="9">
                False Accept Rate (FAR) [%]
              </text>
            </svg>

            <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[2px] rounded-xl">
              <span className="text-xs px-3.5 py-1.5 rounded-full bg-[var(--sol-paper)] border border-[var(--sol-line)] text-[var(--sol-ink)] font-semibold shadow-sm">
                Pending Final Evaluation
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Analytics;
