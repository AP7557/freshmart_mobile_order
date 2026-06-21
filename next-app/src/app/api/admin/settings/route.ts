import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { ok, err, handleRouteError } from "@/lib/api-response";

const SettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().min(1).max(500),
});

export async function GET() {
  try {
    await requireRole("admin");
    const all = await db.select().from(settings);
    return ok(all);
  } catch (e) { return handleRouteError(e); }
}

export async function PUT(req: NextRequest) {
  try {
    await requireRole("admin");
    const body = await req.json();
    const parsed = SettingSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    await db
      .insert(settings)
      .values(parsed.data)
      .onConflictDoUpdate({ target: settings.key, set: { value: parsed.data.value } });
    return ok({ updated: true });
  } catch (e) { return handleRouteError(e); }
}
