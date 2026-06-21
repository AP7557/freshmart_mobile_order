
import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { modifiers, modifierOptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { ok, err, handleRouteError } from "@/lib/api-response";

const CATEGORIES = [
  "Bread / Base","Protein","Cheese","Vegetables",
  "Sauce / Dressing","Spice Level","Extras / Add-ons",
  "Temperature","Other",
] as const;

const PatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(CATEGORIES).optional(),
  type: z.enum(["single", "multiple"]).optional(),
  required: z.boolean().optional(),
  maxChoices: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  options: z.array(z.object({
    name: z.string().min(1).max(200),
    priceDelta: z.number().int().default(0),
    isDefault: z.boolean().default(false),
  })).min(1).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const modId = parseInt(id, 10);
    if (isNaN(modId)) return err("Invalid modifier id");

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    const { options, ...modData } = parsed.data;
    if (Object.keys(modData).length) {
      await db.update(modifiers).set(modData).where(eq(modifiers.id, modId));
    }

    let opts;
    if (options) {
      await db.delete(modifierOptions).where(eq(modifierOptions.modifierId, modId));
      opts = await db.insert(modifierOptions).values(
        options.map((o) => ({ ...o, modifierId: modId }))
      ).returning();
    } else {
      opts = await db.select().from(modifierOptions).where(eq(modifierOptions.modifierId, modId));
    }

    const [mod] = await db.select().from(modifiers).where(eq(modifiers.id, modId));
    return ok({ ...mod, options: opts });
  } catch (e) { return handleRouteError(e); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const modId = parseInt(id, 10);
    if (isNaN(modId)) return err("Invalid modifier id");
    await db.delete(modifiers).where(eq(modifiers.id, modId));
    return ok({ deleted: true });
  } catch (e) { return handleRouteError(e); }
}
