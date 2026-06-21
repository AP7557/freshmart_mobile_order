import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { items } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { ok, err, handleRouteError } from "@/lib/api-response";

const ItemSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).default(""),
  basePrice: z.number().int().min(0),
  imageUrl: z.string().url().or(z.literal("")).default(""),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    await requireRole("admin");
    const all = await db.select().from(items).orderBy(items.id);
    return ok(all);
  } catch (e) { return handleRouteError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const body = await req.json();
    const parsed = ItemSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const [item] = await db.insert(items).values(parsed.data).returning();
    return ok(item, 201);
  } catch (e) { return handleRouteError(e); }
}
