import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { promotions, promotionItems, items } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth';
import { ok, handleRouteError } from '@/lib/api-response';

function badRequest(errors: unknown) {
  return new Response(JSON.stringify({ error: errors }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Base shape — shared between POST and PATCH, no transform.
const PromotionBaseSchema = z.object({
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
  activeDays: z
    .array(
      z.enum([
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ]),
    )
    .default([]),
});

// POST — full validation with cross-field refinements + Date transform.
const PromotionCreateSchema = PromotionBaseSchema.refine(
  (d) => d.type !== 'percent' || d.value <= 100,
  {
    message: 'Percent discount cannot exceed 100%',
    path: ['value'],
  },
)
  .refine((d) => new Date(d.startAt) < new Date(d.endAt), {
    message: 'startAt must be before endAt',
    path: ['endAt'],
  })
  .transform((d) => ({
    ...d,
    startAt: new Date(d.startAt), // Drizzle timestamp columns require Date
    endAt: new Date(d.endAt),
  }));

// PATCH — partial on the base schema (before transform), then we convert
// dates manually only if the caller included them.
const PromotionUpdateSchema = PromotionBaseSchema.partial()
  .refine(
    (d) => d.type !== 'percent' || d.value === undefined || d.value <= 100,
    { message: 'Percent discount cannot exceed 100%', path: ['value'] },
  )
  .refine(
    (d) => !d.startAt || !d.endAt || new Date(d.startAt) < new Date(d.endAt),
    { message: 'startAt must be before endAt', path: ['endAt'] },
  );

export async function GET() {
  try {
    await requireRole('admin');
    const allPromos = await db.select().from(promotions);
    const allPromoItems = await db.select().from(promotionItems);
    const allMenuItems = await db.select().from(items);

    // Build a lookup map for O(1) item name resolution
    const itemMap = new Map(allMenuItems.map((i) => [i.id, i]));

    return ok({
      promotions: allPromos.map((p) => ({
        ...p,
        promotionItems: allPromoItems
          .filter((pi) => pi.promotionId === p.id)
          .map((pi) => ({
            ...pi,
            itemName: itemMap.get(pi.itemId)?.name ?? null,
          })),
      })),
      allItems: allMenuItems,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin');
    const body = await req.json();
    const parsed = PromotionCreateSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors);

    const { itemIds, ...promoData } = parsed.data;
    // promoData.startAt / endAt are Date objects here ✅
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

    const parsed = PromotionUpdateSchema.safeParse(rest);
    if (!parsed.success) return badRequest(parsed.error.flatten().fieldErrors);

    // Convert date strings → Date only when present in the partial payload.
    const { startAt, endAt, ...otherFields } = parsed.data;
    const updatePayload = {
      ...otherFields,
      ...(startAt !== undefined && { startAt: new Date(startAt) }),
      ...(endAt !== undefined && { endAt: new Date(endAt) }),
    };

    const [updated] = await db
      .update(promotions)
      .set(updatePayload)
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
