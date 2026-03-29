/**
 * POST /api/credits/refund
 *
 * Refunds 1 credit to the authenticated user for a failed activity.
 * Called by the client when it detects a model failure / hallucination.
 *
 * Body: { activityId: string, note?: string }
 */

import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { refundCredit } from '@/lib/credits';
import { apiError, apiSuccess } from '@/lib/server/api-response';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401, 'Not signed in');
  }

  const { activityId, note } = (await req.json()) as {
    activityId?: string;
    note?: string;
  };

  if (!activityId) {
    return apiError('MISSING_REQUIRED_FIELD', 400, 'activityId is required');
  }

  await refundCredit(
    session.user.id,
    activityId,
    note || 'Activity failed — credit refunded. Sorry for the inconvenience.',
  );

  return apiSuccess({
    refunded: true,
    message: 'Sorry for the inconvenience! Your credit has been returned.',
  });
}
