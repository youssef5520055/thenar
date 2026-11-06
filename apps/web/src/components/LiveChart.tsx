import React, { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import type { TelemetryFrame } from '../mock/types';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { getTranslation } from '../i18n';
import type { Language } from '../i18n';
import { useThenarStore } from '../store/useThenarStore';

interface LiveChartProps {
  frames: TelemetryFrame[];
  overlayFrames?: TelemetryFrame[]; // e.g. for Attack simulator (dashed line)
  overlayLabel?: string;
  isLive?: boolean;
  isReplay?: boolean;
  onScrub?: (frameIndex: number) => void;
  height?: number;
  highlightPhases?: boolean;
}

export const LiveChart: React.FC<LiveChartProps> = ({
  frames,
  overlayFrames,
  overlayLabel = 'Attacker Vector',
  isLive = false,
  isReplay = false,
  onScrub,
  height = 360,
  highlightPhases = true,
}) => {
  const { language, playbackSpeed, setPlaybackSpeed } = useThenarStore();
  const [isPlaying, setIsPlaying] = useState(!isReplay);
  const [currentIndex, setCurrentIndex] = useState<number>(frames.length > 0 ? frames.length - 1 : 0);

  // Sync currentIndex when frames change
  useEffect(() => {
    if (isLive) {
      setCurrentIndex(Math.max(0, frames.length - 1));
    } else if (frames.length > 0 && currentIndex >= frames.length) {
      setCurrentIndex(frames.length - 1);
    }
  }, [frames, isLive]);

  // Replay animation playback loop
  useEffect(() => {
    if (isReplay && isPlaying && frames.length > 0) {
      const intervalMs = Math.max(12, Math.round(18 / playbackSpeed));
      const timer = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= frames.length - 1) {
            setIsPlaying(false);
            return frames.length - 1;
          }
          const next = prev + 1;
          if (onScrub) onScrub(next);
          return next;
        });
      }, intervalMs);

      return () => clearInterval(timer);
    }
  }, [isReplay, isPlaying, frames, playbackSpeed, onScrub]);

  // Data sliced up to currentIndex for replay, or all if static/inspecting
  const displayedFrames = isReplay ? frames.slice(0, Math.max(1, currentIndex + 1)) : frames;

  // Format merged data for chart
  const chartData = displayedFrames.map((f, idx) => {
    const overlay = overlayFrames && overlayFrames[idx] ? overlayFrames[idx] : null;
    return {
      t: f.t,
      force: f.force,
      gyro: f.gyro,
      accel: f.accel,
      phase: f.phase,
      overlayForce: overlay ? overlay.force : undefined,
      overlayGyro: overlay ? overlay.gyro : undefined,
      overlayAccel: overlay ? overlay.accel : undefined,
    };
  });

  const p1EndFrame = frames.find((f) => f.phase === 'P2') || frames[Math.floor(frames.length * 0.35)];
  const p2EndFrame = frames.find((f, i) => i > 10 && f.phase === 'P3') || frames[Math.floor(frames.length * 0.75)];
  const t_p1_end = p1EndFrame ? p1EndFrame.t : 0.65;
  const t_p2_end = p2EndFrame ? p2EndFrame.t : 1.55;
  const t_max = frames.length > 0 ? frames[frames.length - 1].t : 2.5;

  return (
    <div className="w-full bg-[var(--sol-card)] border border-[var(--sol-line)] rounded-2xl p-3 sm:p-5 shadow-[var(--sol-shadow)]">
      {/* Replay / Playback bar if in replay mode */}
      {isReplay && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-[var(--sol-line)]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (currentIndex >= frames.length - 1) {
                  setCurrentIndex(0);
                }
                setIsPlaying(!isPlaying);
              }}
              className="sol-btn !h-8 !px-3 text-xs"
              aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentIndex(0);
                setIsPlaying(false);
                if (onScrub) onScrub(0);
              }}
              className="sol-icon-btn !w-8 !h-8 text-[var(--sol-soft)] hover:text-[var(--sol-ink)]"
              title="Reset to t=0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scrub timeline */}
          <div className="flex-1 min-w-[140px] flex items-center gap-2">
            <span className="text-[11px] sol-mono text-[var(--sol-muted)]">
              {displayedFrames[currentIndex]?.t.toFixed(2) || '0.00'}s
            </span>
            <input
              type="range"
              min="0"
              max={Math.max(0, frames.length - 1)}
              value={currentIndex}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setCurrentIndex(idx);
                setIsPlaying(false);
                if (onScrub) onScrub(idx);
              }}
              className="w-full h-1.5 bg-[var(--sol-panel)] rounded-lg appearance-none cursor-pointer accent-[var(--sol-accent)]"
            />
            <span className="text-[11px] sol-mono text-[var(--sol-muted)]">
              {t_max.toFixed(2)}s
            </span>
          </div>

          {/* Speed controls */}
          <div className="flex items-center gap-1 bg-[var(--sol-panel)] p-1 rounded-lg border border-[var(--sol-line)]">
            {[0.5, 1.0, 2.0].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 text-[11px] sol-mono rounded transition-colors ${
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
      )}

      {/* Legend & Phase indicators */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[var(--sol-accent)] rounded" />
            <span className="font-medium text-[var(--sol-accent)]">
              {getTranslation(language, 'live.chart_force')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#0284c7] rounded" />
            <span className="font-medium text-[#0369a1] dark:text-[#38bdf8]">
              {getTranslation(language, 'live.chart_gyro')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#8b5cf6] rounded" />
            <span className="font-medium text-[#6d28d9] dark:text-[#c084fc]">
              {getTranslation(language, 'live.chart_accel')}
            </span>
          </div>

          {overlayFrames && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-[#d1495b]" />
              <span className="font-medium text-red-800 dark:text-red-400">{overlayLabel}</span>
            </div>
          )}
        </div>

        {/* Phase Pill Badges */}
        {highlightPhases && (
          <div className="flex items-center gap-1.5 text-[10px] sol-mono">
            <span className="px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--sol-accent)_14%,transparent)] text-[#094e48] dark:text-[var(--sol-accent)] font-semibold border border-[color-mix(in_srgb,var(--sol-accent)_24%,transparent)]">
              P1 Build
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,#0284c7_14%,transparent)] text-[#0369a1] dark:text-[#38bdf8] font-semibold border border-[color-mix(in_srgb,#0284c7_24%,transparent)]">
              P2 Rotation
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,#8b5cf6_14%,transparent)] text-[#6d28d9] dark:text-[#c084fc] font-semibold border border-[color-mix(in_srgb,#8b5cf6_24%,transparent)]">
              P3 Release
            </span>
          </div>
        )}
      </div>

      {/* Synchronized Multi-Channel Chart (Fixed LTR Axes per instructions) */}
      <div dir="ltr" className="w-full" style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="var(--sol-line)" strokeDasharray="3 3" vertical={false} />

            {/* Shaded Phase Bands */}
            {highlightPhases && frames.length > 5 && (
              <>
                <ReferenceArea
                  x1={0}
                  x2={t_p1_end}
                  fill="var(--sol-accent)"
                  fillOpacity={0.06}
                  label={{ value: 'P1: Grip', position: 'insideTopLeft', fill: 'var(--sol-accent)', fontSize: 10, fontFamily: 'var(--sol-mono)' }}
                />
                <ReferenceArea
                  x1={t_p1_end}
                  x2={t_p2_end}
                  fill="#0284c7"
                  fillOpacity={0.06}
                  label={{ value: 'P2: Rotation', position: 'insideTopLeft', fill: '#0284c7', fontSize: 10, fontFamily: 'var(--sol-mono)' }}
                />
                <ReferenceArea
                  x1={t_p2_end}
                  x2={t_max}
                  fill="#8b5cf6"
                  fillOpacity={0.06}
                  label={{ value: 'P3: Return', position: 'insideTopLeft', fill: '#8b5cf6', fontSize: 10, fontFamily: 'var(--sol-mono)' }}
                />

                <ReferenceLine
                  x={0.10}
                  stroke="var(--sol-accent)"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
                <ReferenceLine
                  x={t_p1_end}
                  stroke="#0284c7"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
              </>
            )}

            <XAxis
              dataKey="t"
              domain={[0, t_max]}
              type="number"
              unit="s"
              stroke="var(--sol-muted)"
              fontSize={10.5}
              fontFamily="var(--sol-mono)"
              tickLine={false}
              axisLine={{ stroke: 'var(--sol-line)' }}
            />

            {/* Left Y Axis for Force & Accel */}
            <YAxis
              domain={[0, 90]}
              stroke="var(--sol-muted)"
              fontSize={10.5}
              fontFamily="var(--sol-mono)"
              tickLine={false}
              axisLine={{ stroke: 'var(--sol-line)' }}
              tickFormatter={(v) => `${v}`}
            />

            {/* Right Y Axis for Gyro Magnitude (deg/s) */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 140]}
              stroke="var(--sol-muted)"
              fontSize={10.5}
              fontFamily="var(--sol-mono)"
              tickLine={false}
              axisLine={{ stroke: 'var(--sol-line)' }}
              tickFormatter={(v) => `${v}°`}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--sol-card)',
                borderColor: 'var(--sol-line2)',
                borderRadius: '10px',
                fontSize: '11px',
                fontFamily: 'var(--sol-mono)',
                color: 'var(--sol-ink)',
                boxShadow: 'var(--sol-shadow)',
              }}
              formatter={(value: any, name: string) => {
                const num = Number(value).toFixed(2);
                if (name === 'force' || name === 'overlayForce') return [`${num} N`, 'Force'];
                if (name === 'gyro' || name === 'overlayGyro') return [`${num} °/s`, 'Gyro'];
                if (name === 'accel' || name === 'overlayAccel') return [`${num} m/s²`, 'Accel'];
                return [num, name];
              }}
              labelFormatter={(label) => `t = ${Number(label).toFixed(2)}s`}
            />

            {/* Signals */}
            <Line
              type="monotone"
              dataKey="force"
              stroke="var(--sol-accent)"
              strokeWidth={2.2}
              dot={false}
              isAnimationActive={false}
            />

            <Line
              yAxisId="right"
              type="monotone"
              dataKey="gyro"
              stroke="#0284c7"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />

            <Line
              type="monotone"
              dataKey="accel"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />

            {overlayFrames && (
              <>
                <Line
                  type="monotone"
                  dataKey="overlayForce"
                  stroke="#d1495b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="overlayGyro"
                  stroke="#f43f5e"
                  strokeWidth={1.8}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
