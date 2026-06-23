import { NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, handleRouteError } from '@/lib/api-response';
import { z } from 'zod';

const schema = z.object({ orderId: z.number().int().positive() });

export async function POST(req: NextRequest) {
  try {
    const { orderId } = schema.parse(await req.json());

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.total <= 0) {
      return Response.json(
        { error: 'Order total must be > 0' },
        { status: 400 },
      );
    }

    // Dahlia 2026-05-27 PaymentIntent creation
    // - automatic_payment_methods replaces the old payment_method_types array
    // - allow_redirects: "never" keeps mobile PaymentSheet redirect-free
    const paymentIntent = await stripe.paymentIntents.create({
      amount: order.total, // stored in cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: {
        orderId: String(order.id),
        customerName: order.customerName,
        customerPhone: order.customerPhone,
      },
      description: `Freshmart Order #${order.id}`,
    });

    // Persist PaymentIntent ID on the order row
    await db
      .update(orders)
      .set({
        stripePaymentIntentId: paymentIntent.id,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    return ok({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
