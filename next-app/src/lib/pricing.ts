import { db } from '@/db';
import {
  promotions,
  promotionItems,
  settings,
  modifierOptions,
} from '@/db/schema';
import { and, eq, lte, gte, or, inArray } from 'drizzle-orm';

export interface CartLineInput {
  itemId: number;
  quantity: number;
  unitPrice: number; // cents
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
  lineDiscounts: Record<number, number>;
}

// FIX #2: Single source of truth — server only. Mobile store no longer
// computes tax independently with a different (wrong) rate.
export const TAX_RATE = 0.06625; // 6.625% NJ composite

const WAIT_INCREMENT_CENTS = 2000;
const WAIT_INCREMENT_MINUTES = 10;

export async function calculatePricing(
  lines: CartLineInput[],
  promoCode?: string,
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
        lte(promotions.minOrderTotal, subtotal),
      ),
    );

  const eligiblePromos = activePromos.filter((p) => {
    if (p.promotionCode)
      return (
        promoCode && p.promotionCode.toLowerCase() === promoCode.toLowerCase()
      );
    return true;
  });

  const promoItemRows = eligiblePromos.length
    ? await db
        .select()
        .from(promotionItems)
        .where(
          or(
            ...eligiblePromos.map((p) => eq(promotionItems.promotionId, p.id)),
          ),
        )
    : [];

  const appliedPromotions: AppliedPromotion[] = [];
  const lineDiscounts: Record<number, number> = {};
  let discountTotal = 0;

  for (const promo of eligiblePromos) {
    if (promo.type === 'percent') {
      const disc = Math.round(subtotal * (promo.value / 100));
      discountTotal += disc;
      appliedPromotions.push({
        id: promo.id,
        name: promo.name,
        discountCents: disc,
      });
    } else if (promo.type === 'fixed') {
      const disc = Math.min(promo.value, subtotal);
      discountTotal += disc;
      appliedPromotions.push({
        id: promo.id,
        name: promo.name,
        discountCents: disc,
      });
    } else if (promo.type === 'item') {
      const itemIds = promoItemRows
        .filter((r) => r.promotionId === promo.id)
        .map((r) => r.itemId);
      let itemDisc = 0;
      for (const line of lines) {
        if (itemIds.includes(line.itemId)) {
          const d =
            Math.round(line.unitPrice * (promo.value / 100)) * line.quantity;
          itemDisc += d;
          lineDiscounts[line.itemId] = (lineDiscounts[line.itemId] ?? 0) + d;
        }
      }
      discountTotal += itemDisc;
      appliedPromotions.push({
        id: promo.id,
        name: promo.name,
        discountCents: itemDisc,
      });
    } else if (promo.type === 'buy_x_get_y') {
      // FIX #3: Implemented — was silently ignored before.
      const triggerIds = new Set(promo.triggerItemIds ?? []);
      const rewardIds = new Set(promo.rewardItemIds ?? []);

      const triggerQty = lines
        .filter((l) => triggerIds.has(l.itemId))
        .reduce((s, l) => s + l.quantity, 0);
      const sets = Math.floor(triggerQty / (promo.triggerQty || 1));

      if (sets > 0) {
        const rewardLines = lines
          .filter((l) => rewardIds.has(l.itemId))
          .sort((a, b) => a.unitPrice - b.unitPrice); // discount cheapest first

        let remaining = promo.rewardQty * sets;
        let totalDisc = 0;

        for (const line of rewardLines) {
          if (remaining <= 0) break;
          const discQty = Math.min(line.quantity, remaining);
          const lineD =
            Math.round(line.unitPrice * (promo.value / 100)) * discQty;
          totalDisc += lineD;
          lineDiscounts[line.itemId] =
            (lineDiscounts[line.itemId] ?? 0) + lineD;
          remaining -= discQty;
        }

        discountTotal += totalDisc;
        appliedPromotions.push({
          id: promo.id,
          name: promo.name,
          discountCents: totalDisc,
        });
      }
    } else if (promo.type === 'bundle') {
      // FIX #3: Implemented — was silently ignored before.
      const bundleIds = promoItemRows
        .filter((r) => r.promotionId === promo.id)
        .map((r) => r.itemId);

      const allPresent =
        bundleIds.length > 0 &&
        bundleIds.every((id) =>
          lines.some((l) => l.itemId === id && l.quantity > 0),
        );

      if (allPresent) {
        let bundleDisc = 0;
        for (const line of lines) {
          if (bundleIds.includes(line.itemId)) {
            const d =
              Math.round(line.unitPrice * (promo.value / 100)) * line.quantity;
            bundleDisc += d;
            lineDiscounts[line.itemId] = (lineDiscounts[line.itemId] ?? 0) + d;
          }
        }
        discountTotal += bundleDisc;
        appliedPromotions.push({
          id: promo.id,
          name: promo.name,
          discountCents: bundleDisc,
        });
      }
    }
  }

  const taxableAmount = Math.max(0, subtotal - discountTotal);
  const taxTotal = Math.round(taxableAmount * TAX_RATE);
  const total = taxableAmount + taxTotal;

  return {
    subtotal,
    discountTotal,
    taxTotal,
    total,
    appliedPromotions,
    lineDiscounts,
  };
}

export async function calculateEstimatedReadyAt(
  totalCents: number,
): Promise<Date> {
  const [setting] = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'DEFAULT_PREP_TIME_MINUTES'))
    .limit(1);

  const defaultMinutes = setting ? parseInt(setting.value, 10) : 30;
  const extraIncrements = Math.floor(totalCents / WAIT_INCREMENT_CENTS);
  const totalMinutes =
    defaultMinutes + extraIncrements * WAIT_INCREMENT_MINUTES;

  const readyAt = new Date();
  readyAt.setMinutes(readyAt.getMinutes() + totalMinutes);
  return readyAt;
}

// FIX Dead Logic #3: Converted from dynamic import() to static imports at top of file.
export async function resolveUnitPrice(
  basePrice: number,
  modifierOptionIds: number[],
): Promise<number> {
  if (modifierOptionIds.length === 0) return basePrice;
  const opts = await db
    .select({ priceDelta: modifierOptions.priceDelta })
    .from(modifierOptions)
    .where(inArray(modifierOptions.id, modifierOptionIds));
  return basePrice + opts.reduce((sum, o) => sum + o.priceDelta, 0);
}
