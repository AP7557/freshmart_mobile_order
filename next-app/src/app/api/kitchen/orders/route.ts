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

    // FIX #9: pending_payment excluded — kitchen only sees confirmed-paid orders.
    const activeOrders = await db
      .select()
      .from(orders)
      .where(inArray(orders.status, ['paid', 'preparing', 'ready']))
      .orderBy(asc(orders.createdAt));

    if (activeOrders.length === 0) return ok([]);

    const orderIds = activeOrders.map((o) => o.id);

    // FIX #5: 3 flat queries instead of 1 + N queries + full-table scan.
    const allOis = await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        itemId: orderItems.itemId,
        itemName: items.name,
        quantity: orderItems.quantity,
        lineTotal: orderItems.lineTotal,
      })
      .from(orderItems)
      .innerJoin(items, eq(orderItems.itemId, items.id))
      .where(inArray(orderItems.orderId, orderIds));

    const oiIds = allOis.map((oi) => oi.id);
    const allMods = oiIds.length
      ? await db
          .select({
            orderItemId: orderItemModifiers.orderItemId,
            optionName: modifierOptions.name,
          })
          .from(orderItemModifiers)
          .innerJoin(
            modifierOptions,
            eq(orderItemModifiers.modifierOptionId, modifierOptions.id),
          )
          .where(inArray(orderItemModifiers.orderItemId, oiIds))
      : [];

    const modsByOiId = new Map<number, string[]>();
    const oisByOrderId = new Map<number, typeof allOis>();

    for (const m of allMods) {
      const a = modsByOiId.get(m.orderItemId) ?? [];
      a.push(m.optionName);
      modsByOiId.set(m.orderItemId, a);
    }
    for (const oi of allOis) {
      const a = oisByOrderId.get(oi.orderId) ?? [];
      a.push(oi);
      oisByOrderId.set(oi.orderId, a);
    }

    const enriched = activeOrders.map((order) => ({
      ...order,
      lines: (oisByOrderId.get(order.id) ?? []).map((oi) => ({
        id: oi.id,
        itemId: oi.itemId,
        itemName: oi.itemName,
        quantity: oi.quantity,
        lineTotal: oi.lineTotal,
        modifiers: modsByOiId.get(oi.id) ?? [],
      })),
    }));

    return ok(enriched);
  } catch (e) {
    return handleRouteError(e);
  }
}
