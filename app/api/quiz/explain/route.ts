import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { callQuizLLM } from '@/lib/quiz/llm';
import { auth } from '@/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('UNAUTHORIZED', 401, 'Sign in to use this feature');
    }
    const rl = await checkRateLimit('quiz-explain', session.user.id, 20, 60);
    if (!rl.allowed) return rateLimitResponse(rl);

    const body = (await req.json()) as { prompt: string };
    const result = await callQuizLLM(
      req,
      'You explain wrong quiz answers clearly and briefly. Return plain text only.',
      body.prompt,
      'quiz-explain',
    );
    return apiSuccess({ explanation: result.text.trim() });
  } catch (error) {
    return apiError('INTERNAL_ERROR', 500, error instanceof Error ? error.message : 'Failed');
  }
}
