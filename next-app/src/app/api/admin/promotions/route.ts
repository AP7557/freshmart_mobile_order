import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { promotions, promotionItems } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { ok, err, handleRouteError } from "@/lib/api-response";

const PromotionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).default(""),
  type: z.enum(["percent", "fixed", "item"]),
  value: z.number().int().min(0),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  minOrderTotal: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  promotionCode: z.string().max(50).nullable().default(null),
  itemIds: z.array(z.number().int().positive()).default([]),
});

export async function GET() {
  try {
    await requireRole("admin");
    const promos = await db.select().from(promotions);
    const pi = await db.select().from(promotionItems);
    return ok({ promotions: promos, promotionItems: pi });
  } catch (e) { return handleRouteError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const body = await req.json();
    const parsed = PromotionSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const { itemIds, ...promoData } = parsed.data;
    const [promo] = await db
      .insert(promotions)
      .values({
        ...promoData,
        startAt: new Date(promoData.startAt),
        endAt: new Date(promoData.endAt),
      })
      .returning();
    if (itemIds.length > 0) {
      await db.insert(promotionItems).values(
        itemIds.map((itemId) => ({ promotionId: promo.id, itemId }))
      );
    }
    return ok(promo, 201);
  } catch (e) { return handleRouteError(e); }
}
