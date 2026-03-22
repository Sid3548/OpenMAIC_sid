/**
 * GET  /api/credits        — returns current user's credit balance
 * POST /api/credits/refund — refunds 1 credit for a failed activity
 */

import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { getCredits, refundCredit } from '@/lib/credits';
import { apiError, apiSuccess } from '@/lib/server/api-response';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401, 'Not signed in');
  }
  const balance = await getCredits(session.user.id);
  return apiSuccess({ credits: balance });
}
