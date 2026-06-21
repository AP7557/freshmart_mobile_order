import { NextRequest } from "next/server";
import { db } from "@/db";
import { orders, orderItems, orderItemModifiers, items, modifierOptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, err, handleRouteError } from "@/lib/api-response";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) return err("Invalid order id");

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return err("Order not found", 404);

    const ois = await db
      .select({
        id: orderItems.id,
        itemId: orderItems.itemId,
        itemName: items.name,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        lineTotal: orderItems.lineTotal,
      })
      .from(orderItems)
      .innerJoin(items, eq(orderItems.itemId, items.id))
      .where(eq(orderItems.orderId, orderId));

    const oims = await db
      .select({
        orderItemId: orderItemModifiers.orderItemId,
        optionName: modifierOptions.name,
        priceDelta: orderItemModifiers.priceDelta,
      })
      .from(orderItemModifiers)
      .innerJoin(modifierOptions, eq(orderItemModifiers.modifierOptionId, modifierOptions.id));

    return ok({ ...order, lines: ois, modifiers: oims });
  } catch (e) {
    return handleRouteError(e);
  }
}
