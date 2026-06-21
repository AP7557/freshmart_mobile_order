
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { promotions, promotionItems, items } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { ok, err, handleRouteError } from "@/lib/api-response";

const PromotionSchema = z.object({
  name:           z.string().min(1).max(200),
  description:    z.string().max(1000).default(""),
  type:           z.enum(["percent","fixed","item","buy_x_get_y","bundle"]),
  value:          z.number().int().min(0),
  startAt:        z.string().datetime(),
  endAt:          z.string().datetime(),
  minOrderTotal:  z.number().int().min(0).default(0),
  isActive:       z.boolean().default(true),
  promotionCode:  z.string().max(50).nullable().default(null),
  // item associations (used by all types via promotion_items join table)
  itemIds:        z.array(z.number().int().positive()).default([]),
  // BuyXGetY / bundle fields
  triggerQty:     z.number().int().min(1).default(1),
  rewardQty:      z.number().int().min(1).default(1),
  triggerItemIds: z.array(z.number().int().positive()).default([]),
  rewardItemIds:  z.array(z.number().int().positive()).default([]),
  appliesTo:      z.enum(["order","trigger_items","reward_items"]).default("order"),
});

export async function GET() {
  try {
    await requireRole("admin");
    const promos = await db.select().from(promotions);
    const pi     = await db.select().from(promotionItems);
    // Enrich with item names so the page can display them without extra fetches
    const allItems = await db.select({ id: items.id, name: items.name }).from(items);
    const itemMap  = Object.fromEntries(allItems.map(i => [i.id, i.name]));
    const piMap: Record<number, Array<{ id: number; name: string }>> = {};
    for (const row of pi) {
      if (!piMap[row.promotionId]) piMap[row.promotionId] = [];
      piMap[row.promotionId].push({ id: row.itemId, name: itemMap[row.itemId] ?? `#${row.itemId}` });
    }
    const enriched = promos.map(p => ({
      ...p,
      linkedItems: piMap[p.id] ?? [],
    }));
    return ok({ promotions: enriched, items: allItems });
  } catch (e) { return handleRouteError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const body   = await req.json();
    const parsed = PromotionSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const { itemIds, ...promoData } = parsed.data;
    const [promo] = await db.insert(promotions).values({
      ...promoData,
      startAt: new Date(promoData.startAt),
      endAt:   new Date(promoData.endAt),
    }).returning();
    if (itemIds.length > 0) {
      await db.insert(promotionItems).values(
        itemIds.map(itemId => ({ promotionId: promo.id, itemId }))
      );
    }
    return ok(promo, 201);
  } catch (e) { return handleRouteError(e); }
}
