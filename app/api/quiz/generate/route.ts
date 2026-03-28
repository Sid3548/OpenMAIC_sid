import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { buildCodingQuizPrompt, buildPlacementQuizPrompt } from '@/lib/quiz/prompts';
import { parseQuizSession } from '@/lib/quiz/question-parser';
import { callQuizLLM } from '@/lib/quiz/llm';
import type { QuizSession } from '@/lib/quiz/types';
import { auth } from '@/auth';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rate-limit';

function validateQuizSession(session: QuizSession) {
  if (session.track === 'placement-aptitude') {
    if (!Array.isArray(session.questions) || session.questions.length === 0) {
      throw new Error('Quiz generation returned no placement questions');
    }
    return session;
  }

  if (!Array.isArray(session.problems) || session.problems.length === 0) {
    throw new Error('Quiz generation returned no coding problems');
  }
  return session;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError('UNAUTHORIZED', 401, 'Sign in to use this feature');
    }
    const rl = await checkRateLimit('quiz-generate', session.user.id, 10, 60);
    if (!rl.allowed) return rateLimitResponse(rl);

    const body = (await req.json()) as Record<string, string>;
    const track = body.track;

    const prompt =
      track === 'coding-examination'
        ? buildCodingQuizPrompt({
            language: (body.language as 'python' | 'java' | 'cpp' | 'javascript') || 'python',
            difficulty: (body.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
          })
        : buildPlacementQuizPrompt({
            company: body.company || 'General',
            difficulty: (body.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
            language: body.locale || 'English',
          });

    const result = await callQuizLLM(
      req,
      'You generate interview-style quizzes in strict JSON. No markdown.',
      prompt,
      'quiz-generate',
    );

    const quizSession = validateQuizSession(parseQuizSession(result.text.trim()));
    return apiSuccess({ ...quizSession });
  } catch (error) {
    return apiError(
      'INTERNAL_ERROR',
      500,
      error instanceof Error ? error.message : 'Failed to generate quiz',
    );
  }
}
