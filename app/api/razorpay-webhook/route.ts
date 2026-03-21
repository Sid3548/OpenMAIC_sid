import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

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
      console.log('[Razorpay] Payment captured:', payment?.id, payment?.email);
      // TODO: provision subscription access — update DB, send welcome email, etc.
      break;
    }
    case 'payment.failed': {
      const payment = (payload?.payment as Record<string, unknown>)?.entity as Record<string, unknown>;
      console.log('[Razorpay] Payment failed:', payment?.id);
      // TODO: notify customer
      break;
    }
    case 'subscription.cancelled': {
      const sub = (payload?.subscription as Record<string, unknown>)?.entity as Record<string, unknown>;
      console.log('[Razorpay] Subscription cancelled:', sub?.id);
      // TODO: revoke access
      break;
    }
    default:
      // Acknowledge unhandled events
      break;
  }

  return NextResponse.json({ received: true });
}
