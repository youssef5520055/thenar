import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useThenarStore } from '../store/useThenarStore';
import { getTranslation } from '../i18n';
import { NotificationCenter } from './NotificationCenter';
import { Bell, Sun, Moon, Globe, Wifi } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    esp32Online,
    wifiRssi,
    notifications,
    isGatewayOnline,
    gatewayMode
  } = useThenarStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setStuck(window.scrollY > 12);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const navLinks = [
    { to: '/', labelKey: 'nav.dashboard' },
    { to: '/live', labelKey: 'nav.live' },
    { to: '/log', labelKey: 'nav.log' },
    { to: '/profile', labelKey: 'nav.profile' },
    { to: '/analytics', labelKey: 'nav.analytics' },
    { to: '/attack', labelKey: 'nav.attack' },
    { to: '/settings', labelKey: 'nav.settings' },
  ];

  return (
    <header className="sol-nav" data-stuck={stuck ? '' : undefined}>
      <div className="sol-wrap">
        {/* Brand / Logo section */}
        <NavLink to="/" className="sol-brand" aria-label="Thenar, home">
          <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center p-0.5 shadow-sm border border-[var(--sol-line)]">
            <img
              src="/emblem.svg"
              alt="Thenar Biometric Emblem"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-bold tracking-widest text-sm text-[var(--sol-ink)]">
            {getTranslation(language, 'app.title')}
          </span>
          <span className="sol-mono text-[9.5px] px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--sol-accent)_15%,transparent)] text-[#094e48] dark:text-[var(--sol-accent)] font-semibold border border-[color-mix(in_srgb,var(--sol-accent)_25%,transparent)]">
            {getTranslation(language, 'app.role')}
          </span>
        </NavLink>

        {/* Desktop Links styled exactly like .sol-links */}
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="sol-links">
            {navLinks.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? 'font-medium text-[var(--sol-ink)] !border-b !border-[var(--sol-ink)]' : ''
                  }
                >
                  {getTranslation(language, item.labelKey)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Telemetry Indicator + Controls */}
        <div className="sol-navr">
          {/* Hardware online chip */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--sol-card)] border border-[var(--sol-line)] text-xs sol-mono shadow-sm">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isGatewayOnline ? 'bg-[var(--sol-accent)] animate-pulse' : 'bg-[#e9a23b]'
              }`}
            />
            <span className="text-[var(--sol-soft)]">
              {isGatewayOnline
                ? (language === 'ar' ? 'متصل: Gateway API' : 'Gateway: Online')
                : (language === 'ar' ? 'محاكي محلي (Offline)' : 'Offline Demo Mode')}
            </span>
          </div>

          {/* Wi-Fi RSSI */}
          <div className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--sol-card)] border border-[var(--sol-line)] text-xs sol-mono text-[var(--sol-muted)] shadow-sm">
            <Wifi className="w-3 h-3 text-[var(--sol-accent)]" />
            <span>{wifiRssi} dBm</span>
          </div>

          {/* Language Toggle */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="sol-icon-btn sol-mono text-xs font-semibold"
            aria-label="Toggle language"
            title="Toggle English / Arabic"
          >
            <span className="text-[11px] font-bold text-[var(--sol-ink)]">
              {language === 'en' ? 'ع' : 'EN'}
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="sol-icon-btn"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title="Toggle Light / Dark Mode"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[var(--sol-soft)]" />
            ) : (
              <Moon className="w-4 h-4 text-[var(--sol-soft)]" />
            )}
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="sol-icon-btn relative"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-[var(--sol-soft)]" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--sol-accent)]" />
              )}
            </button>

            <NotificationCenter
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
