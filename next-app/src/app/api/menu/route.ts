import { db } from '@/db';
import {
  items,
  modifiers,
  modifierOptions,
  itemModifiers,
  promotions,
} from '@/db/schema';
import { eq, and, lte, gte } from 'drizzle-orm';
import { ok, handleRouteError } from '@/lib/api-response';

export async function GET() {
  try {
    const allItems = await db
      .select()
      .from(items)
      .where(eq(items.isActive, true));

    // Flat join — one row per (modifier, item) assignment.
    // Matches MenuModifier interface exactly.
    const allModifiers = await db
      .select({
        modifierId: modifiers.id,
        modifierName: modifiers.name,
        modifierType: modifiers.type,
        required: modifiers.required,
        maxChoices: modifiers.maxChoices,
        sortOrder: modifiers.sortOrder, // ← was missing
        category: modifiers.category, // ← was missing
        itemId: itemModifiers.itemId,
      })
      .from(modifiers)
      .innerJoin(itemModifiers, eq(modifiers.id, itemModifiers.modifierId));

    const allOptions = await db.select().from(modifierOptions).where(
      eq(modifierOptions.isActive, true), // only active ones
    );

    // Filter active promos whose date window includes right now
    const now = new Date();
    const activePromos = await db
      .select()
      .from(promotions)
      .where(
        and(
          eq(promotions.isActive, true),
          lte(promotions.startAt, now), // started already
          gte(promotions.endAt, now), // not yet expired
        ),
      );

    return ok({
      items: allItems,
      modifiers: allModifiers,
      modifierOptions: allOptions,
      promotions: activePromos,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
