'use client';

import { useCostTrackerStore } from '@/lib/store/cost-tracker';
import { PROVIDER_PRICING } from '@/lib/store/cost-tracker';
import { AlertTriangle, TrendingUp, Zap, Clock, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CostMonitor() {
  const {
    today,
    history,
    dailyLimitUsd,
    alertThresholdPct,
    trackingEnabled,
    setDailyLimit,
    setAlertThreshold,
    setTrackingEnabled,
    clearHistory,
    isOverLimit,
    isNearLimit,
  } = useCostTrackerStore();

  const usedPct = dailyLimitUsd > 0 ? Math.min((today.totalUsd / dailyLimitUsd) * 100, 100) : 0;
  const barColor = isOverLimit()
    ? 'bg-destructive'
    : isNearLimit()
      ? 'bg-amber-400'
      : 'bg-emerald-400';

  return (
    <div className="space-y-6 p-1">
      {/* ── Status banner ── */}
      {isOverLimit() && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertTriangle className="size-4 shrink-0" />
          Daily limit reached — API calls paused until tomorrow.
        </div>
      )}
      {!isOverLimit() && isNearLimit() && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm">
          <AlertTriangle className="size-4 shrink-0" />
          {alertThresholdPct}% of daily limit used — approaching cap.
        </div>
      )}

      {/* ── Today's spend card ── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-1.5">
            <TrendingUp className="size-4 text-muted-foreground" />
            Today&apos;s spend
          </span>
          <span className="font-mono text-lg font-semibold">
            ${today.totalUsd.toFixed(4)}
            {dailyLimitUsd > 0 && (
              <span className="text-muted-foreground text-sm font-normal">
                {' '}
                / ${dailyLimitUsd.toFixed(2)}
              </span>
            )}
          </span>
        </div>

        {dailyLimitUsd > 0 && (
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', barColor)}
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{usedPct.toFixed(1)}% used</span>
              <span>${(dailyLimitUsd - today.totalUsd).toFixed(4)} remaining</span>
            </div>
          </div>
        )}

        {/* Breakdown by feature */}
        {today.entries.length > 0 && (
          <div className="pt-1 border-t border-border space-y-1">
            {(['llm', 'tts', 'asr', 'image', 'other'] as const).map((feature) => {
              const featureTotal = today.entries
                .filter((e) => e.feature === feature)
                .reduce((s, e) => s + e.estimatedUsd, 0);
              if (featureTotal === 0) return null;
              return (
                <div key={feature} className="flex justify-between text-xs">
                  <span className="text-muted-foreground capitalize">{feature}</span>
                  <span className="font-mono">${featureTotal.toFixed(4)}</span>
                </div>
              );
            })}
          </div>
        )}

        {today.entries.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No API calls recorded today
          </p>
        )}
      </div>

      {/* ── Settings ── */}
      <div className="space-y-4">
        {/* Enable tracking */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Track API costs</p>
            <p className="text-xs text-muted-foreground">Log estimated spend per API call</p>
          </div>
          <button
            onClick={() => setTrackingEnabled(!trackingEnabled)}
            className={cn(
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
              trackingEnabled ? 'bg-primary' : 'bg-muted',
            )}
          >
            <span
              className={cn(
                'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                trackingEnabled ? 'translate-x-4' : 'translate-x-1',
              )}
            />
          </button>
        </div>

        {/* Daily limit */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Zap className="size-3.5 text-muted-foreground" />
            Daily limit (USD)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">$</span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={dailyLimitUsd}
              onChange={(e) => setDailyLimit(parseFloat(e.target.value) || 0)}
              className="w-24 h-8 rounded-md border border-input bg-background px-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <span className="text-xs text-muted-foreground">Set to 0 for no limit</span>
          </div>
        </div>

        {/* Alert threshold */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Warn me at <span className="text-primary font-semibold">{alertThresholdPct}%</span> of
            limit
          </label>
          <input
            type="range"
            min="50"
            max="95"
            step="5"
            value={alertThresholdPct}
            onChange={(e) => setAlertThreshold(parseInt(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>50%</span>
            <span>95%</span>
          </div>
        </div>
      </div>

      {/* ── Pricing reference ── */}
      <details className="group">
        <summary className="cursor-pointer text-sm text-muted-foreground flex items-center gap-1.5 select-none hover:text-foreground transition-colors">
          <Clock className="size-3.5" />
          Pricing reference
        </summary>
        <div className="mt-3 rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                  Provider / Model
                </th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Rate</th>
              </tr>
            </thead>
            <tbody>
              {(Object.entries(PROVIDER_PRICING) as [string, Record<string, number>][]).map(
                ([key, price]) => (
                  <tr
                    key={key}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-3 py-1.5 font-mono text-foreground/80">{key}</td>
                    <td className="px-3 py-1.5 text-right text-muted-foreground">
                      {'input' in price
                        ? `$${price.input}/$${price.output} /1M tok`
                        : 'chars' in price
                          ? price.chars === 0
                            ? 'Free'
                            : `$${price.chars} /1M chars`
                          : 'minutes' in price
                            ? price.minutes === 0
                              ? 'Free'
                              : `$${price.minutes} /min`
                            : '—'}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </details>

      {/* ── History ── */}
      {history.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Last {history.length} days</p>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="size-3" /> Clear
            </button>
          </div>
          <div className="space-y-1">
            {history.slice(0, 10).map((day) => (
              <div
                key={day.date}
                className="flex items-center justify-between text-xs px-3 py-1.5 rounded-md bg-muted/30"
              >
                <span className="text-muted-foreground">{day.date}</span>
                <span className="font-mono">${day.totalUsd.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
