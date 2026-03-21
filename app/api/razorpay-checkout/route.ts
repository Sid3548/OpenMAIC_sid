import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables must be set');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// Map plan slugs → amount in paise (INR) and plan label
const PLANS: Record<string, { amount: number; currency: string; name: string } | undefined> = {
  pro:   { amount: 99900,  currency: 'INR', name: 'OpenMAIC Pro — ₹999/mo' },
  teams: { amount: 299900, currency: 'INR', name: 'OpenMAIC Teams — ₹2,999/mo' },
};

export async function POST(req: NextRequest) {
  try {
    const { plan } = (await req.json()) as { plan: string };

    const planConfig = PLANS[plan];
    if (!planConfig) {
      return NextResponse.json(
        { error: `Unknown plan "${plan}"` },
        { status: 400 },
      );
    }

    const razorpay = getRazorpay();

    const order = await razorpay.orders.create({
      amount: planConfig.amount,
      currency: planConfig.currency,
      receipt: `rcpt_${plan}_${Date.now()}`,
      notes: { plan, name: planConfig.name },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: planConfig.name,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
