import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature') ?? '';
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error('Stripe webhook signature failed:', err);
    return new NextResponse('Invalid signature', { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const rawId = pi.metadata?.orderId;

    // FIX #15: Guard against missing/non-numeric orderId before calling parseInt.
    // Previously parseInt(undefined) → NaN → silent no-op update, order stuck in pending_payment.
    const orderId = rawId ? parseInt(rawId, 10) : NaN;
    if (!rawId || isNaN(orderId)) {
      console.error('Stripe webhook: invalid orderId in metadata', {
        piId: pi.id,
        metadata: pi.metadata,
      });
      return NextResponse.json({ received: true }); // 200 so Stripe doesn't retry
    }

    await db
      .update(orders)
      .set({ status: 'paid', updatedAt: new Date() })
      .where(eq(orders.id, orderId));
    console.log(`Order #${orderId} marked paid (PI: ${pi.id})`);
  }

  return NextResponse.json({ received: true });
}
