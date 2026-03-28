import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { buildPlacementDebriefPrompt } from '@/lib/quiz/prompts';
import { callQuizLLM } from '@/lib/quiz/llm';
import { parseFirstJsonObject } from '@/lib/server/json-parser';
import { auth } from '@/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('UNAUTHORIZED', 401, 'Sign in to use this feature');
    }
    const rl = await checkRateLimit('quiz-debrief', session.user.id, 10, 60);
    if (!rl.allowed) return rateLimitResponse(rl);

    const body = (await req.json()) as { summary: string };
    const result = await callQuizLLM(
      req,
      'You are a supportive coach. Return strict JSON only.',
      buildPlacementDebriefPrompt(body.summary),
      'quiz-debrief',
    );
    return apiSuccess(parseFirstJsonObject<Record<string, unknown>>(result.text));
  } catch (error) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : 'Failed to generate debrief',
    );
  }
}
