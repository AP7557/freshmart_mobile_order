import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { items } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireRole } from '@/lib/auth';
import { ok, err, handleRouteError } from '@/lib/api-response';

const ItemUpdateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).optional(),
  basePrice: z.number().int().min(0).optional(),
  imageUrl: z.url().or(z.literal('')).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole('admin');
    const { id } = await params;
    const body = await req.json();
    const parsed = ItemUpdateSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const [updated] = await db
      .update(items)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(items.id, parseInt(id, 10)))
      .returning();
    if (!updated) return err('Item not found', 404);
    return ok(updated);
  } catch (e) {
    return handleRouteError(e);
  }
}
