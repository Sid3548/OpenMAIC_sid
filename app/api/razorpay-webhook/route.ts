import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { grantCredits, CREDITS_PER_PLAN } from '@/lib/credits';

export const runtime = 'nodejs';

/**
 * Razorpay Payment Verification Webhook
 *
 * Razorpay sends a POST with JSON body + X-Razorpay-Signature header.
 * Verify the signature using HMAC-SHA256 of "orderId|paymentId" with
 * your webhook secret.
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const signature = req.headers.get('x-razorpay-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing x-razorpay-signature header' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  const rawBody = await req.text();

  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Verify HMAC signature
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (expected !== signature) {
    return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 });
  }

  const event = body.event as string;
  const payload = body.payload as Record<string, unknown>;

  switch (event) {
    case 'payment.captured': {
      const payment = (payload?.payment as Record<string, unknown>)?.entity as Record<string, unknown>;
      const notes = payment?.notes as Record<string, string> | undefined;
      const userId = notes?.userId;
      const plan = notes?.plan || 'individual';
      const orderId = payment?.order_id as string | undefined;
      const paymentId = payment?.id as string;

      if (userId) {
        const creditsToGrant = CREDITS_PER_PLAN[plan] ?? 30;
        await grantCredits(userId, creditsToGrant, 'purchase', `Plan: ${plan}, payment: ${paymentId}`);
        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            plan,
            status: 'active',
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            creditsGranted: creditsToGrant,
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          update: {
            plan,
            status: 'active',
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            creditsGranted: creditsToGrant,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }
      console.log('[Razorpay] Payment captured:', paymentId, '— userId:', userId, '— plan:', plan);
      break;
    }
    case 'payment.failed': {
      const payment = (payload?.payment as Record<string, unknown>)?.entity as Record<string, unknown>;
      console.log('[Razorpay] Payment failed:', payment?.id);
      // No action needed — user keeps existing credits
      break;
    }
    case 'subscription.cancelled': {
      const sub = (payload?.subscription as Record<string, unknown>)?.entity as Record<string, unknown>;
      const notes = sub?.notes as Record<string, string> | undefined;
      const userId = notes?.userId;
      if (userId) {
        await prisma.subscription.updateMany({
          where: { userId },
          data: { status: 'cancelled' },
        });
      }
      console.log('[Razorpay] Subscription cancelled:', sub?.id, '— userId:', userId);
      break;
    }
    default:
      // Acknowledge unhandled events
      break;
  }

  return NextResponse.json({ received: true });
}
