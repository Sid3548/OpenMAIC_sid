/**
 * Web Search API
 *
 * POST /api/web-search
 * Simple JSON request/response using Tavily search.
 */

import { NextRequest } from 'next/server';
import { searchWithTavily, formatSearchResultsAsContext } from '@/lib/web-search/tavily';
import { resolveWebSearchApiKey } from '@/lib/server/provider-config';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { auth } from '@/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rate-limit';

const log = createLogger('WebSearch');

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('UNAUTHORIZED', 401, 'Sign in to use this feature');
    }
    const rl = await checkRateLimit('web-search', session.user.id, 10, 60);
    if (!rl.allowed) return rateLimitResponse(rl);

    const body = await req.json();
    const { query, apiKey: clientApiKey } = body as {
      query?: string;
      apiKey?: string;
    };

    if (!query || !query.trim()) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'query is required');
    }

    const apiKey = resolveWebSearchApiKey(clientApiKey);
    if (!apiKey) {
      return apiError(
        'MISSING_API_KEY',
        400,
        'Tavily API key is not configured. Set it in Settings → Web Search or set TAVILY_API_KEY env var.',
      );
    }

    const result = await searchWithTavily({ query: query.trim(), apiKey });
    const context = formatSearchResultsAsContext(result);

    return apiSuccess({
      answer: result.answer,
      sources: result.sources,
      context,
      query: result.query,
      responseTime: result.responseTime,
    });
  } catch (err) {
    log.error('[WebSearch] Error:', err);
    const message = err instanceof Error ? err.message : 'Web search failed';
    return apiError('INTERNAL_ERROR', 500, message);
  }
}
