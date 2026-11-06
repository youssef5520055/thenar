import React, { useState } from 'react';
import { useThenarStore } from '../store/useThenarStore';
import { getTranslation } from '../i18n';
import type { AttemptRecord } from '../mock/types';
import { LiveChart } from '../components/LiveChart';
import { downloadFile } from '../mock/engine';
import {
  Search,
  RotateCcw,
  CheckCircle,
  XCircle,
  ChevronRight,
  X,
  FileSpreadsheet,
  FileJson,
} from 'lucide-react';

export const AttemptLog: React.FC = () => {
  const { language, attempts } = useThenarStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'ACCEPT' | 'REJECT' | 'TIMEOUT' | 'INVALID'>('ALL');
  const [sessionFilter, setSessionFilter] = useState<'ALL' | 'S1' | 'S2' | 'S3' | 'S4'>('ALL');
  const [selectedAttempt, setSelectedAttempt] = useState<AttemptRecord | null>(null);
  const [showReplayModal, setShowReplayModal] = useState<boolean>(false);

  // Filter attempts
  const filteredAttempts = attempts.filter((att) => {
    if (outcomeFilter !== 'ALL' && att.decision !== outcomeFilter) return false;
    if (sessionFilter !== 'ALL' && att.sessionTag !== sessionFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      if (!att.id.toLowerCase().includes(q) && !att.sessionTag.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Export Entire Log
  const handleExportCSV = () => {
    const headers = [
      'Timestamp',
      'Session_ID',
      'Session_Tag',
      'Role',
      'Gate1_Fingerprint',
      'Gate1_Template',
      'Gate2_Score_s_x',
      'Threshold_Tau',
      'Decision',
      'Failures_At_Time',
      'Rejection_Reason',
    ];
    const rows = attempts.map(a => [
      a.timestamp,
      a.id,
      a.sessionTag,
      a.role,
      a.gate1Result ? 'PASS' : 'FAIL',
      a.gate1TemplateId,
      a.score,
      a.tau,
      a.decision,
      a.failureCounterAtTime,
      `"${a.rejectionReason || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, `thenar_attempt_log_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  };

  const handleExportJSON = () => {
    const jsonContent = JSON.stringify(attempts, null, 2);
    downloadFile(jsonContent, `thenar_attempt_log_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  };

  // Export Single Attempt Raw Telemetry Frames
  const handleExportSingleAttemptFrames = (att: AttemptRecord, format: 'csv' | 'json') => {
    if (!att.frames || att.frames.length === 0) return;

    if (format === 'csv') {
      const headers = ['time_s', 'force_N', 'gyro_deg_s', 'accel_m_s2', 'phase'];
      const rows = att.frames.map(f => [f.t, f.force, f.gyro, f.accel, f.phase]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadFile(csv, `thenar_telemetry_${att.id}.csv`, 'text/csv');
    } else {
      const json = JSON.stringify({ attempt: att, frames: att.frames }, null, 2);
      downloadFile(json, `thenar_telemetry_${att.id}.json`, 'application/json');
    }
  };

  return (
    <div className="sol-wrap py-8 space-y-6">
      {/* Title & Export buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--sol-line)]">
        <div>
          <span className="sol-tag">BIOMETRIC AUDIT TRAIL</span>
          <h1 className="sol-h1 font-serif mt-2 !text-3xl">
            {getTranslation(language, 'log.title')}
          </h1>
          <p className="text-sm text-[var(--sol-soft)] mt-1">
            {getTranslation(language, 'log.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="sol-pill hover:opacity-90 flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--sol-accent)]" />
            <span>{getTranslation(language, 'log.btn_export_csv')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="sol-pill hover:opacity-90 flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <FileJson className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400" />
            <span>{getTranslation(language, 'log.btn_export_json')}</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="sol-card sol-card-pad flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sol-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={getTranslation(language, 'log.search_placeholder')}
            className="w-full bg-[var(--sol-panel)] border border-[var(--sol-line)] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[var(--sol-ink)] placeholder-[var(--sol-muted)] focus:outline-none focus:border-[var(--sol-accent)] sol-mono"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Outcome Filter */}
          <div className="flex items-center gap-1 bg-[var(--sol-panel)] p-1 rounded-xl border border-[var(--sol-line)] text-xs sol-mono">
            {(['ALL', 'ACCEPT', 'REJECT'] as const).map((out) => (
              <button
                key={out}
                type="button"
                onClick={() => setOutcomeFilter(out)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  outcomeFilter === out
                    ? 'bg-[var(--btn-tonal-bg)] text-[var(--btn-tonal-fg)] font-bold border border-[var(--btn-tonal-border)]'
                    : 'text-[var(--sol-soft)] hover:text-[var(--sol-ink)]'
                }`}
              >
                {out === 'ALL' ? getTranslation(language, 'log.filter_all') : out}
              </button>
            ))}
          </div>

          {/* Session Day Filter (S1-S4) */}
          <div className="flex items-center gap-1 bg-[var(--sol-panel)] p-1 rounded-xl border border-[var(--sol-line)] text-xs sol-mono">
            {(['ALL', 'S1', 'S2', 'S3', 'S4'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSessionFilter(s)}
                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                  sessionFilter === s
                    ? 'bg-[var(--btn-tonal-bg)] text-[var(--btn-tonal-fg)] font-bold border border-[var(--btn-tonal-border)]'
                    : 'text-[var(--sol-soft)] hover:text-[var(--sol-ink)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Attempts Table (Desktop) / Cards (Mobile) */}
      <div className="sol-card overflow-hidden">
        {/* Desktop View Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs sol-mono border-collapse">
            <thead>
              <tr className="border-b border-[var(--sol-line)] bg-[var(--sol-panel)] text-[var(--sol-muted)] uppercase text-[10.5px] tracking-wider">
                <th className="py-3 px-4">{getTranslation(language, 'log.col_time')}</th>
                <th className="py-3 px-3">{getTranslation(language, 'log.col_session')}</th>
                <th className="py-3 px-3">{getTranslation(language, 'log.col_role')}</th>
                <th className="py-3 px-3">{getTranslation(language, 'log.col_gate1')}</th>
                <th className="py-3 px-3">{getTranslation(language, 'log.col_score')}</th>
                <th className="py-3 px-3">{getTranslation(language, 'log.col_tau')}</th>
                <th className="py-3 px-3">{getTranslation(language, 'log.col_decision')}</th>
                <th className="py-3 px-3">{getTranslation(language, 'log.col_counter')}</th>
                <th className="py-3 px-4 text-right">{getTranslation(language, 'log.col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--sol-line)]">
              {filteredAttempts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-[var(--sol-muted)] sol-mono">
                    No attempts match active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAttempts.map((attempt: any, idx) => {
                  const isAccept = String(attempt.decision).toLowerCase() === 'accept';
                  const date = new Date(attempt.ts || attempt.timestamp || Date.now());
                  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <tr
                      key={`${attempt.id}-${idx}`}
                      onClick={() => setSelectedAttempt(attempt)}
                      className="hover:bg-[var(--sol-panel)]/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 text-[var(--sol-soft)] whitespace-nowrap">
                        <span className="font-semibold text-[var(--sol-ink)]">{timeStr}</span>{' '}
                        <span className="text-[10px] text-[var(--sol-muted)]">({dateStr})</span>
                      </td>

                      <td className="py-3.5 px-3 font-bold text-[var(--sol-accent)] whitespace-nowrap">
                        {attempt.id}
                      </td>

                      <td className="py-3.5 px-3 uppercase text-[10px] whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-[var(--sol-panel)] text-[var(--sol-soft)] border border-[var(--sol-line)]">
                          {attempt.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 ${attempt.gate1Result ? 'text-[var(--sol-accent)] font-semibold' : 'text-red-800 dark:text-red-400 font-semibold'}`}>
                          {attempt.gate1Result ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {attempt.gate1Result ? attempt.gate1TemplateId : 'FAIL'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-semibold whitespace-nowrap">
                        <span className={attempt.score != null && attempt.tau != null && attempt.score >= attempt.tau ? 'text-[var(--sol-accent)] font-bold' : 'text-red-800 dark:text-red-400 font-bold'}>
                          {attempt.score != null ? attempt.score.toFixed(2) : 'N/A'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-[var(--sol-muted)] whitespace-nowrap">
                        {attempt.tau != null ? attempt.tau.toFixed(2) : '-3.85'}
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isAccept
                            ? 'bg-[color-mix(in_srgb,var(--sol-accent)_15%,transparent)] text-[var(--sol-accent)] border border-[color-mix(in_srgb,var(--sol-accent)_30%,transparent)]'
                            : attempt.decision === 'TIMEOUT'
                            ? 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/15 text-red-800 dark:text-red-400 border border-red-500/30'
                        }`}>
                          {attempt.decision}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-[var(--sol-muted)] whitespace-nowrap">
                        {attempt.failureCounterAtTime}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAttempt(attempt);
                            setShowReplayModal(true);
                          }}
                          className="sol-pill !py-1 !px-2.5 !text-[11px] hover:bg-[var(--sol-accent)] hover:text-white transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{getTranslation(language, 'log.btn_replay')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards */}
        <div className="lg:hidden divide-y divide-[var(--sol-line)]">
          {filteredAttempts.map((attempt) => {
            const isAccept = attempt.decision === 'ACCEPT';
            const date = new Date(attempt.timestamp);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={attempt.id}
                onClick={() => setSelectedAttempt(attempt)}
                className="p-4 space-y-2 hover:bg-[var(--sol-panel)]/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="sol-mono font-bold text-[var(--sol-accent)] text-xs">{attempt.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold sol-mono ${
                    isAccept ? 'bg-[color-mix(in_srgb,var(--sol-accent)_15%,transparent)] text-[var(--sol-accent)]' : 'bg-red-500/15 text-red-800 dark:text-red-400 font-bold'
                  }`}>
                    {attempt.decision}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs sol-mono text-[var(--sol-soft)]">
                  <div>
                    <span className="text-[10px] text-[var(--sol-muted)] block">Gate 1 (FP)</span>
                    <span className={attempt.gate1Result ? 'text-[var(--sol-accent)]' : 'text-red-800 dark:text-red-400 font-bold'}>
                      {attempt.gate1Result ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--sol-muted)] block">Score s(x) vs &tau;</span>
                    <span>{attempt.score != null ? attempt.score.toFixed(2) : 'N/A'} / {attempt.tau != null ? attempt.tau.toFixed(2) : '-3.85'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--sol-muted)] sol-mono pt-1">
                  <span>{timeStr} · Session {attempt.sessionTag}</span>
                  <ChevronRight className="w-4 h-4 text-[var(--sol-muted)]" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Attempt Detail Drawer / Inspection Modal */}
      {selectedAttempt && !showReplayModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedAttempt(null)}
        >
          <div
            className="w-full max-w-2xl bg-[var(--sol-paper)] border border-[var(--sol-line2)] rounded-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--sol-line)]">
              <div>
                <h3 className="text-base font-bold text-[var(--sol-ink)] font-serif flex items-center gap-2">
                  <span>{selectedAttempt.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded sol-mono ${
                    selectedAttempt.decision === 'ACCEPT' ? 'bg-[color-mix(in_srgb,var(--sol-accent)_20%,transparent)] text-[var(--sol-accent)]' : 'bg-red-500/20 text-red-800 dark:text-red-400 font-bold'
                  }`}>
                    {selectedAttempt.decision}
                  </span>
                </h3>
                <p className="text-xs text-[var(--sol-muted)] sol-mono mt-0.5">
                  {new Date(selectedAttempt.timestamp).toLocaleString()} · Session {selectedAttempt.sessionTag}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReplayModal(true)}
                  className="sol-btn !py-1.5 !px-3 !text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[var(--sol-paper)]" />
                  <span>{getTranslation(language, 'log.btn_replay')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAttempt(null)}
                  className="sol-icon-btn text-[var(--sol-muted)] hover:text-[var(--sol-ink)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Extracted Parameter Metrics Grid */}
            <div className="space-y-3 sol-mono">
              <span className="sol-kicker">
                Extracted Biometric Features (16-D)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-[var(--sol-card)] border border-[var(--sol-line)]">
                  <span className="text-[10px] text-[var(--sol-muted)] block">Duration</span>
                  <span className="font-bold text-[var(--sol-ink)]">{selectedAttempt.features.t_total}s</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--sol-card)] border border-[var(--sol-line)]">
                  <span className="text-[10px] text-[var(--sol-muted)] block">Peak Force</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">{selectedAttempt.features.f_peak} N</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--sol-card)] border border-[var(--sol-line)]">
                  <span className="text-[10px] text-[var(--sol-muted)] block">Peak Gyro</span>
                  <span className="font-bold text-sky-700 dark:text-sky-400">{selectedAttempt.features.w_peak} °/s</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--sol-card)] border border-[var(--sol-line)]">
                  <span className="text-[10px] text-[var(--sol-muted)] block">RMS Accel</span>
                  <span className="font-bold text-purple-700 dark:text-purple-400">{selectedAttempt.features.a_rms} m/s²</span>
                </div>
              </div>
            </div>

            {/* Feature Deviation Bar Chart (Z-scores vs Owner Baseline) */}
            <div className="space-y-2 pt-2 border-t border-[var(--sol-line)] sol-mono">
              <div className="flex items-center justify-between">
                <span className="sol-kicker">
                  {getTranslation(language, 'log.deviation_chart_title')}
                </span>
                <span className="text-[11px] text-[var(--sol-muted)]">&plusmn;2&sigma; normal tolerance</span>
              </div>
              <p className="text-[11px] text-[var(--sol-muted)] leading-relaxed">
                {getTranslation(language, 'log.deviation_desc')}
              </p>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {selectedAttempt.deviations.map((dev) => {
                  const absZ = Math.abs(dev.zScore);
                  const isSevere = absZ > 2.0;

                  return (
                    <div key={dev.featureKey} className="flex items-center gap-2 text-xs">
                      <span className="w-40 truncate text-[var(--sol-soft)] text-[11px]">{dev.label}</span>
                      <div className="flex-1 bg-[var(--sol-card)] h-3.5 rounded relative flex items-center px-1 border border-[var(--sol-line)]">
                        {/* Center zero line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-[var(--sol-line2)]" />
                        {/* Bar */}
                        <div
                          className={`h-2 rounded transition-all ${isSevere ? 'bg-red-500' : 'bg-[var(--sol-accent)]'}`}
                          style={{
                            width: `${Math.min(50, (absZ / 4) * 50)}%`,
                            marginLeft: dev.zScore < 0 ? `calc(50% - ${Math.min(50, (absZ / 4) * 50)}%)` : '50%',
                          }}
                        />
                      </div>
                      <span className={`w-12 text-right text-[11px] font-bold ${isSevere ? 'text-red-800 dark:text-red-400 font-bold' : 'text-[var(--sol-ink)]'}`}>
                        {dev.zScore > 0 ? `+${dev.zScore}` : dev.zScore}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Single attempt export buttons */}
            <div className="flex justify-between items-center pt-3 border-t border-[var(--sol-line)] text-xs sol-mono">
              <span className="text-[var(--sol-muted)]">Export Raw Attempt Telemetry:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportSingleAttemptFrames(selectedAttempt, 'csv')}
                  className="sol-pill !py-1 !px-2.5 cursor-pointer"
                >
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExportSingleAttemptFrames(selectedAttempt, 'json')}
                  className="sol-pill !py-1 !px-2.5 cursor-pointer"
                >
                  JSON
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Replay Full Modal */}
      {showReplayModal && selectedAttempt && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
          onClick={() => setShowReplayModal(false)}
        >
          <div
            className="w-full max-w-4xl bg-[var(--sol-paper)] border border-[var(--sol-line2)] rounded-2xl p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--sol-line)]">
              <div className="flex items-center gap-3">
                <RotateCcw className="w-5 h-5 text-[var(--sol-accent)]" />
                <div>
                  <h3 className="text-base font-bold text-[var(--sol-ink)] font-serif">
                    Interactive Replay: {selectedAttempt.id}
                  </h3>
                  <p className="text-xs text-[var(--sol-muted)] sol-mono">
                    Playing 100 Hz synchronized load cell and IMU signals
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowReplayModal(false)}
                className="sol-icon-btn text-[var(--sol-muted)] hover:text-[var(--sol-ink)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Replay LiveChart */}
            <LiveChart
              frames={selectedAttempt.frames || []}
              isReplay={true}
              height={360}
              highlightPhases={true}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default AttemptLog;
