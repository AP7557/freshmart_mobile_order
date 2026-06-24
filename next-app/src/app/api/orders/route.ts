import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import {
  orders,
  orderItems,
  orderItemModifiers,
  modifierOptions,
} from '@/db/schema';
import { inArray, eq } from 'drizzle-orm';
import { ok, handleRouteError } from '@/lib/api-response'; // removed: fail
import {
  calculatePricing,
  calculateEstimatedReadyAt,
  resolveUnitPrice,
} from '@/lib/pricing';
import { stripe } from '@/lib/stripe';

// FIX #8: Accept both field name variants; transform normalises to modifierOptionIds.
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

function badRequest(errors: unknown) {
  return new Response(JSON.stringify({ error: errors }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors);

    const { customerName, customerPhone, lines, promoCode } = parsed.data;

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

    // FIX #4: Full transaction — no partial order records on failure.
    const order = await db.transaction(async (tx) => {
      // FIX #9: status starts as 'pending_payment'
      const [newOrder] = await tx
        .insert(orders)
        .values({
          customerName,
          customerPhone,
          estimatedReadyAt, // already a Date from calculateEstimatedReadyAt
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

    // FIX #1: Single PI created after transaction — clientSecret returned directly.
    // FIX #15: orderId as string in metadata for safe parseInt in webhook.
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pricing.total,
      currency: 'usd',
      metadata: { orderId: String(order.id) },
      automatic_payment_methods: { enabled: true },
    });

    // FIX: Use eq() — Drizzle .where() requires a SQL expression, not a callback.
    await db
      .update(orders)
      .set({ stripePaymentIntentId: paymentIntent.id })
      .where(eq(orders.id, order.id));

    return ok({
      orderId: order.id,
      clientSecret: paymentIntent.client_secret,
      pricing,
      estimatedReadyAt,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
