/**
 * GET  /api/credits        — returns current user's credit balance + auto-refreshes weekly free credits
 * POST /api/credits/refund — refunds 1 credit for a failed activity
 */

import { auth } from '@/auth';
import { getCredits, refreshWeeklyCredits } from '@/lib/credits';
import { apiError, apiSuccess } from '@/lib/server/api-response';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401, 'Not signed in');
  }

  // Auto-refresh weekly free credits (2/week for free-tier users)
  await refreshWeeklyCredits(session.user.id).catch(() => {});

  const balance = await getCredits(session.user.id);
  return apiSuccess({ credits: balance });
}
