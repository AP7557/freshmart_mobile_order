import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { modifiers, modifierOptions } from '@/db/schema';
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
  'Size',
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
      }),
    )
    .min(1),
});

export async function GET() {
  try {
    await requireRole('admin');
    const mods = await db.select().from(modifiers).orderBy(modifiers.sortOrder);
    const opts = await db.select().from(modifierOptions);
    return ok({ modifiers: mods, options: opts });
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
    return ok({ ...mod, options: opts }, 201);
  } catch (e) {
    return handleRouteError(e);
  }
}
