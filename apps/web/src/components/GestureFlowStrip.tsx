import React from 'react';
import { motion } from 'framer-motion';
import { useThenarStore } from '../store/useThenarStore';
import { getTranslation } from '../i18n';
import { Fingerprint, Hand, RotateCw, Undo2, Cpu } from 'lucide-react';

export const GestureFlowStrip: React.FC = () => {
  const { activeGestureStep, language } = useThenarStore();

  const steps = [
    { key: 'touch', label: getTranslation(language, 'dashboard.step_touch'), icon: Fingerprint },
    { key: 'grip', label: getTranslation(language, 'dashboard.step_grip'), icon: Hand },
    { key: 'turn', label: getTranslation(language, 'dashboard.step_turn'), icon: RotateCw },
    { key: 'release', label: getTranslation(language, 'dashboard.step_release'), icon: Undo2 },
    { key: 'decision', label: getTranslation(language, 'dashboard.step_decision'), icon: Cpu },
  ] as const;

  return (
    <div className="w-full bg-[var(--sol-card)] border border-[var(--sol-line)] rounded-2xl p-3 sm:p-4 shadow-[var(--sol-shadow)]">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[11px] font-semibold text-[var(--sol-muted)] uppercase tracking-wider sol-mono">
          {getTranslation(language, 'dashboard.pipeline_title')}
        </span>
        <span className="text-[10px] text-[var(--sol-muted)] sol-mono">
          {activeGestureStep === 'idle' ? 'STANDBY' : activeGestureStep.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {steps.map((step, index) => {
          const isActive = activeGestureStep === step.key;
          const Icon = step.icon;

          return (
            <div
              key={step.key}
              className={`relative flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all duration-300 ${
                isActive
                  ? 'border-[var(--sol-accent)] bg-[color-mix(in_srgb,var(--sol-accent)_12%,var(--sol-card))] text-[var(--sol-accent)] shadow-sm'
                  : 'border-[var(--sol-line)] bg-[var(--sol-panel)] text-[var(--sol-soft)] hover:text-[var(--sol-ink)]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="flowPulse"
                  className="absolute inset-0 rounded-xl border-2 border-[var(--sol-accent)]"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}

              <Icon className={`w-4 h-4 mb-1 transition-transform ${isActive ? 'scale-110 animate-pulse' : ''}`} />
              <span className="text-[10.5px] font-medium leading-tight truncate w-full">
                {step.label}
              </span>

              <span className="text-[9px] sol-mono text-[var(--sol-muted)] mt-0.5">
                0{index + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
