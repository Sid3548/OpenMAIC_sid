import { after, type NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { type GenerateClassroomInput } from '@/lib/server/classroom-generation';
import { runClassroomGenerationJob } from '@/lib/server/classroom-job-runner';
import { createClassroomGenerationJob } from '@/lib/server/classroom-job-store';
import { buildRequestOrigin } from '@/lib/server/classroom-storage';
import { auth } from '@/auth';
import { deductCredit } from '@/lib/credits';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rate-limit';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  // Auth + credit check
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401, 'Sign in to generate a classroom');
  }

  const rl = await checkRateLimit('generate-classroom', session.user.id, 5, 60);
  if (!rl.allowed) return rateLimitResponse(rl);

  const jobId = nanoid(10);
  const creditResult = await deductCredit(session.user.id, jobId, 'activity_use');
  if (!creditResult.ok) {
    return apiError(
      'INSUFFICIENT_CREDITS',
      402,
      'You have no credits left. Purchase a plan to continue.',
    );
  }

  try {
    const rawBody = (await req.json()) as Partial<GenerateClassroomInput>;
    const body: GenerateClassroomInput = {
      requirement: rawBody.requirement || '',
      ...(rawBody.pdfContent ? { pdfContent: rawBody.pdfContent } : {}),
      ...(rawBody.language ? { language: rawBody.language } : {}),
      ...(rawBody.enableWebSearch != null ? { enableWebSearch: rawBody.enableWebSearch } : {}),
      ...(rawBody.enableImageGeneration != null
        ? { enableImageGeneration: rawBody.enableImageGeneration }
        : {}),
      ...(rawBody.enableVideoGeneration != null
        ? { enableVideoGeneration: rawBody.enableVideoGeneration }
        : {}),
      ...(rawBody.enableTTS != null ? { enableTTS: rawBody.enableTTS } : {}),
      ...(rawBody.agentMode ? { agentMode: rawBody.agentMode } : {}),
    };
    const { requirement } = body;

    if (!requirement) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Missing required field: requirement');
    }

    const baseUrl = buildRequestOrigin(req);
    const job = await createClassroomGenerationJob(jobId, body);
    const pollUrl = `${baseUrl}/api/generate-classroom/${jobId}`;

    after(() => runClassroomGenerationJob(jobId, body, baseUrl));

    return apiSuccess(
      {
        jobId,
        status: job.status,
        step: job.step,
        message: job.message,
        pollUrl,
        pollIntervalMs: 5000,
      },
      202,
    );
  } catch (error) {
    // Refund the credit since the job could not be started
    if (session?.user?.id) {
      const { refundCredit } = await import('@/lib/credits');
      await refundCredit(session.user.id, jobId, 'Job failed to start');
    }
    return apiError(
      'INTERNAL_ERROR',
      500,
      'Failed to create classroom generation job',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
