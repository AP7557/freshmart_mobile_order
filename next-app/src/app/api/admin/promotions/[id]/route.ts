
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { promotions, promotionItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { ok, err, handleRouteError } from "@/lib/api-response";

const PatchSchema = z.object({
  name:           z.string().min(1).max(200).optional(),
  description:    z.string().optional(),
  type:           z.enum(["percent","fixed","item","buy_x_get_y","bundle"]).optional(),
  value:          z.number().int().min(0).optional(),
  startAt:        z.string().datetime().optional(),
  endAt:          z.string().datetime().optional(),
  minOrderTotal:  z.number().int().min(0).optional(),
  isActive:       z.boolean().optional(),
  promotionCode:  z.string().max(50).nullable().optional(),
  itemIds:        z.array(z.number().int().positive()).optional(),
  triggerQty:     z.number().int().min(1).optional(),
  rewardQty:      z.number().int().min(1).optional(),
  triggerItemIds: z.array(z.number().int().positive()).optional(),
  rewardItemIds:  z.array(z.number().int().positive()).optional(),
  appliesTo:      z.enum(["order","trigger_items","reward_items"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const promoId = parseInt(id, 10);
    if (isNaN(promoId)) return err("Invalid promotion id");
    const body   = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const { itemIds, ...promoData } = parsed.data;
    const updateData: Record<string, unknown> = { ...promoData };
    if (promoData.startAt) updateData.startAt = new Date(promoData.startAt);
    if (promoData.endAt)   updateData.endAt   = new Date(promoData.endAt);
    if (Object.keys(updateData).length) {
      await db.update(promotions).set(updateData).where(eq(promotions.id, promoId));
    }
    if (itemIds !== undefined) {
      await db.delete(promotionItems).where(eq(promotionItems.promotionId, promoId));
      if (itemIds.length > 0) {
        await db.insert(promotionItems).values(itemIds.map(itemId => ({ promotionId: promoId, itemId })));
      }
    }
    const [updated] = await db.select().from(promotions).where(eq(promotions.id, promoId));
    return ok(updated);
  } catch (e) { return handleRouteError(e); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const promoId = parseInt(id, 10);
    if (isNaN(promoId)) return err("Invalid promotion id");
    await db.delete(promotions).where(eq(promotions.id, promoId));
    return ok({ deleted: true });
  } catch (e) { return handleRouteError(e); }
}
