import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import {
  orders,
  orderItems,
  orderItemModifiers,
  items,
  modifierOptions,
} from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import {
  calculatePricing,
  calculateEstimatedReadyAt,
  resolveUnitPrice,
} from '@/lib/pricing';
import { stripe } from '@/lib/stripe';
import { ok, err, handleRouteError } from '@/lib/api-response';

const OrderLineSchema = z.object({
  itemId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(50),
  // Accept both field names for compatibility
  modifierOptionIds: z.array(z.number().int().positive()).default([]),
});

const CreateOrderSchema = z.object({
  customerName: z.string().min(1).max(100).trim(),
  customerPhone: z.string().min(10).max(15),
  lines: z.array(OrderLineSchema).min(1).max(30),
  promoCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    const { customerName, customerPhone, lines, promoCode } = parsed.data;

    // Fetch item base prices from DB (never trust client prices)
    const itemIds = [...new Set(lines.map((l) => l.itemId))];
    const dbItems = await db
      .select()
      .from(items)
      .where(inArray(items.id, itemIds));
    const itemMap = new Map(dbItems.map((i) => [i.id, i]));

    for (const line of lines) {
      if (!itemMap.has(line.itemId))
        return err(`Item ${line.itemId} not found`);
      if (!itemMap.get(line.itemId)!.isActive)
        return err(`Item ${line.itemId} is unavailable`);
    }

    const cartLines = await Promise.all(
      lines.map(async (line) => {
        const item = itemMap.get(line.itemId)!;
        const unitPrice = await resolveUnitPrice(
          item.basePrice,
          line.modifierOptionIds,
        );
        return { ...line, unitPrice };
      }),
    );

    const pricing = await calculatePricing(cartLines, promoCode);
    const estimatedReadyAt = await calculateEstimatedReadyAt(pricing.total);

    // Create order in DB
    const [order] = await db
      .insert(orders)
      .values({
        customerName,
        customerPhone,
        estimatedReadyAt,
        status: 'preparing',
        subtotal: pricing.subtotal,
        discountTotal: pricing.discountTotal,
        taxTotal: pricing.taxTotal,
        total: pricing.total,
      })
      .returning();

    // Insert order items + modifiers
    for (const line of cartLines) {
      const lineSubtotal = line.unitPrice * line.quantity;
      const lineDiscount = pricing.lineDiscounts?.[line.itemId] ?? 0;
      const lineTotal = lineSubtotal - lineDiscount;

      const [oi] = await db
        .insert(orderItems)
        .values({
          orderId: order.id,
          itemId: line.itemId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineSubtotal,
          lineDiscount,
          lineTotal,
        })
        .returning();

      if (line.modifierOptionIds.length > 0) {
        const opts = await db
          .select()
          .from(modifierOptions)
          .where(inArray(modifierOptions.id, line.modifierOptionIds));

        await db.insert(orderItemModifiers).values(
          opts.map((opt) => ({
            orderItemId: oi.id,
            modifierOptionId: opt.id,
            priceDelta: opt.priceDelta,
          })),
        );
      }
    }

    // Create Stripe PaymentIntent — Dahlia 2026-05-27
    // automatic_payment_methods with allow_redirects:"never" keeps PaymentSheet redirect-free on mobile
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pricing.total,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: {
        orderId: String(order.id),
        customerName,
        customerPhone,
      },
      description: `Freshmart Order #${order.id}`,
    });

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
