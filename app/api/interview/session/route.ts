import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { resolveVerificationModelFromHeaders } from '@/lib/server/resolve-model';
import { callLLM } from '@/lib/ai/llm';
import { buildInterviewSessionPrompt } from '@/lib/interview/prompts';
import type { InterviewConfig } from '@/lib/interview/types';
import { parseFirstJsonObject } from '@/lib/server/json-parser';
import { auth } from '@/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rate-limit';

function normalizeInterviewSessionResult(input: Record<string, unknown>) {
  const question = typeof input.question === 'string' ? input.question.trim() : '';
  if (!question) {
    throw new Error('Interview session response did not include a valid question');
  }
  return { question };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('UNAUTHORIZED', 401, 'Sign in to use this feature');
    }
    const rl = await checkRateLimit('interview-session', session.user.id, 10, 60);
    if (!rl.allowed) return rateLimitResponse(rl);

    const body = (await req.json()) as InterviewConfig;
    const { model } = resolveVerificationModelFromHeaders(req);
    const result = await callLLM(
      {
        model,
        system: 'You are a realistic interviewer. Return JSON only.',
        prompt: buildInterviewSessionPrompt(body),
      },
      'interview-session',
    );
    return apiSuccess(normalizeInterviewSessionResult(parseFirstJsonObject<Record<string, unknown>>(result.text)));
  } catch (error) {
    return apiError('INTERNAL_ERROR', 500, error instanceof Error ? error.message : 'Failed');
  }
}
