import { NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error('Stripe webhook signature failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        const orderId = pi.metadata?.orderId
          ? Number(pi.metadata.orderId)
          : null;
        if (orderId) {
          await db
            .update(orders)
            .set({
              status: 'paid',
              stripePaymentIntentId: pi.id,
              updatedAt: new Date(),
            })
            .where(eq(orders.id, orderId));
        }
        break;
      }

      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled': {
        const pi = event.data.object;
        const orderId = pi.metadata?.orderId
          ? Number(pi.metadata.orderId)
          : null;
        if (orderId) {
          await db
            .update(orders)
            .set({ status: 'cancelled', updatedAt: new Date() })
            .where(eq(orders.id, orderId));
        }
        break;
      }

      default:
        break; // Unhandled events are ignored
    }
  } catch (err) {
    console.error(`Error handling Stripe event ${event.type}:`, err);
    return new Response('Handler error', { status: 500 });
  }

  return Response.json({ received: true });
}

// Stripe requires the raw body for signature verification
export const config = { api: { bodyParser: false } };
