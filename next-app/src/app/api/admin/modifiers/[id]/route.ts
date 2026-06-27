import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { modifiers, modifierOptions } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
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

const PatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(CATEGORIES).optional(),
  type: z.enum(['single', 'multiple']).optional(),
  required: z.boolean().optional(),
  maxChoices: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
  options: z
    .array(
      z.object({
        id: z.number().int().positive().optional(), // ← existing options carry their id
        name: z.string().min(1).max(200),
        priceDelta: z.number().int().default(0),
        isDefault: z.boolean().default(false),
        isActive: z.boolean().default(true),
      }),
    )
    .min(1)
    .optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole('admin');
    const { id } = await params;
    const modId = parseInt(id, 10);
    if (isNaN(modId)) return err('Invalid modifier id');
    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    const { options, ...modData } = parsed.data;
    if (Object.keys(modData).length) {
      await db.update(modifiers).set(modData).where(eq(modifiers.id, modId));
    }

    let opts;
    if (options) {
      const existingOptions = await db
        .select()
        .from(modifierOptions)
        .where(
          and(
            eq(modifierOptions.modifierId, modId),
            eq(modifierOptions.isActive, true), // only active ones
          ),
        );

      const existingIds = new Set(existingOptions.map((o) => o.id));

      // 2. Update changed existing options
      const toUpdate = options.filter((o) => o.id && existingIds.has(o.id));
      await Promise.all(
        toUpdate.map(({ id, ...data }) =>
          db
            .update(modifierOptions)
            .set(data)
            .where(eq(modifierOptions.id, id!)),
        ),
      );

      // 3. Insert brand new options
      const toInsert = options.filter((o) => !o.id);
      if (toInsert.length) {
        await db
          .insert(modifierOptions)
          .values(toInsert.map((o) => ({ ...o, modifierId: modId })));
      }

      opts = await db
        .select()
        .from(modifierOptions)
        .where(and(eq(modifierOptions.modifierId, modId)));
    }

    const [mod] = await db
      .select()
      .from(modifiers)
      .where(eq(modifiers.id, modId));
    return ok({ ...mod, options: opts });
  } catch (e) {
    return handleRouteError(e);
  }
}
