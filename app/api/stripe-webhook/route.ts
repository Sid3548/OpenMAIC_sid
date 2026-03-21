import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
}

// Stripe sends raw body — disable Next.js body parsing
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook signature verification failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Handle events you care about
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      // TODO: provision access — e.g. update your DB, send welcome email
      console.log('[Stripe] New subscription:', session.id, session.customer_email);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      // TODO: revoke access
      console.log('[Stripe] Subscription cancelled:', sub.id);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      // TODO: notify customer
      console.log('[Stripe] Payment failed:', invoice.id);
      break;
    }
    default:
      // Unhandled event — just acknowledge
      break;
  }

  return NextResponse.json({ received: true });
}
