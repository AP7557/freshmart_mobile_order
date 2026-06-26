import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { modifiers, modifierOptions, itemModifiers, items } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth';
import { ok, err, handleRouteError } from '@/lib/api-response';

const CATEGORIES = [
  'Bread / Base',
  'Protein',
  'Cheese',
  'Vegetables',
  'Sauce / Dressing',
  'Spice Level',
  'Extras / Add-ons',
  'Temperature',
  'Other',
] as const;

const ModifierSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(CATEGORIES).default('Other'),
  type: z.enum(['single', 'multiple']),
  required: z.boolean().default(false),
  maxChoices: z.number().int().positive().nullable().default(null),
  sortOrder: z.number().int().min(0).default(0),
  options: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        priceDelta: z.number().int().default(0),
        isDefault: z.boolean().default(false),
        isActive: z.boolean().default(true), // ← ADD
      }),
    )
    .min(1),
});

export async function GET() {
  try {
    await requireRole('admin');

    const mods = await db.select().from(modifiers).orderBy(modifiers.sortOrder);

    // Return ALL options (active + inactive) so admin can toggle them
    const opts = await db.select().from(modifierOptions);

    const assignments = await db
      .select({
        modifierId: itemModifiers.modifierId,
        itemId: items.id,
        itemName: items.name,
      })
      .from(itemModifiers)
      .innerJoin(items, eq(itemModifiers.itemId, items.id));

    const assignmentMap: Record<
      number,
      Array<{ id: number; name: string }>
    > = {};
    for (const row of assignments) {
      if (!assignmentMap[row.modifierId]) assignmentMap[row.modifierId] = [];
      assignmentMap[row.modifierId].push({
        id: row.itemId,
        name: row.itemName,
      });
    }

    const modsWithItems = mods.map((m) => ({
      ...m,
      assignedItems: assignmentMap[m.id] ?? [],
    }));

    return ok({ modifiers: modsWithItems, options: opts });
  } catch (e) {
    return handleRouteError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('admin');
    const body = await req.json();
    const parsed = ModifierSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const { options, ...modData } = parsed.data;
    const [mod] = await db.insert(modifiers).values(modData).returning();
    const opts = await db
      .insert(modifierOptions)
      .values(options.map((o) => ({ ...o, modifierId: mod.id })))
      .returning();
    return ok({ ...mod, options: opts, assignedItems: [] }, 201);
  } catch (e) {
    return handleRouteError(e);
  }
}
