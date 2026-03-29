/**
 * Cost Tracker Store
 * Tracks estimated daily API spend across all providers.
 * Resets at midnight (local time). Persisted in localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Pricing table (USD per unit) ────────────────────────────────────────────
// Sources: provider docs as of 2026. Update as pricing changes.
export const PROVIDER_PRICING = {
  // LLM — per 1M tokens
  'google:gemini-2.5-pro': { input: 1.25, output: 10.0 }, // text-only tasks only
  'google:gemini-2.5-flash': { input: 0.15, output: 0.6 }, // Fast + cheap
  'google:gemini-2.5-flash-lite': { input: 0.075, output: 0.3 }, // Ultra-cheap
  'google:gemini-2.0-flash': { input: 0.075, output: 0.3 },
  'google:gemini-2.5-flash-preview': { input: 0.15, output: 0.6 },
  'google:gemini-1.5-pro': { input: 1.25, output: 5.0 },
  'openai:gpt-4o': { input: 2.5, output: 10.0 }, // Default — recommended
  'openai:gpt-4o-mini': { input: 0.15, output: 0.6 },
  'anthropic:claude-sonnet-4-6': { input: 3.0, output: 15.0 }, // Claude latest
  'anthropic:claude-sonnet-4-5': { input: 3.0, output: 15.0 },
  'anthropic:claude-haiku-4-5': { input: 0.8, output: 4.0 },
  'anthropic:claude-3-5-haiku': { input: 0.8, output: 4.0 },
  'anthropic:claude-3-5-sonnet': { input: 3.0, output: 15.0 },
  'deepseek:deepseek-chat': { input: 0.014, output: 0.28 },

  // TTS — per 1M characters
  'tts:openai-tts': { chars: 15.0 },
  'tts:google-tts': { chars: 4.0 }, // WaveNet; standard is $4, neural $16
  'tts:azure-tts': { chars: 16.0 },
  'tts:browser-native-tts': { chars: 0 }, // free

  // ASR — per minute
  'asr:openai-whisper': { minutes: 0.006 },
  'asr:browser-native': { minutes: 0 },
} as const;

export type ProviderPricingKey = keyof typeof PROVIDER_PRICING;

// ── Types ────────────────────────────────────────────────────────────────────

export interface CostEntry {
  provider: string;
  feature: 'llm' | 'tts' | 'asr' | 'image' | 'other';
  estimatedUsd: number;
  timestamp: number;
  detail?: string; // e.g. "1200 input tokens, 400 output tokens"
}

export interface DailyUsage {
  date: string; // YYYY-MM-DD
  totalUsd: number;
  entries: CostEntry[];
}

export interface CostTrackerState {
  // Settings
  dailyLimitUsd: number; // 0 = no limit
  alertThresholdPct: number; // warn when this % of limit is reached (default 80)
  trackingEnabled: boolean;

  // Today's usage
  today: DailyUsage;

  // History (last 30 days)
  history: DailyUsage[];

  // Actions
  setDailyLimit: (usd: number) => void;
  setAlertThreshold: (pct: number) => void;
  setTrackingEnabled: (enabled: boolean) => void;
  recordCost: (entry: Omit<CostEntry, 'timestamp'>) => void;
  resetToday: () => void;
  clearHistory: () => void;

  // Derived helpers (not stored)
  isOverLimit: () => boolean;
  isNearLimit: () => boolean;
  todayFormatted: () => string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function freshDay(): DailyUsage {
  return { date: todayStr(), totalUsd: 0, entries: [] };
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useCostTrackerStore = create<CostTrackerState>()(
  persist(
    (set, get) => ({
      dailyLimitUsd: 5.0, // $5/day default
      alertThresholdPct: 80,
      trackingEnabled: true,

      today: freshDay(),
      history: [],

      setDailyLimit: (usd) => set({ dailyLimitUsd: usd }),
      setAlertThreshold: (pct) => set({ alertThresholdPct: pct }),
      setTrackingEnabled: (enabled) => set({ trackingEnabled: enabled }),

      recordCost: (entry) => {
        const state = get();
        if (!state.trackingEnabled) return;

        const now = todayStr();
        let today = state.today;
        let history = state.history;

        // Roll over if it's a new day
        if (today.date !== now) {
          history = [today, ...history].slice(0, 30);
          today = freshDay();
        }

        const full: CostEntry = { ...entry, timestamp: Date.now() };
        const updated: DailyUsage = {
          ...today,
          totalUsd: today.totalUsd + entry.estimatedUsd,
          entries: [...today.entries, full],
        };

        set({ today: updated, history });
      },

      resetToday: () => set({ today: freshDay() }),

      clearHistory: () => set({ history: [], today: freshDay() }),

      isOverLimit: () => {
        const { dailyLimitUsd, today } = get();
        return dailyLimitUsd > 0 && today.totalUsd >= dailyLimitUsd;
      },

      isNearLimit: () => {
        const { dailyLimitUsd, today, alertThresholdPct } = get();
        if (dailyLimitUsd <= 0) return false;
        return today.totalUsd >= dailyLimitUsd * (alertThresholdPct / 100);
      },

      todayFormatted: () => {
        return `$${get().today.totalUsd.toFixed(4)}`;
      },
    }),
    {
      name: 'openmaic-cost-tracker',
      // Only persist settings + history, rehydrate today with date check
      partialize: (s) => ({
        dailyLimitUsd: s.dailyLimitUsd,
        alertThresholdPct: s.alertThresholdPct,
        trackingEnabled: s.trackingEnabled,
        today: s.today,
        history: s.history,
      }),
    },
  ),
);

// ── Estimation helpers ───────────────────────────────────────────────────────

/** Estimate cost for an LLM call given token counts */
export function estimateLLMCost(
  modelKey: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = PROVIDER_PRICING[modelKey as ProviderPricingKey];
  if (!pricing || !('input' in pricing)) return 0;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

/** Estimate cost for a TTS call given character count */
export function estimateTTSCost(providerKey: string, chars: number): number {
  const key = `tts:${providerKey}` as ProviderPricingKey;
  const pricing = PROVIDER_PRICING[key];
  if (!pricing || !('chars' in pricing)) return 0;
  return (chars / 1_000_000) * pricing.chars;
}

/** Estimate cost for ASR given duration in seconds */
export function estimateASRCost(providerKey: string, durationSeconds: number): number {
  const key = `asr:${providerKey}` as ProviderPricingKey;
  const pricing = PROVIDER_PRICING[key];
  if (!pricing || !('minutes' in pricing)) return 0;
  return (durationSeconds / 60) * pricing.minutes;
}
