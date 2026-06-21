import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { ok, err, handleRouteError } from "@/lib/api-response";

const StatusSchema = z.object({
  status: z.enum(["preparing", "ready", "completed"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("kitchen");
    const { id } = await params;
    const body = await req.json();
    const parsed = StatusSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const [updated] = await db
      .update(orders)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(orders.id, parseInt(id, 10)))
      .returning();
    if (!updated) return err("Order not found", 404);
    return ok(updated);
  } catch (e) { return handleRouteError(e); }
}
