import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useThenarStore } from '../store/useThenarStore';
import { getTranslation } from '../i18n';
import { ShieldAlert, AlertTriangle, Unlock, Lock } from 'lucide-react';

export const LockMechanismSVG: React.FC = () => {
  const {
    lockState,
    doorReedOpen,
    solenoidActive,
    boltRetracted,
    lockoutEndTime,
    failureCounter,
    maxFailuresBeforeLockout,
    checkLockoutExpiry,
    language
  } = useThenarStore();

  const [remainingLockout, setRemainingLockout] = useState<number>(0);

  useEffect(() => {
    if (lockState === 'LOCKOUT' && lockoutEndTime) {
      const interval = setInterval(() => {
        const left = Math.max(0, Math.ceil((lockoutEndTime - Date.now()) / 1000));
        setRemainingLockout(left);
        if (left <= 0) {
          checkLockoutExpiry();
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [lockState, lockoutEndTime, checkLockoutExpiry]);

  const isLockout = lockState === 'LOCKOUT';
  const isFault = lockState === 'FAULT';
  const isUnlocking = lockState === 'UNLOCKING';
  const isDoorOpen = lockState === 'DOOR_OPEN' || doorReedOpen;

  let stateColor = 'var(--sol-accent)';
  let stateLabel = getTranslation(language, 'status.state_locked');

  if (isLockout) {
    stateColor = '#d1495b';
    stateLabel = `${getTranslation(language, 'status.state_lockout')} (${remainingLockout}s)`;
  } else if (isFault) {
    stateColor = '#d1495b';
    stateLabel = getTranslation(language, 'status.state_fault');
  } else if (isUnlocking) {
    stateColor = 'var(--sol-accent)';
    stateLabel = getTranslation(language, 'status.state_unlocking');
  } else if (isDoorOpen) {
    stateColor = '#0284c7';
    stateLabel = getTranslation(language, 'status.state_open');
  } else if (lockState === 'RELOCKING') {
    stateColor = 'var(--color-warn)';
    stateLabel = getTranslation(language, 'status.state_relocking');
  }

  return (
    <div className="w-full flex flex-col items-center">
      {/* State Badge in .sol-mono style */}
      <div className="flex items-center gap-2 mb-3 px-3.5 py-1.5 rounded-full border border-[var(--sol-line2)] bg-[var(--sol-card)] shadow-[var(--sol-shadow)]">
        {isLockout ? (
          <ShieldAlert className="w-4 h-4 text-[#d1495b] animate-pulse" />
        ) : isFault ? (
          <AlertTriangle className="w-4 h-4 text-[#d1495b]" />
        ) : isUnlocking ? (
          <Unlock className="w-4 h-4 text-[var(--sol-accent)]" />
        ) : (
          <Lock className="w-4 h-4 text-[var(--sol-accent)]" />
        )}
        <span
          className="text-xs font-semibold tracking-wide uppercase sol-mono"
          style={{ color: stateColor }}
        >
          {stateLabel}
        </span>
      </div>

      {/* Interactive Physical Mechanism Diagram */}
      <div className="w-full max-w-lg aspect-[16/9] relative rounded-2xl bg-[var(--sol-card)] border border-[var(--sol-line)] p-3 overflow-hidden shadow-[var(--sol-shadow)] flex items-center justify-center">
        {/* Subtle grid lines background */}
        <div className="absolute inset-0 bg-[radial-gradient(var(--sol-line2)_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

        <svg
          viewBox="0 0 520 280"
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="doorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--sol-panel)" />
              <stop offset="100%" stopColor="var(--sol-card)" />
            </linearGradient>

            <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="50%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#64748B" />
            </linearGradient>

            <linearGradient id="strikeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--sol-panel)" />
              <stop offset="100%" stopColor="var(--sol-paper)" />
            </linearGradient>

            <filter id="glowSolenoid" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Safe Frame & Door Plate */}
          <rect
            x="30"
            y="25"
            width="340"
            height="230"
            rx="12"
            fill="url(#doorGrad)"
            stroke={isLockout ? '#d1495b' : isFault ? '#d1495b' : 'var(--sol-line2)'}
            strokeWidth="1.5"
            strokeDasharray={isLockout ? '6,4' : 'none'}
            className="transition-colors duration-300"
          />

          <text
            x="45"
            y="52"
            fill="var(--sol-muted)"
            fontSize="9"
            fontFamily="var(--sol-mono)"
            fontWeight="bold"
            letterSpacing="1"
          >
            SAFE DOOR CHASSIS (STEEL)
          </text>

          {/* 2. Strike Plate (Safe Door Frame on Right) */}
          <g transform="translate(410, 25)">
            <rect
              x="0"
              y="0"
              width="80"
              height="230"
              rx="6"
              fill="url(#strikeGrad)"
              stroke="var(--sol-line2)"
              strokeWidth="1.5"
            />
            {/* Strike mortise pocket where bolt enters */}
            <rect
              x="0"
              y="85"
              width="45"
              height="60"
              rx="2"
              fill="var(--sol-paper)"
              stroke="var(--sol-line2)"
              strokeWidth="1"
            />
            <text
              x="12"
              y="50"
              fill="var(--sol-muted)"
              fontSize="8.5"
              fontFamily="var(--sol-mono)"
              transform="rotate(90, 12, 50)"
            >
              FRAME STRIKE
            </text>
          </g>

          {/* 3. Reed Switch (Door Contact Sensor: Top Right) */}
          <g transform="translate(320, 35)">
            <rect
              x="0"
              y="0"
              width="36"
              height="16"
              rx="3"
              fill={isDoorOpen ? 'var(--sol-muted)' : 'var(--sol-accent)'}
              stroke="var(--sol-line2)"
              strokeWidth="1"
            />
            <text x="6" y="11" fill="#FFFFFF" fontSize="8" fontFamily="var(--sol-mono)" fontWeight="bold">
              {isDoorOpen ? 'AJAR' : 'REED'}
            </text>

            {isDoorOpen ? (
              <line x1="45" y1="8" x2="65" y2="8" stroke="#d1495b" strokeWidth="2" strokeDasharray="2,2" />
            ) : (
              <line x1="40" y1="8" x2="60" y2="8" stroke="var(--sol-accent)" strokeWidth="2" />
            )}

            <rect
              x="65"
              y="0"
              width="25"
              height="16"
              rx="3"
              fill={isDoorOpen ? 'var(--sol-panel)' : 'var(--sol-button)'}
              stroke="var(--sol-line2)"
              strokeWidth="1"
            />
          </g>

          {/* 4. Solenoid Actuator Housing (Center) */}
          <g transform="translate(80, 85)">
            <rect
              x="0"
              y="0"
              width="150"
              height="70"
              rx="8"
              fill="var(--sol-panel)"
              stroke={solenoidActive ? 'var(--sol-accent)' : 'var(--sol-line2)'}
              strokeWidth="1.5"
            />
            <text x="12" y="22" fill="var(--sol-muted)" fontSize="8.5" fontFamily="var(--sol-mono)">
              12V FAIL-SECURE SOLENOID
            </text>

            {/* Solenoid Electromagnetic Coil Turns */}
            <g transform="translate(15, 30)">
              {[0, 14, 28, 42, 56, 70, 84, 98, 112].map((xOffset, i) => (
                <rect
                  key={i}
                  x={xOffset}
                  y="0"
                  width="8"
                  height="30"
                  rx="2"
                  fill={solenoidActive ? 'var(--sol-accent)' : 'var(--sol-muted)'}
                  filter={solenoidActive ? 'url(#glowSolenoid)' : 'none'}
                  className="transition-colors duration-200"
                />
              ))}
            </g>

            {/* Return Spring */}
            <path
              d="M 10 45 L 20 40 L 30 50 L 40 40 L 50 50 L 60 40 L 70 50 L 80 40 L 90 50 L 100 45"
              fill="none"
              stroke="var(--sol-muted)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>

          {/* 5. Mechanical Deadbolt */}
          <motion.g
            animate={{
              x: boltRetracted || isUnlocking || isDoorOpen ? -55 : 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 280,
              damping: 24,
            }}
          >
            <rect
              x="225"
              y="90"
              width="200"
              height="50"
              rx="4"
              fill="url(#boltGrad)"
              stroke="var(--sol-line2)"
              strokeWidth="1.5"
            />
            <line x1="230" y1="115" x2="420" y2="115" stroke="var(--sol-muted)" strokeWidth="1.5" strokeDasharray="6,4" />
            <polygon points="425,90 435,100 435,140 425,150" fill="#94A3B8" stroke="#64748B" strokeWidth="1" />
            <text x="250" y="120" fill="#141414" fontSize="10" fontFamily="var(--sol-mono)" fontWeight="bold">
              DEADBOLT
            </text>
          </motion.g>

          {/* 6. Solenoid & Reed status indicators */}
          <g transform="translate(45, 215)">
            <circle cx="6" cy="6" r="3.5" fill={solenoidActive ? 'var(--sol-accent)' : 'var(--sol-muted)'} />
            <text x="16" y="9" fill="var(--sol-soft)" fontSize="8.5" fontFamily="var(--sol-mono)">
              Solenoid: {solenoidActive ? 'ENERGIZED' : 'IDLE'}
            </text>

            <circle cx="160" cy="6" r="3.5" fill={isDoorOpen ? '#d1495b' : 'var(--sol-accent)'} />
            <text x="170" y="9" fill="var(--sol-soft)" fontSize="8.5" fontFamily="var(--sol-mono)">
              Reed Switch: {isDoorOpen ? 'OPEN (AJAR)' : 'CLOSED'}
            </text>

            <circle cx="310" cy="6" r="3.5" fill={boltRetracted ? '#0284c7' : 'var(--sol-accent)'} />
            <text x="320" y="9" fill="var(--sol-soft)" fontSize="8.5" fontFamily="var(--sol-mono)">
              Bolt: {boltRetracted ? 'RETRACTED' : 'ENGAGED'}
            </text>
          </g>
        </svg>

        {isLockout && (
          <div className="absolute inset-0 bg-red-950/20 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
            <ShieldAlert className="w-10 h-10 text-[#d1495b] animate-bounce mb-2" />
            <span className="text-base font-bold text-[#d1495b] uppercase tracking-wider font-sans">
              {getTranslation(language, 'status.lockout_active')}
            </span>
            <span className="text-xs text-[var(--sol-ink)] sol-mono mt-1">
              {maxFailuresBeforeLockout} consecutive failures reached. Lockout duration: {remainingLockout}s
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
