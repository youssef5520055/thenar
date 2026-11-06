import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useThenarStore } from './store/useThenarStore';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { StippledHorizon } from './components/StippledHorizon';

// Page screens
import { Dashboard } from './pages/Dashboard';
import { LiveSession } from './pages/LiveSession';
import { AttemptLog } from './pages/AttemptLog';
import { EnrollmentProfile } from './pages/EnrollmentProfile';
import { Analytics } from './pages/Analytics';
import { AttackSimulator } from './pages/AttackSimulator';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  const { language, theme, checkLockoutExpiry, initApiAndWs } = useThenarStore();

  // Initialize API connection and WebSocket listeners with automatic mock fallback
  useEffect(() => {
    const cleanup = initApiAndWs();
    return () => {
      if (cleanup) cleanup();
    };
  }, [initApiAndWs]);

  // Synchronize HTML attributes on mount and language/theme change
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [language, theme]);

  // Periodic lockout expiration check
  useEffect(() => {
    checkLockoutExpiry();
    const timer = setInterval(() => {
      checkLockoutExpiry();
    }, 1000);
    return () => clearInterval(timer);
  }, [checkLockoutExpiry]);

  return (
    <HashRouter>
      <div
        data-theme={theme}
        className="sol-root min-h-screen flex flex-col bg-[var(--sol-paper)] text-[var(--sol-ink)] selection:bg-[var(--sol-accent)]/20 selection:text-[var(--sol-accent)]"
      >
        {/* Sticky blur header */}
        <Header />

        {/* Core Layout: Mobile bottom nav + main fluid container */}
        <Navigation />

        <main className="flex-1 min-w-0 w-full">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/live" element={<LiveSession />} />
            <Route path="/log" element={<AttemptLog />} />
            <Route path="/profile" element={<EnrollmentProfile />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/attack" element={<AttackSimulator />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Footer with Stippled Horizon */}
        <footer className="sol-foot">
          <div className="sol-wrap">
            <p className="sol-foot-tag font-serif italic text-[var(--sol-ink)]">
              &ldquo;It knows how you open.&rdquo;
            </p>
          </div>

          <StippledHorizon />

          <div className="sol-wrap sol-foot-row">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded overflow-hidden border border-[var(--sol-line)]">
                  <img src="/favicon.png" alt="Thenar" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold tracking-wider text-sm text-[var(--sol-ink)]">
                  Thenar Safe Handle
                </span>
                <span className="sol-mono text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--sol-panel)] border border-[var(--sol-line)] text-[var(--sol-soft)]">
                  Owner Companion
                </span>
              </div>
              <p className="sol-muted text-xs mt-2 max-w-sm">
                Dual-gate behavioral biometric safe handle companion. In-browser mock hardware engine, ESP32 telemetry, and local Mahalanobis classification.
              </p>
            </div>

            <div className="sol-foot-cols">
              <div>
                <h4>Hardware Pipeline</h4>
                <ul className="sol-mono text-[11px] text-[var(--sol-soft)] space-y-1">
                  <li>ESP32 NodeMCU-32S</li>
                  <li>HX711 + Load Cell (Grip)</li>
                  <li>MPU-6050 6-DoF IMU</li>
                  <li>Fail-Secure Solenoid Bolt</li>
                </ul>
              </div>

              <div>
                <h4>Biometric Gates</h4>
                <ul className="sol-mono text-[11px] text-[var(--sol-soft)] space-y-1">
                  <li>Gate 1: Optical Minutiae (FAR 0.001%)</li>
                  <li>Gate 2: 16-D Kinematics s(x) &ge; &tau;</li>
                  <li>Non-diagonal Covariance &Sigma;</li>
                  <li>Client-side Offline Execution</li>
                </ul>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </HashRouter>
  );
};

export default App;
