import { NextRequest } from "next/server";
import { db } from "@/db";
import { orders, orderItems, orderItemModifiers, items, modifierOptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { ok, err, handleRouteError } from "@/lib/api-response";
import net from "net";

const PRINTER_HOST = process.env.PRINTER_HOST ?? "192.168.1.100";
const PRINTER_PORT = parseInt(process.env.PRINTER_PORT ?? "9100", 10);

function buildReceipt(order: Record<string, unknown>, lines: Array<Record<string, unknown>>): Buffer {
  // ESC/POS commands
  const ESC = 0x1b;
  const LF = 0x0a;
  const INIT = Buffer.from([ESC, 0x40]);
  const BOLD_ON = Buffer.from([ESC, 0x45, 0x01]);
  const BOLD_OFF = Buffer.from([ESC, 0x45, 0x00]);
  const CUT = Buffer.from([0x1d, 0x56, 0x42, 0x00]);

  const text = (s: string) => Buffer.from(s + "\n", "utf8");

  return Buffer.concat([
    INIT,
    BOLD_ON,
    text(`ORDER #${order.id}`),
    BOLD_OFF,
    text(`Customer: ${order.customerName}`),
    text(`Phone: ${order.customerPhone}`),
    text(`Status: ${order.status}`),
    text(`Ready At: ${new Date(order.estimatedReadyAt as string).toLocaleTimeString()}`),
    text("--------------------------------"),
    ...lines.flatMap((l) => [
      text(`${l.quantity}x ${l.itemName}  $${((l.lineTotal as number) / 100).toFixed(2)}`),
      ...((l.modifiers as string[]) ?? []).map((m) => text(`   + ${m}`)),
    ]),
    text("--------------------------------"),
    text(`Subtotal: $${((order.subtotal as number) / 100).toFixed(2)}`),
    text(`Discount: -$${((order.discountTotal as number) / 100).toFixed(2)}`),
    text(`Tax:      $${((order.taxTotal as number) / 100).toFixed(2)}`),
    text(`TOTAL:    $${((order.total as number) / 100).toFixed(2)}`),
    text(""),
    text("Thank you!"),
    CUT,
  ]);
}

async function sendToPrinter(data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error("Printer connection timeout"));
    }, 5000);

    client.connect(PRINTER_PORT, PRINTER_HOST, () => {
      client.write(data, () => {
        clearTimeout(timeout);
        client.destroy();
        resolve();
      });
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("kitchen");
    const { id } = await params;
    const orderId = parseInt(id, 10);

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return err("Order not found", 404);

    const ois = await db
      .select({
        id: orderItems.id,
        itemName: items.name,
        quantity: orderItems.quantity,
        lineTotal: orderItems.lineTotal,
      })
      .from(orderItems)
      .innerJoin(items, eq(orderItems.itemId, items.id))
      .where(eq(orderItems.orderId, orderId));

    const modRows = await db
      .select({ orderItemId: orderItemModifiers.orderItemId, optionName: modifierOptions.name })
      .from(orderItemModifiers)
      .innerJoin(modifierOptions, eq(orderItemModifiers.modifierOptionId, modifierOptions.id));

    const lines = ois.map((oi) => ({
      ...oi,
      modifiers: modRows.filter((m) => m.orderItemId === oi.id).map((m) => m.optionName),
    }));

    const receipt = buildReceipt(order as unknown as Record<string, unknown>, lines as unknown as Array<Record<string, unknown>>);
    await sendToPrinter(receipt);

    return ok({ printed: true });
  } catch (e) { return handleRouteError(e); }
}
