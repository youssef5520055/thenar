import React, { useState } from 'react';
import { useThenarStore } from '../store/useThenarStore';
import { getTranslation } from '../i18n';
import {
  Shield,
  Wifi,
  Sliders,
  Cpu,
  Lock,
  RotateCcw,
  Check,
  Download,
} from 'lucide-react';
import { downloadFile } from '../mock/engine';

export const Settings: React.FC = () => {
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    maxFailuresBeforeLockout,
    lockoutDurationSeconds,
    unlockHoldSeconds,
    updateSettings,
    serviceSwitchEngaged,
    setServiceSwitch,
    wifiRssi,
    attempts,
    ownerProfile,
    resetToSeedData,
    addNotification,
  } = useThenarStore();

  const [failuresInput, setFailuresInput] = useState<number>(maxFailuresBeforeLockout);
  const [lockoutDurationInput, setLockoutDurationInput] = useState<number>(lockoutDurationSeconds);
  const [unlockHoldInput, setUnlockHoldInput] = useState<number>(unlockHoldSeconds);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [reconnectedSuccess, setReconnectedSuccess] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      maxFailures: failuresInput,
      lockoutDuration: lockoutDurationInput,
      unlockHold: unlockHoldInput,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleReconnect = () => {
    setIsReconnecting(true);
    setReconnectedSuccess(false);
    setTimeout(() => {
      setIsReconnecting(false);
      setReconnectedSuccess(true);
      setTimeout(() => setReconnectedSuccess(false), 3000);
    }, 1200);
  };

  const handleExportAll = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      ownerProfile,
      attempts,
      settings: {
        maxFailuresBeforeLockout,
        lockoutDurationSeconds,
        unlockHoldSeconds,
      }
    };
    downloadFile(JSON.stringify(backup, null, 2), `thenar_full_companion_backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  };

  const handleDeleteAll = () => {
    localStorage.clear();
    resetToSeedData();
    setShowResetConfirm(false);
    addNotification({
      type: 'accept',
      titleKey: 'settings.reset_demo',
      descKey: 'status.state_locked',
    });
  };

  return (
    <div className="sol-wrap py-8 space-y-8 max-w-4xl mx-auto sol-mono text-xs">
      {/* Title */}
      <div className="pb-4 border-b border-[var(--sol-line)]">
        <span className="sol-tag">CONFIGURATION & PROTOCOLS</span>
        <h1 className="sol-h1 font-serif mt-2 !text-3xl">
          {getTranslation(language, 'settings.title')}
        </h1>
        <p className="text-sm text-[var(--sol-soft)] mt-1 font-sans">
          {getTranslation(language, 'settings.subtitle')}
        </p>
      </div>

      {/* 1. Security & Lockout Policy Form */}
      <form onSubmit={handleSaveSecurity} className="sol-card sol-card-pad space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--sol-line)]">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--sol-accent)]" />
            <h2 className="text-sm font-bold text-[var(--sol-ink)] font-serif uppercase tracking-wider">
              {getTranslation(language, 'settings.sec_title')}
            </h2>
          </div>
          {savedSuccess && (
            <span className="text-[var(--sol-accent)] flex items-center gap-1 font-bold">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[var(--sol-muted)] block">
              {getTranslation(language, 'settings.max_failures')}
            </label>
            <input
              type="number"
              min="2"
              max="10"
              value={failuresInput}
              onChange={(e) => setFailuresInput(Number(e.target.value))}
              className="w-full bg-[var(--sol-panel)] border border-[var(--sol-line)] rounded-xl px-3 py-2 text-[var(--sol-ink)] focus:outline-none focus:border-[var(--sol-accent)] text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[var(--sol-muted)] block">
              {getTranslation(language, 'settings.lockout_duration')} (s)
            </label>
            <input
              type="number"
              min="15"
              max="600"
              step="5"
              value={lockoutDurationInput}
              onChange={(e) => setLockoutDurationInput(Number(e.target.value))}
              className="w-full bg-[var(--sol-panel)] border border-[var(--sol-line)] rounded-xl px-3 py-2 text-[var(--sol-ink)] focus:outline-none focus:border-[var(--sol-accent)] text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[var(--sol-muted)] block">
              {getTranslation(language, 'settings.hold_interval')} (s)
            </label>
            <input
              type="number"
              min="1"
              max="15"
              step="1"
              value={unlockHoldInput}
              onChange={(e) => setUnlockHoldInput(Number(e.target.value))}
              className="w-full bg-[var(--sol-panel)] border border-[var(--sol-line)] rounded-xl px-3 py-2 text-[var(--sol-ink)] focus:outline-none focus:border-[var(--sol-accent)] text-sm"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)] text-[var(--sol-soft)] leading-relaxed">
          🔒 <strong className="text-[var(--sol-ink)] font-sans">{getTranslation(language, 'settings.lockout_escalation')}</strong>:
          Lockout persists across reboots/reloads to mimic hardware non-volatile RTC survival. Repeated infractions double the wait penalty.
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="sol-btn !py-2 !px-5 cursor-pointer"
          >
            <span>Apply Security Policies</span>
            <span className="sol-btn-arrow">→</span>
          </button>
        </div>
      </form>

      {/* 2. Device Link & Wi-Fi Telemetry */}
      <div className="sol-card sol-card-pad space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--sol-line)]">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-[var(--sol-accent)]" />
            <h2 className="text-sm font-bold text-[var(--sol-ink)] font-serif uppercase tracking-wider">
              {getTranslation(language, 'settings.net_title')}
            </h2>
          </div>
          <span className="text-[var(--sol-accent)] flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-[var(--sol-accent)] animate-pulse" />
            Wi-Fi Connected
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)]">
            <span className="text-[var(--sol-muted)] block text-[10px]">{getTranslation(language, 'settings.ip_address')}</span>
            <span className="text-[var(--sol-ink)] font-bold">192.168.4.1</span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)]">
            <span className="text-[var(--sol-muted)] block text-[10px]">{getTranslation(language, 'settings.mac_address')}</span>
            <span className="text-[var(--sol-ink)] font-bold">24:6F:28:9A:C4:B0</span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)]">
            <span className="text-[var(--sol-muted)] block text-[10px]">{getTranslation(language, 'settings.fw_version')}</span>
            <span className="text-[var(--sol-accent)] font-bold">v1.4.2-rel</span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)]">
            <span className="text-[var(--sol-muted)] block text-[10px]">{getTranslation(language, 'settings.hw_rev')}</span>
            <span className="text-[var(--sol-ink)] font-bold">Rev C (ESP32-WROOM)</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[var(--sol-muted)]">
            Signal RSSI: {wifiRssi} dBm (Good Link Quality)
          </span>

          <button
            type="button"
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="sol-pill flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
            <span>{isReconnecting ? 'Handshaking...' : reconnectedSuccess ? 'Verified' : getTranslation(language, 'settings.reconnect')}</span>
          </button>
        </div>
      </div>

      {/* 3. Physical Service Switch */}
      <div className="sol-card sol-card-pad space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--sol-line)]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[var(--sol-accent)]" />
            <h2 className="text-sm font-bold text-[var(--sol-ink)] font-serif uppercase tracking-wider">
              Internal Safe Service Switch
            </h2>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
            serviceSwitchEngaged ? 'bg-amber-500/20 text-amber-500' : 'bg-[var(--sol-panel)] text-[var(--sol-muted)]'
          }`}>
            {serviceSwitchEngaged ? 'SERVICE ACTIVE' : 'LOCKED (NORMAL)'}
          </span>
        </div>

        <p className="text-[var(--sol-soft)] leading-relaxed font-sans text-xs">
          The physical service toggle switch resides inside the locked safe door interior. Engaging service release grants access to profile retraining and flash write cycles.
        </p>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[var(--sol-muted)] text-[11px]">
            {serviceSwitchEngaged ? 'Calibration mode enabled' : 'Service release disengaged'}
          </span>

          <button
            type="button"
            onClick={() => setServiceSwitch(!serviceSwitchEngaged)}
            className={`sol-btn !py-2 !px-4 !text-xs cursor-pointer ${
              serviceSwitchEngaged
                ? '!bg-red-500/15 !text-red-800 dark:!text-red-400 !border-red-500/40 hover:!bg-red-500/25 font-bold'
                : ''
            }`}
          >
            <span>{serviceSwitchEngaged ? 'Disengage Switch' : 'Toggle Service Switch ON'}</span>
          </button>
        </div>
      </div>

      {/* 4. Privacy & Data Guarantees */}
      <div className="sol-card sol-card-pad space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--sol-line)]">
          <Lock className="w-4 h-4 text-[var(--sol-accent)]" />
          <h2 className="text-sm font-bold text-[var(--sol-ink)] font-serif uppercase tracking-wider">
            {getTranslation(language, 'settings.privacy_title')}
          </h2>
        </div>

        <div className="space-y-2 text-[var(--sol-soft)] font-sans leading-relaxed text-xs">
          <p>{getTranslation(language, 'settings.privacy_p1')}</p>
          <p>{getTranslation(language, 'settings.privacy_p2')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportAll}
            className="sol-pill flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <Download className="w-3.5 h-3.5 text-[var(--sol-accent)]" />
            <span>Export Complete Backup (JSON)</span>
          </button>
        </div>
      </div>

      {/* 5. Interface Preferences & Demo Reset */}
      <div className="sol-card sol-card-pad space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--sol-line)]">
          <Sliders className="w-4 h-4 text-[var(--sol-accent)]" />
          <h2 className="text-sm font-bold text-[var(--sol-ink)] font-serif uppercase tracking-wider">
            {getTranslation(language, 'settings.pref_title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)]">
            <span className="text-[var(--sol-soft)]">{getTranslation(language, 'settings.lang_toggle')}</span>
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="sol-pill cursor-pointer !text-xs font-bold text-[var(--sol-accent)]"
            >
              {language === 'en' ? 'عربي (RTL)' : 'English (LTR)'}
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--sol-panel)] border border-[var(--sol-line)]">
            <span className="text-[var(--sol-soft)]">{getTranslation(language, 'settings.theme_toggle')}</span>
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="sol-pill cursor-pointer !text-xs font-bold text-[var(--sol-accent)] capitalize"
            >
              {theme} Mode
            </button>
          </div>
        </div>

        {/* Demo reset */}
        <div className="pt-2 border-t border-[var(--sol-line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[var(--sol-ink)] font-bold block">{getTranslation(language, 'settings.reset_demo')}</span>
            <span className="text-[var(--sol-muted)] text-[11px] block font-sans">
              Restore default 40 seed attempts across S1-S4 and initial profile
            </span>
          </div>

          {!showResetConfirm ? (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="sol-pill !text-red-800 dark:!text-red-400 !border-red-500/30 hover:!bg-red-500/10 cursor-pointer font-bold"
            >
              Reset to Factory Seeds
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeleteAll}
                className="sol-btn !bg-red-700 hover:!bg-red-800 !text-white !py-1.5 !px-3 !text-xs cursor-pointer"
              >
                Confirm Full Reset
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

    </div>
  );
};

export default Settings;
