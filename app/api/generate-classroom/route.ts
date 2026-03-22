import { after, type NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { type GenerateClassroomInput } from '@/lib/server/classroom-generation';
import { runClassroomGenerationJob } from '@/lib/server/classroom-job-runner';
import { createClassroomGenerationJob } from '@/lib/server/classroom-job-store';
import { buildRequestOrigin } from '@/lib/server/classroom-storage';
import { auth } from '@/auth';
import { deductCredit } from '@/lib/credits';

export const maxDuration = 30;

const GUEST_TRIAL_COOKIE = 'guest_trial_used';

export async function POST(req: NextRequest) {
  const session = await auth();
  const jobId = nanoid(10);

  let isGuest = false;

  if (!session?.user?.id) {
    // Allow one free guest generation tracked via cookie
    const guestUsed = req.cookies.get(GUEST_TRIAL_COOKIE)?.value;
    if (guestUsed === 'true') {
      return apiError(
        'UNAUTHORIZED',
        401,
        'Sign up free to keep generating classrooms — your first one is already done!',
      );
    }
    isGuest = true;
  } else {
    // Authenticated: deduct credit
    const creditResult = await deductCredit(session.user.id, jobId, 'activity_use');
    if (!creditResult.ok) {
      return apiError(
        'INSUFFICIENT_CREDITS',
        402,
        'You have no credits left. Purchase a plan to continue.',
      );
    }
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

    const res = apiSuccess(
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

    // Mark guest trial as used so they can only generate once without signing up
    if (isGuest) {
      res.cookies.set(GUEST_TRIAL_COOKIE, 'true', {
        maxAge: 60 * 60 * 24 * 365,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      });
    }

    return res;
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
