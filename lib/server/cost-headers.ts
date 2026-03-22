/**
 * Server-side cost estimation helpers.
 * Routes call these to attach X-Cost-Estimate headers so the client
 * cost tracker can record spend without needing a database.
 */

import { PROVIDER_PRICING, type ProviderPricingKey } from '@/lib/store/cost-tracker';

/** Rough token count from text (1 token ≈ 4 chars) */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Estimate LLM cost and return as header value string */
export function llmCostHeader(
  modelKey: string,
  inputText: string,
  outputText: string,
): string {
  const pricing = PROVIDER_PRICING[modelKey as ProviderPricingKey];
  if (!pricing || !('input' in pricing)) return '0';
  const inputTokens = estimateTokens(inputText);
  const outputTokens = estimateTokens(outputText);
  const cost =
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output;
  return cost.toFixed(6);
}

/** Estimate TTS cost and return as header value string */
export function ttsCostHeader(providerKey: string, chars: number): string {
  const key = `tts:${providerKey}` as ProviderPricingKey;
  const pricing = PROVIDER_PRICING[key];
  if (!pricing || !('chars' in pricing)) return '0';
  const cost = (chars / 1_000_000) * pricing.chars;
  return cost.toFixed(6);
}

/** Estimate ASR cost and return as header value string */
export function asrCostHeader(providerKey: string, durationSeconds: number): string {
  const key = `asr:${providerKey}` as ProviderPricingKey;
  const pricing = PROVIDER_PRICING[key];
  if (!pricing || !('minutes' in pricing)) return '0';
  const cost = (durationSeconds / 60) * pricing.minutes;
  return cost.toFixed(6);
}
