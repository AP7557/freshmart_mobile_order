import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const orderId = pi.metadata?.orderId ? parseInt(pi.metadata.orderId, 10) : null;
    if (orderId) {
      await db
        .update(orders)
        .set({ status: "paid", updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object;
    const orderId = pi.metadata?.orderId ? parseInt(pi.metadata.orderId, 10) : null;
    if (orderId) {
      await db
        .update(orders)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    }
  }

  return NextResponse.json({ received: true });
}
