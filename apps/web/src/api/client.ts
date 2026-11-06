/**
 * @file src/api/client.ts
 * @description Typed HTTP client for the Thenar Gateway API v1.
 *
 * WHY THIS EXISTS:
 * Replaces direct in-browser mock calls with typed REST API queries to the Gateway,
 * while handling JSON parsing, error throwing, and query parameter serialization.
 */

import type {
  SystemStatus,
  Attempt,
  Settings,
  ProfileMeta,
  ModelExport,
  Notification
} from '@thenar/contracts';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errBody = await response.json();
      if (errBody.message || errBody.error) {
        errorMsg = errBody.message || errBody.error;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const apiClient = {
  // Status
  async getStatus(): Promise<SystemStatus> {
    return fetchJson<SystemStatus>('/status');
  },

  // Attempts
  async getAttempts(params: {
    outcome?: string;
    from?: number;
    to?: number;
    limit?: number;
    cursor?: string;
  } = {}): Promise<{ items: Attempt[]; nextCursor: string | null; totalCount: number }> {
    const query = new URLSearchParams();
    if (params.outcome && params.outcome !== 'all') query.set('outcome', params.outcome);
    if (params.from) query.set('from', String(params.from));
    if (params.to) query.set('to', String(params.to));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.cursor) query.set('cursor', params.cursor);

    const qs = query.toString();
    return fetchJson(`/attempts${qs ? `?${qs}` : ''}`);
  },

  async getAttempt(id: string): Promise<Attempt> {
    return fetchJson<Attempt>(`/attempts/${encodeURIComponent(id)}`);
  },

  async getAttemptFrames(id: string): Promise<{ attemptId: string; count: number; frames: any[] }> {
    return fetchJson(`/attempts/${encodeURIComponent(id)}/frames`);
  },

  // Settings
  async getSettings(): Promise<Settings> {
    return fetchJson<Settings>('/settings');
  },

  async updateSettings(settings: Settings): Promise<{ success: boolean; settings: Settings }> {
    return fetchJson('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  },

  // Profile & Enrollment
  async getProfile(): Promise<ProfileMeta> {
    return fetchJson<ProfileMeta>('/profile');
  },

  async enrollProfile(
    trials: { features: Record<string, number> }[],
    percentile = 5,
    model = 'mahalanobis_shrinkage'
  ): Promise<ModelExport> {
    return fetchJson<ModelExport>('/profile/enroll', {
      method: 'POST',
      body: JSON.stringify({ trials, percentile, model })
    });
  },

  async resetProfile(): Promise<{ success: boolean }> {
    return fetchJson('/profile/reset', {
      method: 'POST',
      body: JSON.stringify({ confirm: 'RESET_PROFILE' })
    });
  },

  // Notifications
  async getNotifications(): Promise<{ items: Notification[] }> {
    return fetchJson<{ items: Notification[] }>('/notifications');
  },

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    return fetchJson(`/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST'
    });
  },

  // Demo & Simulation
  async simulateScenario(scenario: string): Promise<{ success: boolean; attempt: Attempt }> {
    return fetchJson('/demo/simulate', {
      method: 'POST',
      body: JSON.stringify({ scenario })
    });
  },

  async resetDemo(): Promise<{ success: boolean }> {
    return fetchJson('/demo/reset', {
      method: 'POST'
    });
  },

  // Analytics
  async getAnalyticsSummary(): Promise<any> {
    return fetchJson('/analytics/summary');
  },

  // Export URLs
  getExportAttemptsUrl(format: 'csv' | 'json' = 'csv'): string {
    return `${API_BASE}/export/attempts?format=${format}`;
  },

  getExportFramesUrl(attemptId: string, format: 'csv' | 'json' = 'csv'): string {
    return `${API_BASE}/export/attempts/${encodeURIComponent(attemptId)}/frames?format=${format}`;
  }
};
