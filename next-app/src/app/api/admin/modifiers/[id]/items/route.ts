import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { itemModifiers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireRole } from '@/lib/auth';
import { ok, err, handleRouteError } from '@/lib/api-response';

const BodySchema = z.object({ itemId: z.number().int().positive() });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole('admin');
    const { id } = await params;
    const modId = parseInt(id, 10);
    if (isNaN(modId)) return err('Invalid modifier id');
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return err(parsed.error.issues[0].message);
    await db
      .insert(itemModifiers)
      .values({ modifierId: modId, itemId: parsed.data.itemId })
      .onConflictDoNothing();
    return ok({ assigned: true });
  } catch (e) {
    return handleRouteError(e);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole('admin');
    const { id } = await params;
    const modId = parseInt(id, 10);
    if (isNaN(modId)) return err('Invalid modifier id');
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return err(parsed.error.issues[0].message);
    await db
      .delete(itemModifiers)
      .where(
        and(
          eq(itemModifiers.modifierId, modId),
          eq(itemModifiers.itemId, parsed.data.itemId),
        ),
      );
    return ok({ unassigned: true });
  } catch (e) {
    return handleRouteError(e);
  }
}
