import { db } from "@/db";
import { promotions, promotionItems, settings } from "@/db/schema";
import { and, eq, lte, gte, isNull, or } from "drizzle-orm";

export interface CartLineInput {
  itemId: number;
  quantity: number;
  unitPrice: number; // base + modifier deltas, in cents
  modifierOptionIds: number[];
}

export interface AppliedPromotion {
  id: number;
  name: string;
  discountCents: number;
}

export interface PricingResult {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  appliedPromotions: AppliedPromotion[];
  lineDiscounts: Record<number, number>; // itemId -> discount cents per item*qty
}

const TAX_RATE = 0.08875; // NYC rate — configure as env var if needed
const WAIT_INCREMENT_CENTS = 2000; // +5 min per $20 of order total
const WAIT_INCREMENT_MINUTES = 5;

export async function calculatePricing(
  lines: CartLineInput[],
  promoCode?: string
): Promise<PricingResult> {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const now = new Date();

  const activePromos = await db
    .select()
    .from(promotions)
    .where(
      and(
        eq(promotions.isActive, true),
        lte(promotions.startAt, now),
        gte(promotions.endAt, now),
        lte(promotions.minOrderTotal, subtotal)
      )
    );

  const eligiblePromos = activePromos.filter((p) => {
    if (p.promotionCode) {
      return promoCode && p.promotionCode.toLowerCase() === promoCode.toLowerCase();
    }
    return true;
  });

  const promoItemRows = eligiblePromos.length
    ? await db
        .select()
        .from(promotionItems)
        .where(
          or(
            ...eligiblePromos.map((p) => eq(promotionItems.promotionId, p.id))
          )
        )
    : [];

  const appliedPromotions: AppliedPromotion[] = [];
  const lineDiscounts: Record<number, number> = {};
  let discountTotal = 0;

  for (const promo of eligiblePromos) {
    if (promo.type === "percent") {
      const disc = Math.round(subtotal * (promo.value / 100));
      discountTotal += disc;
      appliedPromotions.push({ id: promo.id, name: promo.name, discountCents: disc });
    } else if (promo.type === "fixed") {
      const disc = Math.min(promo.value, subtotal);
      discountTotal += disc;
      appliedPromotions.push({ id: promo.id, name: promo.name, discountCents: disc });
    } else if (promo.type === "item") {
      const itemIds = promoItemRows
        .filter((r) => r.promotionId === promo.id)
        .map((r) => r.itemId);
      let itemDisc = 0;
      for (const line of lines) {
        if (itemIds.includes(line.itemId)) {
          const d = Math.round(line.unitPrice * (promo.value / 100)) * line.quantity;
          itemDisc += d;
          lineDiscounts[line.itemId] = (lineDiscounts[line.itemId] ?? 0) + d;
        }
      }
      discountTotal += itemDisc;
      appliedPromotions.push({ id: promo.id, name: promo.name, discountCents: itemDisc });
    }
  }

  const taxableAmount = Math.max(0, subtotal - discountTotal);
  const taxTotal = Math.round(taxableAmount * TAX_RATE);
  const total = taxableAmount + taxTotal;

  return { subtotal, discountTotal, taxTotal, total, appliedPromotions, lineDiscounts };
}

export async function calculateEstimatedReadyAt(totalCents: number): Promise<Date> {
  const [setting] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, "DEFAULT_PREP_TIME_MINUTES"))
    .limit(1);

  const defaultMinutes = setting ? parseInt(setting.value, 10) : 30;
  const extraIncrements = Math.floor(totalCents / WAIT_INCREMENT_CENTS);
  const totalMinutes = defaultMinutes + extraIncrements * WAIT_INCREMENT_MINUTES;

  const readyAt = new Date();
  readyAt.setMinutes(readyAt.getMinutes() + totalMinutes);
  return readyAt;
}

export async function resolveUnitPrice(
  basePrice: number,
  modifierOptionIds: number[]
): Promise<number> {
  if (modifierOptionIds.length === 0) return basePrice;
  const { modifierOptions } = await import("@/db/schema");
  const { inArray } = await import("drizzle-orm");
  const opts = await db
    .select({ priceDelta: modifierOptions.priceDelta })
    .from(modifierOptions)
    .where(inArray(modifierOptions.id, modifierOptionIds));
  const delta = opts.reduce((sum, o) => sum + o.priceDelta, 0);
  return basePrice + delta;
}
