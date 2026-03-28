import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { buildCodeReviewPrompt } from '@/lib/quiz/prompts';
import { callQuizLLM } from '@/lib/quiz/llm';
import { auth } from '@/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('UNAUTHORIZED', 401, 'Sign in to use this feature');
    }
    const rl = await checkRateLimit('quiz-review-code', session.user.id, 10, 60);
    if (!rl.allowed) return rateLimitResponse(rl);

    const body = (await req.json()) as {
      title: string;
      prompt: string;
      code: string;
      language: 'python' | 'java' | 'cpp' | 'javascript';
    };
    const result = await callQuizLLM(
      req,
      'You are a senior interviewer reviewing coding solutions. Return strict JSON only.',
      buildCodeReviewPrompt(body),
      'quiz-review-code',
    );
    const jsonMatch = result.text.trim().match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return apiError('INVALID_RESPONSE', 502, 'Reviewer returned no JSON');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed.score !== 'number' || !parsed.verdict) {
      return apiError('INVALID_RESPONSE', 502, 'Reviewer response missing required fields');
    }
    parsed.score = Math.max(0, Math.min(10, Math.round(parsed.score)));
    parsed.verdict = parsed.score >= 5 ? 'pass' : 'fail';
    return apiSuccess(parsed);
  } catch (error) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : 'Failed to review code',
    );
  }
}
