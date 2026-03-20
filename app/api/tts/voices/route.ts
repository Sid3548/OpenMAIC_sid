/**
 * TTS Voices API
 *
 * Fetches available voices from a TTS provider dynamically.
 *
 * Strategy (for OpenAI-compatible providers):
 * 1. Try GET {baseUrl}/audio/voices — some OpenAI-compatible proxies expose this
 * 2. Fall back to GET {baseUrl}/models, filter for TTS models, map to known voices
 *
 * POST /api/tts/voices
 */

import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { validateUrlForSSRF } from '@/lib/server/ssrf-guard';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { resolveTTSApiKey, resolveTTSBaseUrl } from '@/lib/server/provider-config';
import { TTS_PROVIDERS } from '@/lib/audio/constants';

const log = createLogger('TTS Voices');

export const maxDuration = 15;

/**
 * Voices available per known OpenAI TTS model.
 * Used when the provider doesn't expose a /audio/voices endpoint.
 */
const OPENAI_TTS_MODEL_VOICES: Record<string, { id: string; name: string }[]> = {
  'tts-1': [
    { id: 'alloy', name: 'Alloy' },
    { id: 'echo', name: 'Echo' },
    { id: 'fable', name: 'Fable' },
    { id: 'nova', name: 'Nova' },
    { id: 'onyx', name: 'Onyx' },
    { id: 'shimmer', name: 'Shimmer' },
  ],
  'tts-1-hd': [
    { id: 'alloy', name: 'Alloy' },
    { id: 'echo', name: 'Echo' },
    { id: 'fable', name: 'Fable' },
    { id: 'nova', name: 'Nova' },
    { id: 'onyx', name: 'Onyx' },
    { id: 'shimmer', name: 'Shimmer' },
  ],
  'gpt-4o-mini-tts': [
    { id: 'alloy', name: 'Alloy' },
    { id: 'ash', name: 'Ash' },
    { id: 'ballad', name: 'Ballad' },
    { id: 'cedar', name: 'Cedar' },
    { id: 'coral', name: 'Coral' },
    { id: 'echo', name: 'Echo' },
    { id: 'fable', name: 'Fable' },
    { id: 'marin', name: 'Marin' },
    { id: 'nova', name: 'Nova' },
    { id: 'onyx', name: 'Onyx' },
    { id: 'sage', name: 'Sage' },
    { id: 'shimmer', name: 'Shimmer' },
    { id: 'verse', name: 'Verse' },
  ],
};

export async function POST(req: NextRequest) {
  try {
    const { providerId, apiKey: clientApiKey, baseUrl: clientBaseUrl } = await req.json();

    if (!providerId) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'providerId is required');
    }

    if (clientBaseUrl && process.env.NODE_ENV === 'production') {
      const ssrfError = validateUrlForSSRF(clientBaseUrl);
      if (ssrfError) {
        return apiError('INVALID_URL', 403, ssrfError);
      }
    }

    const providerDef = TTS_PROVIDERS[providerId as keyof typeof TTS_PROVIDERS];
    const apiKey = clientBaseUrl
      ? clientApiKey || ''
      : resolveTTSApiKey(providerId, clientApiKey || undefined);
    const baseUrl =
      clientBaseUrl ||
      resolveTTSBaseUrl(providerId, undefined) ||
      providerDef?.defaultBaseUrl ||
      '';

    if (!apiKey) {
      return apiError('MISSING_API_KEY', 400, 'API key is required to fetch voices');
    }

    if (!baseUrl) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Base URL could not be determined');
    }

    const authHeader = { Authorization: `Bearer ${apiKey}` };

    // Step 1: Try /audio/voices — supported by some OpenAI-compatible proxies
    try {
      const voicesRes = await fetch(`${baseUrl}/audio/voices`, {
        headers: authHeader,
        redirect: 'manual',
      });
      if (voicesRes.ok) {
        const data = await voicesRes.json();
        const rawVoices: unknown[] = Array.isArray(data) ? data : (data.voices ?? []);
        const voices = rawVoices
          .filter(
            (v): v is { id: string; name?: string } =>
              typeof v === 'object' && v !== null && typeof (v as { id?: unknown }).id === 'string',
          )
          .map((v) => ({ id: v.id, name: v.name || v.id }));
        if (voices.length > 0) {
          log.info(`Fetched ${voices.length} voices from /audio/voices for ${providerId}`);
          return apiSuccess({ voices, source: 'audio/voices' });
        }
      }
    } catch {
      // Not supported — fall through to /models
    }

    // Step 2: GET /models, filter for TTS-capable models, merge their known voices
    const modelsRes = await fetch(`${baseUrl}/models`, {
      headers: authHeader,
      redirect: 'manual',
    });

    if (modelsRes.status >= 300 && modelsRes.status < 400) {
      return apiError('REDIRECT_NOT_ALLOWED', 403, 'Redirects are not allowed');
    }

    if (!modelsRes.ok) {
      const errorText = await modelsRes.text().catch(() => modelsRes.statusText);
      return apiError(
        'UPSTREAM_ERROR',
        modelsRes.status,
        'Failed to fetch models from provider',
        errorText,
      );
    }

    const modelsData = await modelsRes.json();
    const allModels: { id: string }[] = modelsData.data ?? modelsData.models ?? [];
    const ttsModels = allModels.filter((m) => /tts/i.test(m.id));

    // Collect voices from all accessible TTS models, deduplicated by voice id
    const voiceMap = new Map<string, { id: string; name: string }>();
    for (const model of ttsModels) {
      const known = OPENAI_TTS_MODEL_VOICES[model.id];
      if (known) {
        for (const v of known) {
          if (!voiceMap.has(v.id)) voiceMap.set(v.id, v);
        }
      }
    }

    if (voiceMap.size === 0) {
      return apiError(
        'INVALID_RESPONSE',
        404,
        ttsModels.length > 0
          ? `TTS models found (${ttsModels.map((m) => m.id).join(', ')}) but no known voices — voices may be custom`
          : 'No TTS models found in your project. Enable TTS model access in your provider settings.',
      );
    }

    log.info(
      `Fetched voices from /models for ${providerId}: ${ttsModels.map((m) => m.id).join(', ')}`,
    );
    return apiSuccess({
      voices: Array.from(voiceMap.values()),
      models: ttsModels.map((m) => m.id),
      source: 'models',
    });
  } catch (error) {
    log.error('TTS voices error:', error);
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to fetch voices',
      error instanceof Error ? error.message : String(error),
    );
  }
}
