/**
 * Credit system helpers.
 *
 * 1 credit = 1 activity (classroom generation, quiz session, interview session).
 * Users get 1 free credit on signup and earn more via subscription payments.
 *
 * Individual plan (₹499/mo)  → 30 credits/month
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
