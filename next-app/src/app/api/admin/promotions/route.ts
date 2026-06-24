import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { promotions, promotionItems } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth';
import { ok, handleRouteError } from '@/lib/api-response';

function badRequest(errors: unknown) {
  return new Response(JSON.stringify({ error: errors }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

// FIX #14: percent capped at 100; dates validated server-side.
// FIX: startAt/endAt stored as Date objects (Drizzle timestamp columns require Date, not string).
const PromotionSchema = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().max(500).default(''),
    type: z.enum(['percent', 'fixed', 'item', 'buy_x_get_y', 'bundle']),
    value: z.number().int().min(0),
    startAt: z.iso.datetime(),
    endAt: z.iso.datetime(),
    minOrderTotal: z.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
    promotionCode: z.string().max(50).optional().nullable(),
    triggerQty: z.number().int().min(1).default(1),
    rewardQty: z.number().int().min(1).default(1),
    triggerItemIds: z.array(z.number().int().positive()).default([]),
    rewardItemIds: z.array(z.number().int().positive()).default([]),
    appliesTo: z.string().default('order'),
    itemIds: z.array(z.number().int().positive()).default([]),
  })
  .refine((d) => d.type !== 'percent' || d.value <= 100, {
    message: 'Percent discount cannot exceed 100%',
    path: ['value'],
  })
  .refine((d) => new Date(d.startAt) < new Date(d.endAt), {
    message: 'startAt must be before endAt',
    path: ['endAt'],
  })
  // FIX: Transform ISO strings → Date so Drizzle timestamp columns accept them.
  .transform((d) => ({
    ...d,
    startAt: new Date(d.startAt),
    endAt: new Date(d.endAt),
  }));

export async function GET() {
  try {
    await requireRole('admin');
    const all = await db.select().from(promotions);
    const items = await db.select().from(promotionItems);
    return ok(
      all.map((p) => ({
        ...p,
        promotionItems: items.filter((i) => i.promotionId === p.id),
      })),
    );
  } catch (e) {
    return handleRouteError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin');
    const body = await req.json();
    const parsed = PromotionSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors);

    const { itemIds, ...promoData } = parsed.data;
    // promoData.startAt and promoData.endAt are now Date objects ✅
    const [promo] = await db.insert(promotions).values(promoData).returning();

    if (itemIds.length) {
      await db
        .insert(promotionItems)
        .values(itemIds.map((itemId) => ({ promotionId: promo.id, itemId })));
    }
    return ok(promo);
  } catch (e) {
    return handleRouteError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireRole('admin');
    const body = await req.json();
    const { id, itemIds, ...rest } = body;
    if (!id) return badRequest('Missing id');

    const parsed = PromotionSchema.partial().safeParse(rest);
    if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors);

    // partial().transform() still converts string dates → Date when present ✅
    const [updated] = await db
      .update(promotions)
      .set(parsed.data)
      .where(eq(promotions.id, id))
      .returning();

    if (Array.isArray(itemIds)) {
      await db.delete(promotionItems).where(eq(promotionItems.promotionId, id));
      if (itemIds.length) {
        await db
          .insert(promotionItems)
          .values(
            itemIds.map((itemId: number) => ({ promotionId: id, itemId })),
          );
      }
    }
    return ok(updated);
  } catch (e) {
    return handleRouteError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireRole('admin');
    const { id } = await req.json();
    if (!id) return badRequest('Missing id');
    await db.delete(promotions).where(eq(promotions.id, id));
    return ok({ deleted: id });
  } catch (e) {
    return handleRouteError(e);
  }
}
