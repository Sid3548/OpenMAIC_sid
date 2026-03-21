import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialise Stripe lazily so builds without STRIPE_SECRET_KEY still compile
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
}

// Map plan slugs → Stripe Price IDs  (set these in your env vars)
const PRICE_IDS: Record<string, string | undefined> = {
  pro: process.env.STRIPE_PRICE_PRO,
  teams: process.env.STRIPE_PRICE_TEAMS,
};

export async function POST(req: NextRequest) {
  try {
    const { plan } = (await req.json()) as { plan: string };

    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json(
        { error: `Unknown plan "${plan}" or Stripe price not configured` },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const origin = req.headers.get('origin') ?? 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#pricing`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
