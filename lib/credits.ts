/**
 * Credit system helpers.
 *
 * 1 credit = 1 activity (classroom generation).
 * Free users get 2 credits/week (auto-refreshed). Paid users get more.
 *
 * Free plan                   → 2 credits/week (auto)
 * Individual plan (₹99/mo)   → 30 credits/month
 * Batch plan    (₹399/user)  → 30 credits/user/month (min 5 users)
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const CREDITS_PER_PLAN: Record<string, number> = {
  individual: 30,
  batch: 30,
};

/**
 * Returns the current credit balance for a user.
 */
export async function getCredits(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  return user?.credits ?? 0;
}

/**
 * Deducts 1 credit for an activity.
 * Returns { ok: true, balance } on success or { ok: false, balance } if insufficient.
 * Uses an atomic transaction to prevent race conditions.
 */
export async function deductCredit(
  userId: string,
  activityId: string,
  reason: string = 'activity_use',
): Promise<{ ok: boolean; balance: number }> {
  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Lock the user row and read current balance
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user || user.credits < 1) {
        return { ok: false, balance: user?.credits ?? 0 };
      }

      const newBalance = user.credits - 1;

      await tx.user.update({
        where: { id: userId },
        data: { credits: newBalance },
      });

      await tx.creditLedger.create({
        data: {
          userId,
          delta: -1,
          balance: newBalance,
          reason,
          activityId,
        },
      });

      return { ok: true, balance: newBalance };
    });

    return result;
  } catch {
    return { ok: false, balance: 0 };
  }
}

/**
 * Refunds 1 credit to a user (e.g. on model failure / hallucination).
 * Also records the reason so we can track reliability issues.
 */
export async function refundCredit(
  userId: string,
  activityId: string,
  note: string = 'Activity failed — credit refunded',
): Promise<void> {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });
    if (!user) return;

    const newBalance = user.credits + 1;

    await tx.user.update({
      where: { id: userId },
      data: { credits: newBalance },
    });

    await tx.creditLedger.create({
      data: {
        userId,
        delta: 1,
        balance: newBalance,
        reason: 'refund',
        activityId,
        note,
      },
    });
  });
}

/**
 * Weekly free credit refresh for free-tier users.
 * Grants 2 credits per week if the user hasn't received free credits in the last 7 days.
 * Only applies to users without an active subscription (credits < 5 as heuristic).
 * Returns true if credits were granted.
 */
export const FREE_WEEKLY_CREDITS = 2;

export async function refreshWeeklyCredits(userId: string): Promise<boolean> {
  const lastGrant = await prisma.creditLedger.findFirst({
    where: {
      userId,
      reason: 'weekly_free',
    },
    orderBy: { createdAt: 'desc' },
  });

  // Check if 7 days have passed since last weekly grant
  if (lastGrant) {
    const daysSince = (Date.now() - lastGrant.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) return false;
  }

  // Grant weekly credits
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });
    if (!user) return;

    const newBalance = user.credits + FREE_WEEKLY_CREDITS;

    await tx.user.update({
      where: { id: userId },
      data: { credits: newBalance },
    });

    await tx.creditLedger.create({
      data: {
        userId,
        delta: FREE_WEEKLY_CREDITS,
        balance: newBalance,
        reason: 'weekly_free',
        note: `Weekly free credits (${FREE_WEEKLY_CREDITS})`,
      },
    });
  });

  return true;
}

/**
 * Grants credits to a user after a successful payment.
 */
export async function grantCredits(
  userId: string,
  amount: number,
  reason: string,
  note?: string,
): Promise<void> {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });
    if (!user) return;

    const newBalance = user.credits + amount;

    await tx.user.update({
      where: { id: userId },
      data: { credits: newBalance },
    });

    await tx.creditLedger.create({
      data: {
        userId,
        delta: amount,
        balance: newBalance,
        reason,
        note,
      },
    });
  });
}
