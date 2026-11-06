import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useThenarStore } from '../store/useThenarStore';
import { getTranslation } from '../i18n';
import {
  LayoutDashboard,
  Activity,
  History,
  UserCheck,
  BarChart3,
  ShieldAlert,
  Settings,
  MoreHorizontal,
  X,
  Cpu,
  Lock,
  Unlock,
  Shield
} from 'lucide-react';

export const Navigation: React.FC = () => {
  const { language, lockState, serviceSwitchEngaged } = useThenarStore();
  const location = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainNavItems = [
    { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { to: '/live', labelKey: 'nav.live', icon: Activity },
    { to: '/log', labelKey: 'nav.log', icon: History },
    { to: '/profile', labelKey: 'nav.profile', icon: UserCheck },
    { to: '/attack', labelKey: 'nav.attack', icon: ShieldAlert },
  ];

  const secondaryNavItems = [
    { to: '/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
    { to: '/settings', labelKey: 'nav.settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar (Styled in reference .sol-card / .sol-line hairline aesthetic) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--sol-card)] border-t border-[var(--sol-line)] pb-safe px-1.5 py-1 flex items-center shadow-[var(--sol-shadow)]">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-lg text-[9.5px] transition-colors relative ${
                isActive ? 'text-[var(--sol-accent)] font-semibold' : 'text-[var(--sol-muted)] hover:text-[var(--sol-ink)]'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5 shrink-0" />
              <span className="truncate w-full text-center font-sans text-[9.5px] leading-tight px-0.5">
                {getTranslation(language, item.labelKey)}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-5 h-0.5 rounded-full bg-[var(--sol-accent)]" />
              )}
            </NavLink>
          );
        })}

        {/* "More" button for secondary views */}
        <button
          type="button"
          onClick={() => setShowMoreMenu(true)}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-lg text-[9.5px] ${
            secondaryNavItems.some((i) => i.to === location.pathname)
              ? 'text-[var(--sol-accent)] font-semibold'
              : 'text-[var(--sol-muted)]'
          }`}
          aria-label="More navigation items"
        >
          <MoreHorizontal className="w-4 h-4 mb-0.5 shrink-0" />
          <span className="truncate w-full text-center font-sans text-[9.5px] leading-tight px-0.5">{getTranslation(language, 'nav.more')}</span>
        </button>
      </nav>

      {/* Mobile "More" Drawer Modal */}
      {showMoreMenu && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col justify-end p-4 animate-in fade-in"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="w-full bg-[var(--sol-paper)] border border-[var(--sol-line2)] rounded-2xl p-4 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--sol-line)]">
              <span className="text-sm font-semibold text-[var(--sol-ink)]">
                {getTranslation(language, 'nav.more')}
              </span>
              <button
                type="button"
                onClick={() => setShowMoreMenu(false)}
                className="sol-icon-btn !w-7 !h-7 text-[var(--sol-muted)] hover:text-[var(--sol-ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition-colors ${
                      isActive
                        ? 'border-[var(--sol-accent)] bg-[color-mix(in_srgb,var(--sol-accent)_12%,var(--sol-card))] text-[var(--sol-accent)] font-bold'
                        : 'border-[var(--sol-line)] bg-[var(--sol-card)] text-[var(--sol-soft)] hover:bg-[var(--sol-panel)]'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[var(--sol-accent)]" />
                    <span>{getTranslation(language, item.labelKey)}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
