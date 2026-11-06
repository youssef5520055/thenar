import React from 'react';
import { useThenarStore } from '../store/useThenarStore';
import { getTranslation } from '../i18n';
import { Bell, Check, Trash2, X, ShieldAlert, CheckCircle, AlertTriangle, Key } from 'lucide-react';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const { notifications, language, markNotificationsAsRead, clearNotifications } = useThenarStore();

  if (!isOpen) return null;

  return (
    <div className="absolute top-12 right-0 w-80 sm:w-96 bg-[var(--sol-card)] border border-[var(--sol-line2)] rounded-2xl shadow-[var(--sol-shadow)] z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-[var(--sol-line)] bg-[var(--sol-panel)]">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[var(--sol-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--sol-ink)]">
            {getTranslation(language, 'notifications.title')}
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--sol-accent)_15%,transparent)] text-[var(--sol-accent)] sol-mono font-semibold">
            {notifications.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearNotifications}
              className="sol-icon-btn !w-7 !h-7 text-[var(--sol-muted)] hover:text-[#d1495b] transition-colors"
              title={getTranslation(language, 'notifications.clear')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="sol-icon-btn !w-7 !h-7 text-[var(--sol-muted)] hover:text-[var(--sol-ink)] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-[var(--sol-line)]">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--sol-muted)] sol-mono">
            {getTranslation(language, 'notifications.empty')}
          </div>
        ) : (
          notifications.map((notif) => {
            const isAccept = notif.type === 'accept';
            const isLockout = notif.type === 'lockout';
            const isFault = notif.type === 'fault';

            return (
              <div
                key={notif.id}
                className={`p-3 transition-colors ${
                  notif.read ? 'bg-[var(--sol-card)]' : 'bg-[color-mix(in_srgb,var(--sol-accent)_6%,var(--sol-card))]'
                } hover:bg-[var(--sol-panel)]`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">
                    {isAccept ? (
                      <CheckCircle className="w-4 h-4 text-[var(--sol-accent)]" />
                    ) : isLockout ? (
                      <ShieldAlert className="w-4 h-4 text-[#d1495b]" />
                    ) : isFault ? (
                      <AlertTriangle className="w-4 h-4 text-[var(--color-warn)]" />
                    ) : (
                      <Key className="w-4 h-4 text-[#0284c7]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--sol-ink)] truncate">
                      {getTranslation(language, notif.titleKey)}
                    </p>
                    <p className="text-[11px] text-[var(--sol-soft)] mt-0.5 leading-snug">
                      {getTranslation(language, notif.descKey)}
                    </p>
                    <span className="text-[10px] text-[var(--sol-muted)] sol-mono mt-1 block">
                      {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-2 border-t border-[var(--sol-line)] bg-[var(--sol-panel)] text-center">
          <button
            type="button"
            onClick={markNotificationsAsRead}
            className="text-[11px] text-[var(--sol-accent)] hover:underline font-medium inline-flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" />
            Mark all read
          </button>
        </div>
      )}
    </div>
  );
};
