import { db } from '@/db';
import {
  orders,
  orderItems,
  orderItemModifiers,
  items,
  modifierOptions,
} from '@/db/schema';
import { inArray, eq, asc } from 'drizzle-orm';
import { requireRole } from '@/lib/auth';
import { ok, handleRouteError } from '@/lib/api-response';

export async function GET() {
  try {
    await requireRole('kitchen');
    const activeOrders = await db
      .select()
      .from(orders)
      .where(inArray(orders.status, ['paid', 'preparing', 'ready']))
      .orderBy(asc(orders.createdAt));

    const enriched = await Promise.all(
      activeOrders.map(async (order) => {
        const ois = await db
          .select({
            id: orderItems.id,
            itemId: orderItems.itemId,
            itemName: items.name,
            quantity: orderItems.quantity,
            lineTotal: orderItems.lineTotal,
          })
          .from(orderItems)
          .innerJoin(items, eq(orderItems.itemId, items.id))
          .where(eq(orderItems.orderId, order.id));

        const modRows = await db
          .select({
            orderItemId: orderItemModifiers.orderItemId,
            optionName: modifierOptions.name,
          })
          .from(orderItemModifiers)
          .innerJoin(
            modifierOptions,
            eq(orderItemModifiers.modifierOptionId, modifierOptions.id),
          );

        return {
          ...order,
          lines: ois.map((oi) => ({
            ...oi,
            modifiers: modRows
              .filter((m) => m.orderItemId === oi.id)
              .map((m) => m.optionName),
          })),
        };
      }),
    );

    return ok(enriched);
  } catch (e) {
    return handleRouteError(e);
  }
}
