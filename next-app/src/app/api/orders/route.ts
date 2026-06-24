import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import {
  orders,
  orderItems,
  orderItemModifiers,
  modifierOptions,
} from '@/db/schema';
import { inArray } from 'drizzle-orm';
import Stripe from 'stripe';
import { ok, fail, handleRouteError } from '@/lib/api-response';
import {
  calculatePricing,
  calculateEstimatedReadyAt,
  resolveUnitPrice,
} from '@/lib/pricing';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

// FIX #8: Accept both field names; transform normalises to modifierOptionIds.
const OrderLineSchema = z
  .object({
    itemId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(50),
    modifierOptionIds: z.array(z.number().int().positive()).default([]),
    selectedModifierOptionIds: z.array(z.number().int().positive()).default([]),
  })
  .transform((d) => ({
    itemId: d.itemId,
    quantity: d.quantity,
    modifierOptionIds: d.modifierOptionIds.length
      ? d.modifierOptionIds
      : d.selectedModifierOptionIds,
  }));

const CreateOrderSchema = z.object({
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().min(10).max(20),
  lines: z.array(OrderLineSchema).min(1).max(50),
  promoCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.flatten().fieldErrors, 400);

    const { customerName, customerPhone, lines, promoCode } = parsed.data;

    // Resolve server-side prices — client prices are never trusted
    const pricedLines = await Promise.all(
      lines.map(async (l) => {
        const dbItem = await db.query.items.findFirst({
          where: (t, { eq }) => eq(t.id, l.itemId),
        });
        if (!dbItem) throw new Error(`Item ${l.itemId} not found`);
        return {
          ...l,
          unitPrice: await resolveUnitPrice(
            dbItem.basePrice,
            l.modifierOptionIds,
          ),
        };
      }),
    );

    const pricing = await calculatePricing(pricedLines, promoCode);
    const estimatedReadyAt = await calculateEstimatedReadyAt(pricing.total);

    // FIX #4: Entire order creation in a single transaction.
    // If any insert fails mid-loop the whole order is rolled back — no orphan rows.
    const order = await db.transaction(async (tx) => {
      // FIX #9: status starts as 'pending_payment'; webhook advances to 'paid'.
      const [newOrder] = await tx
        .insert(orders)
        .values({
          customerName,
          customerPhone,
          estimatedReadyAt,
          status: 'pending_payment',
          subtotal: pricing.subtotal,
          discountTotal: pricing.discountTotal,
          taxTotal: pricing.taxTotal,
          total: pricing.total,
        })
        .returning();

      for (const line of pricedLines) {
        const lineSubtotal = line.unitPrice * line.quantity;
        const lineDiscount = pricing.lineDiscounts?.[line.itemId] ?? 0;

        const [oi] = await tx
          .insert(orderItems)
          .values({
            orderId: newOrder.id,
            itemId: line.itemId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineSubtotal,
            lineDiscount,
            lineTotal: lineSubtotal - lineDiscount,
          })
          .returning();

        if (line.modifierOptionIds.length) {
          const opts = await tx
            .select()
            .from(modifierOptions)
            .where(inArray(modifierOptions.id, line.modifierOptionIds));

          if (opts.length) {
            await tx.insert(orderItemModifiers).values(
              opts.map((opt) => ({
                orderItemId: oi.id,
                modifierOptionId: opt.id,
                priceDelta: opt.priceDelta,
              })),
            );
          }
        }
      }

      return newOrder;
    });

    // FIX #4: PI created after transaction succeeds — no leaked PI on DB failure.
    // FIX #1: clientSecret returned here; mobile checkout no longer calls
    //         /api/orders/payment-intent separately (which created a second PI).
    // FIX #15: orderId stored as string in metadata for safe parseInt in webhook.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pricing.total,
      currency: 'usd',
      metadata: { orderId: String(order.id) },
      automatic_payment_methods: { enabled: true },
    });

    await db
      .update(orders)
      .set({ stripePaymentIntentId: paymentIntent.id })
      .where((t: any) => t.id === order.id);

    return ok({
      orderId: order.id,
      clientSecret: paymentIntent.client_secret, // FIX #1
      pricing,
      estimatedReadyAt,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
