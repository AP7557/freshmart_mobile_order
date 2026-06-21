import { db } from "@/db";
import { items, modifiers, modifierOptions, itemModifiers, promotions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ok, handleRouteError } from "@/lib/api-response";

export async function GET() {
  try {
    const allItems = await db
      .select()
      .from(items)
      .where(eq(items.isActive, true));

    const allModifiers = await db
      .select({
        modifierId: modifiers.id,
        modifierName: modifiers.name,
        modifierType: modifiers.type,
        required: modifiers.required,
        maxChoices: modifiers.maxChoices,
        itemId: itemModifiers.itemId,
      })
      .from(modifiers)
      .innerJoin(itemModifiers, eq(modifiers.id, itemModifiers.modifierId));

    const allOptions = await db.select().from(modifierOptions);

    const now = new Date();
    const activePromos = await db
      .select()
      .from(promotions)
      .where(
        and(
          eq(promotions.isActive, true)
        )
      );

    return ok({ items: allItems, modifiers: allModifiers, modifierOptions: allOptions, promotions: activePromos });
  } catch (e) {
    return handleRouteError(e);
  }
}
